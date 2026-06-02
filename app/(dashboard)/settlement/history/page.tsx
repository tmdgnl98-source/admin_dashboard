'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, Receipt, Mail, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KpiCard } from '@/components/ui/summary-card'
import { StatusBadge } from '@/components/ui/status-badge'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type Tab = 'monthly' | 'invoice'

interface ChargingRecord {
  충전소ID: string
  충전시작일시: string
  매출인식금액: string
  정산그룹명?: string
}

interface GroupRow {
  정산그룹: string
  충전소ID: string
  매출분배율: string
  위탁운영수수료: string
  부지사용료: string
  정산단가: string
  정산주기: string
}

interface SettlementRow {
  group: string
  period: string
  revenue: number
  rate: number
  settlement: number
  fee: number
}

// ─── 계산 헬퍼 ───────────────────────────────────────────────────────────────

function parseNum(s: string | number | undefined): number {
  if (s === undefined || s === null || s === '') return 0
  const n = parseFloat(String(s).replace(/[,%원]/g, '').trim())
  return isNaN(n) ? 0 : n
}

function parseDateKST(s: string | undefined): { year: number; month: number } | null {
  if (!s) return null
  const d = new Date(String(s).trim())
  if (isNaN(d.getTime())) return null
  // UTC → KST (+9h) 변환 후 연/월 추출
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1 }
}

function toRateMultiplier(raw: number): number {
  // 0.14 (소수) 또는 14 (퍼센트) 모두 동일하게 처리
  return raw < 1 ? raw : raw / 100
}

function calcSettlement(
  charging: ChargingRecord[],
  groups: GroupRow[],
  year: number,
  month: number,
): SettlementRow[] {
  // 그룹명 → 정산 설정 행 매핑 (충전이력의 정산그룹명 필드 활용)
  const groupMap = new Map<string, GroupRow>()
  for (const row of groups) {
    const gName = String(row.정산그룹 ?? '').trim()
    if (gName && !groupMap.has(gName)) groupMap.set(gName, row)
  }

  // KST 기준 해당 연월 충전 이력 필터링
  const periodRecords = charging.filter(r => {
    const kst = parseDateKST(r.충전시작일시)
    return kst !== null && kst.year === year && kst.month === month
  })

  // 정산그룹명별 매출 집계 (충전이력의 정산그룹명 컬럼 직접 사용)
  const agg = new Map<string, { revenue: number; row: GroupRow }>()
  for (const rec of periodRecords) {
    const gName = String(rec.정산그룹명 ?? '').trim()
    if (!gName) continue
    const row = groupMap.get(gName)
    if (!row) continue
    const amount = parseNum(rec.매출인식금액)
    const existing = agg.get(gName)
    if (existing) {
      existing.revenue += amount
    } else {
      agg.set(gName, { revenue: amount, row })
    }
  }

  return Array.from(agg.entries()).map(([name, { revenue, row }]) => {
    const rawRate = parseNum(row.매출분배율)
    const multiplier = toRateMultiplier(rawRate)
    const fee = parseNum(row.위탁운영수수료)
    return {
      group: name,
      period: `${year}년 ${month}월`,
      revenue,
      rate: Math.round(multiplier * 100),  // 표시용 퍼센트
      settlement: Math.round(revenue * multiplier),
      fee,
    }
  })
}

function getPrev6Months(year: number, month: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i
    let m = month - offset
    let y = year
    while (m <= 0) { m += 12; y-- }
    return { year: y, month: m, label: `${m}월` }
  })
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const YEARS = ['2026', '2025', '2024']
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const CYCLE_OPTIONS = ['월', '분기', '반기', '년']

// ─── 페이지 ──────────────────────────────────────────────────────────────────

export default function SettlementHistoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('monthly')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedMonth, setSelectedMonth] = useState('5')
  const [invoiceCycle, setInvoiceCycle] = useState('월')
  const [invoiceDate, setInvoiceDate] = useState('매월 25일')

  const [chargingData, setChargingData] = useState<ChargingRecord[]>([])
  const [groupRows, setGroupRows] = useState<GroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/charging-history').then(r => {
        if (!r.ok) throw new Error(`충전이력 오류 (${r.status})`)
        return r.json()
      }),
      fetch('/api/settlement-groups').then(r => {
        if (!r.ok) throw new Error(`정산그룹 오류 (${r.status})`)
        return r.json()
      }),
    ])
      .then(([charging, groups]) => {
        setChargingData(charging.data ?? [])
        setGroupRows(groups.data ?? [])
      })
      .catch(err => setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [])

  const year = parseInt(selectedYear)
  const month = parseInt(selectedMonth)

  const settlementRows = useMemo(
    () => calcSettlement(chargingData, groupRows, year, month),
    [chargingData, groupRows, year, month],
  )

  const totalRevenue = settlementRows.reduce((s, r) => s + r.revenue, 0)
  const totalSettlement = settlementRows.reduce((s, r) => s + r.settlement, 0)
  const totalFee = settlementRows.reduce((s, r) => s + r.fee, 0)

  const chartData = useMemo(() => {
    return getPrev6Months(year, month).map(({ year: y, month: m, label }) => {
      const rows = calcSettlement(chargingData, groupRows, y, m)
      return { month: label, amount: rows.reduce((s, r) => s + r.settlement, 0) }
    })
  }, [chargingData, groupRows, year, month])

  // 고지서 탭용: 실제 그룹명 기반 더미 발급 이력
  const invoiceRecords = useMemo(() => {
    const groupNames = [...new Set(groupRows.map(r => String(r.정산그룹 ?? '').trim()).filter(Boolean))]
    if (groupNames.length === 0) return []
    return [
      { date: '2026-04-25', period: '2026년 4월', target: groupNames[0], email: 'partner@example.com', status: '발송완료' },
      { date: '2026-03-25', period: '2026년 3월', target: groupNames[0], email: 'partner@example.com', status: '발송완료' },
      { date: '2026-02-25', period: '2026년 2월', target: groupNames[0], email: 'partner@example.com', status: '발송실패' },
    ]
  }, [groupRows])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="정산 이력" />

      <div className="flex flex-1 flex-col overflow-y-auto p-6 gap-4">
        {/* 탭 */}
        <div className="flex gap-1 border-b">
          {([['monthly', '월별 통계'], ['invoice', '고지서 발급']] as [Tab, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {/* 로딩 / 에러 */}
        {loading && (
          <div className="flex flex-1 items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            데이터를 불러오는 중...
          </div>
        )}
        {error && (
          <div className="flex flex-1 items-center justify-center gap-2 py-20 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* 탭1: 월별 통계 */}
        {!loading && !error && activeTab === 'monthly' && (
          <div className="space-y-4">
            {/* 필터 */}
            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
              </select>
            </div>

            {settlementRows.length === 0 ? (
              <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
                {selectedYear}년 {selectedMonth}월 정산 데이터가 없습니다.
              </div>
            ) : (
              <>
                {/* KPI 카드 */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <KpiCard
                    icon={TrendingUp}
                    title="총 매출"
                    value={totalRevenue.toLocaleString()}
                    unit="원"
                    tone="info"
                  />
                  <KpiCard
                    icon={DollarSign}
                    title="총 정산금액"
                    value={totalSettlement.toLocaleString()}
                    unit="원"
                    tone="success"
                  />
                  <KpiCard
                    icon={Receipt}
                    title="위탁수수료 합계"
                    value={totalFee.toLocaleString()}
                    unit="원"
                    tone="neutral"
                  />
                </div>

                {/* 최근 6개월 차트 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">최근 6개월 정산금액 추이</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: number) =>
                            v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v.toLocaleString()
                          }
                        />
                        <Tooltip
                          formatter={(value) => [`${Number(value ?? 0).toLocaleString()}원`, '정산금액']}
                        />
                        <Bar dataKey="amount" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 정산 내역 테이블 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      {selectedYear}년 {selectedMonth}월 정산 내역
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>정산그룹</TableHead>
                          <TableHead>정산기간</TableHead>
                          <TableHead className="text-right">매출</TableHead>
                          <TableHead className="text-right">분배율</TableHead>
                          <TableHead className="text-right">정산금액</TableHead>
                          <TableHead className="text-right">위탁수수료</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlementRows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.group}</TableCell>
                            <TableCell className="text-muted-foreground">{row.period}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.revenue.toLocaleString()}원
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.rate}%
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-success">
                              {row.settlement.toLocaleString()}원
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {row.fee.toLocaleString()}원
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* 합계 행 */}
                        <TableRow className="border-t-2 bg-muted/30 font-semibold">
                          <TableCell colSpan={2} className="text-sm">합계</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {totalRevenue.toLocaleString()}원
                          </TableCell>
                          <TableCell />
                          <TableCell className="text-right tabular-nums text-success">
                            {totalSettlement.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {totalFee.toLocaleString()}원
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* 탭2: 고지서 발급 */}
        {!loading && !error && activeTab === 'invoice' && (
          <div className="space-y-4">
            {/* 고지서 설정 */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">고지서 발급 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">생성주기</label>
                    <select
                      value={invoiceCycle}
                      onChange={(e) => setInvoiceCycle(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    >
                      {CYCLE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">생성일자</label>
                    <input
                      type="text"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      placeholder="예: 매월 25일"
                      className="w-36 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                  </div>
                  <Button className="gap-2">
                    <Mail className="h-4 w-4" />
                    이메일 발송
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 정산그룹별 정산금액 요약 */}
            {settlementRows.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    {selectedYear}년 {selectedMonth}월 고지서 발급 대상
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>정산그룹</TableHead>
                        <TableHead className="text-right">매출</TableHead>
                        <TableHead className="text-right">분배율</TableHead>
                        <TableHead className="text-right">정산금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlementRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.group}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.revenue.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.rate}%</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-success">
                            {row.settlement.toLocaleString()}원
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* 발급 이력 테이블 */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">고지서 발급 이력</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {invoiceRecords.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">발급 이력이 없습니다.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>발급일</TableHead>
                        <TableHead>정산기간</TableHead>
                        <TableHead>대상 그룹</TableHead>
                        <TableHead>발송 이메일</TableHead>
                        <TableHead className="text-center">발송 상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceRecords.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{row.date}</TableCell>
                          <TableCell>{row.period}</TableCell>
                          <TableCell className="font-medium">{row.target}</TableCell>
                          <TableCell className="text-muted-foreground">{row.email}</TableCell>
                          <TableCell className="text-center">
                            <StatusBadge status={row.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

