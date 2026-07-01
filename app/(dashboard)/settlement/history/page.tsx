'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  TrendingUp, DollarSign, Receipt, Mail, Loader2, AlertCircle, X, Printer, FileText, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── 타입 ────────────────────────────────────────────────────────────────────

type Tab = 'monthly' | 'invoice'

interface ChargingRecord {
  충전소ID?: string | number
  충전시작일시?: string
  매출인식금액?: string | number
  충전량?: string | number
  정산그룹명?: string
}

interface GroupRow {
  정산그룹: string
  충전소ID: string | number
  매출분배율: string | number
  위탁운영수수료: string | number
  부지사용료: string | number
  정산단가: string | number
  정산주기: string
}

type MatchedBy = 'stationId' | 'groupName' | 'unmatched'

interface SettlementRow {
  group: string
  period: string
  cycle: string
  revenue: number
  kwh: number
  rate: number
  unitPrice: number
  revenueShare: number
  unitSettlement: number
  settlement: number
  landFee: number
  fee: number
  matchedBy: MatchedBy
}

type RangeMode = '1m' | '3m' | '6m' | '12m' | 'custom'
interface MonthKey { year: number; month: number }

interface InvoiceRecord {
  id: string
  issuedAt: string         // 'YYYY-MM-DD'
  period: string           // 'YYYY년 M월'
  periodKey: MonthKey
  target: string           // 정산그룹명
  email: string
  status: '발송완료' | '발송실패' | '미발송'
  // 정산 스냅샷
  revenue: number
  kwh: number
  rate: number
  revenueShare: number
  landFee: number
  fee: number
  settlement: number
  cycle: string
}

// ─── 계산 헬퍼 ───────────────────────────────────────────────────────────────

function parseNum(s: string | number | undefined | null): number {
  if (s === undefined || s === null || s === '') return 0
  const n = parseFloat(String(s).replace(/[,%원]/g, '').trim())
  return isNaN(n) ? 0 : n
}

function parseDateKST(s: string | undefined): { year: number; month: number } | null {
  if (!s) return null
  const d = new Date(String(s).trim())
  if (isNaN(d.getTime())) return null
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1 }
}

function toRateMultiplier(raw: number): number {
  return raw < 1 ? raw : raw / 100
}

function normalizeGroupName(s: string | number | undefined | null): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/\s+/g, '')
    .replace(/㈜/g, '(주)')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .toLowerCase()
}

function isCycleEndMonth(cycle: string, month: number): boolean {
  const c = String(cycle ?? '').trim()
  if (c.includes('분기')) return month % 3 === 0
  if (c.includes('반기')) return month === 6 || month === 12
  if (c.includes('년') || c.includes('연')) return month === 12
  return true
}

function calcSettlement(
  charging: ChargingRecord[],
  groups: GroupRow[],
  year: number,
  month: number,
): SettlementRow[] {
  const groupByStationId = new Map<string, GroupRow>()
  const groupByNormName = new Map<string, GroupRow>()
  for (const row of groups) {
    const sid = String(row.충전소ID ?? '').trim()
    if (sid && !groupByStationId.has(sid)) groupByStationId.set(sid, row)
    const norm = normalizeGroupName(row.정산그룹)
    if (norm && !groupByNormName.has(norm)) groupByNormName.set(norm, row)
  }

  const buckets = new Map<
    string,
    { revenue: number; kwh: number; row: GroupRow | null; displayName: string; matchedBy: MatchedBy }
  >()

  for (const rec of charging) {
    const kst = parseDateKST(rec.충전시작일시)
    if (!kst || kst.year !== year || kst.month !== month) continue

    const sid = String(rec.충전소ID ?? '').trim()
    const matchByStation = sid ? groupByStationId.get(sid) : undefined
    let row: GroupRow | null = matchByStation ?? null
    let matchedBy: MatchedBy = 'unmatched'
    if (matchByStation) {
      matchedBy = 'stationId'
    } else {
      const norm = normalizeGroupName(rec.정산그룹명)
      const matchByName = norm ? groupByNormName.get(norm) : undefined
      if (matchByName) {
        row = matchByName
        matchedBy = 'groupName'
      }
    }

    const key = row ? String(row.정산그룹).trim() : '__unmatched__'
    const displayName = row ? String(row.정산그룹).trim() : '미배정'
    const amount = parseNum(rec.매출인식금액)
    const kwh = parseNum(rec.충전량)

    const existing = buckets.get(key)
    if (existing) {
      existing.revenue += amount
      existing.kwh += kwh
    } else {
      buckets.set(key, { revenue: amount, kwh, row, displayName, matchedBy })
    }
  }

  const period = `${year}년 ${month}월`

  return Array.from(buckets.values())
    .map<SettlementRow>(({ revenue, kwh, row, displayName, matchedBy }) => {
      const rawRate = parseNum(row?.매출분배율)
      const multiplier = toRateMultiplier(rawRate)
      const unitPrice = parseNum(row?.정산단가)
      const landFee = parseNum(row?.부지사용료)
      const fee = parseNum(row?.위탁운영수수료)
      const cycle = String(row?.정산주기 ?? '').trim()
      const revenueShare = Math.round(revenue * multiplier)
      const unitSettlement = Math.round(kwh * unitPrice)
      const settlement = revenueShare - landFee - fee
      return {
        group: displayName,
        period,
        cycle,
        revenue,
        kwh,
        rate: Math.round(multiplier * 1000) / 10,
        unitPrice,
        revenueShare,
        unitSettlement,
        settlement,
        landFee,
        fee,
        matchedBy,
      }
    })
    .sort((a, b) => {
      if (a.matchedBy === 'unmatched' && b.matchedBy !== 'unmatched') return 1
      if (b.matchedBy === 'unmatched' && a.matchedBy !== 'unmatched') return -1
      return b.revenue - a.revenue
    })
}

// 직전 월(완료된 마지막 월) 계산 — KST 기준
function getEndMonth(): MonthKey {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  let year = kst.getUTCFullYear()
  let month = kst.getUTCMonth() + 1 - 1
  if (month <= 0) { month += 12; year -= 1 }
  return { year, month }
}

function rangeToMonths(
  mode: RangeMode,
  customStart?: MonthKey,
  customEnd?: MonthKey,
): MonthKey[] {
  if (mode === 'custom' && customStart && customEnd) {
    return monthsBetween(customStart, customEnd)
  }
  const end = getEndMonth()
  const count = mode === '1m' ? 1 : mode === '3m' ? 3 : mode === '6m' ? 6 : 12
  return monthsBetween(
    addMonths(end, -(count - 1)),
    end,
  )
}

function addMonths(k: MonthKey, delta: number): MonthKey {
  let y = k.year
  let m = k.month + delta
  while (m <= 0) { m += 12; y -= 1 }
  while (m > 12) { m -= 12; y += 1 }
  return { year: y, month: m }
}

function monthsBetween(start: MonthKey, end: MonthKey): MonthKey[] {
  const result: MonthKey[] = []
  let y = start.year, m = start.month
  while (y < end.year || (y === end.year && m <= end.month)) {
    result.push({ year: y, month: m })
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return result
}

function monthKey(k: MonthKey): string {
  return `${k.year}-${String(k.month).padStart(2, '0')}`
}

function shortMonthLabel(k: MonthKey): string {
  return `${String(k.year).slice(-2)}.${k.month}월`
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const RANGE_OPTIONS: { value: RangeMode; label: string }[] = [
  { value: '1m', label: '1달' },
  { value: '3m', label: '분기 (3달)' },
  { value: '6m', label: '반기 (6달)' },
  { value: '12m', label: '1년' },
  { value: 'custom', label: '직접 설정' },
]

const YEARS = ['2026', '2025', '2024']
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const invoiceStatusColor: Record<string, string> = {
  발송완료: 'bg-green-100 text-green-800',
  발송실패: 'bg-red-100 text-red-800',
  미발송: 'bg-gray-100 text-gray-700',
}

// ─── 페이지 ──────────────────────────────────────────────────────────────────

export default function SettlementHistoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('monthly')

  // 기간 필터
  const [rangeMode, setRangeMode] = useState<RangeMode>('12m')
  const defaultEnd = useMemo(() => getEndMonth(), [])
  const [customStart, setCustomStart] = useState<MonthKey>(addMonths(defaultEnd, -11))
  const [customEnd, setCustomEnd] = useState<MonthKey>(defaultEnd)

  // 고지서 자동 설정
  const [autoCycle, setAutoCycle] = useState('월')
  const [autoDate, setAutoDate] = useState('매월 25일')

  // 고지서 직접 발급
  const [invoiceMonth, setInvoiceMonth] = useState<MonthKey>(defaultEnd)
  const [invoiceGroupName, setInvoiceGroupName] = useState<string>('')

  const [chargingData, setChargingData] = useState<ChargingRecord[]>([])
  const [groupRows, setGroupRows] = useState<GroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceRecord[]>([])
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRecord | null>(null)

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

  // 선택 기간 월 목록
  const months = useMemo(
    () => rangeToMonths(rangeMode, customStart, customEnd),
    [rangeMode, customStart, customEnd],
  )

  // 월별 정산 데이터
  const monthlyData = useMemo(() => {
    return months.map((m) => ({
      key: monthKey(m),
      year: m.year,
      month: m.month,
      rows: calcSettlement(chargingData, groupRows, m.year, m.month),
    }))
  }, [months, chargingData, groupRows])

  // 피벗 — 그룹 목록 / 셀 맵
  const allGroups = useMemo(() => {
    const seen = new Map<string, { cycle: string; matchedBy: MatchedBy }>()
    for (const md of monthlyData) {
      for (const r of md.rows) {
        const existing = seen.get(r.group)
        if (!existing) {
          seen.set(r.group, { cycle: r.cycle, matchedBy: r.matchedBy })
        } else if (existing.matchedBy === 'unmatched' && r.matchedBy !== 'unmatched') {
          seen.set(r.group, { cycle: r.cycle, matchedBy: r.matchedBy })
        }
      }
    }
    return Array.from(seen.entries())
      .map(([group, meta]) => ({ group, ...meta }))
      .sort((a, b) => {
        if (a.matchedBy === 'unmatched' && b.matchedBy !== 'unmatched') return 1
        if (b.matchedBy === 'unmatched' && a.matchedBy !== 'unmatched') return -1
        return a.group.localeCompare(b.group, 'ko')
      })
  }, [monthlyData])

  const cellMap = useMemo(() => {
    const map = new Map<string, SettlementRow>()
    for (const md of monthlyData) {
      for (const r of md.rows) {
        map.set(`${r.group}|${md.key}`, r)
      }
    }
    return map
  }, [monthlyData])

  // KPI / 차트 / 합계
  const grandTotal = useMemo(() => {
    let revenue = 0, settlement = 0, fee = 0, kwh = 0
    for (const md of monthlyData) {
      for (const r of md.rows) {
        revenue += r.revenue
        settlement += r.settlement
        fee += r.fee
        kwh += r.kwh
      }
    }
    return { revenue, settlement, fee, kwh }
  }, [monthlyData])

  const chartData = useMemo(() => {
    return monthlyData.map((md) => ({
      month: shortMonthLabel({ year: md.year, month: md.month }),
      amount: md.rows.reduce((s, r) => s + r.settlement, 0),
    }))
  }, [monthlyData])

  const hasUnmatched = allGroups.some((g) => g.matchedBy === 'unmatched')

  // 기간 라벨
  const rangeLabel = months.length === 0
    ? ''
    : `${months[0].year}년 ${months[0].month}월 ~ ${months[months.length - 1].year}년 ${months[months.length - 1].month}월`

  // 고지서 발급 가능 월·그룹
  const invoiceMonthRows = useMemo(
    () => calcSettlement(chargingData, groupRows, invoiceMonth.year, invoiceMonth.month),
    [chargingData, groupRows, invoiceMonth],
  )
  const invoiceableGroups = invoiceMonthRows.filter((r) => r.matchedBy !== 'unmatched')

  function handleIssueInvoice() {
    const target = invoiceableGroups.find((r) => r.group === invoiceGroupName) ?? invoiceableGroups[0]
    if (!target) return
    const today = new Date()
    const issuedAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const rec: InvoiceRecord = {
      id: `INV-${Date.now()}`,
      issuedAt,
      period: `${invoiceMonth.year}년 ${invoiceMonth.month}월`,
      periodKey: invoiceMonth,
      target: target.group,
      email: 'partner@example.com',
      status: '미발송',
      revenue: target.revenue,
      kwh: target.kwh,
      rate: target.rate,
      revenueShare: target.revenueShare,
      landFee: target.landFee,
      fee: target.fee,
      settlement: target.settlement,
      cycle: target.cycle,
    }
    setPreviewInvoice(rec)
  }

  function handleSendInvoice() {
    if (!previewInvoice) return
    const sent: InvoiceRecord = { ...previewInvoice, status: '발송완료' }
    setInvoiceHistory((prev) => {
      const existingIdx = prev.findIndex((p) => p.id === sent.id)
      if (existingIdx >= 0) {
        const next = prev.slice()
        next[existingIdx] = sent
        return next
      }
      return [sent, ...prev]
    })
    setPreviewInvoice(sent)
  }

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

        {/* ── 탭1: 월별 통계 ───────────────────────────────────────────── */}
        {!loading && !error && activeTab === 'monthly' && (
          <div className="space-y-4">
            {/* 기간 필터 */}
            <Card className="shadow-sm">
              <CardContent className="flex flex-wrap items-end gap-3 py-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">조회 기간</label>
                  <select
                    value={rangeMode}
                    onChange={(e) => setRangeMode(e.target.value as RangeMode)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  >
                    {RANGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {rangeMode === 'custom' && (
                  <>
                    <MonthSelect
                      label="시작"
                      value={customStart}
                      onChange={(v) => setCustomStart(v)}
                    />
                    <span className="self-center text-muted-foreground">~</span>
                    <MonthSelect
                      label="종료"
                      value={customEnd}
                      onChange={(v) => setCustomEnd(v)}
                    />
                  </>
                )}

                <p className="ml-auto self-center text-xs text-muted-foreground">
                  {rangeLabel}
                </p>
              </CardContent>
            </Card>

            {months.length === 0 || grandTotal.revenue === 0 ? (
              <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
                {rangeLabel || '선택한 기간'} 정산 데이터가 없습니다.
              </div>
            ) : (
              <>
                {/* KPI 카드 */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <KpiCard
                    icon={TrendingUp}
                    label="총 매출"
                    value={grandTotal.revenue.toLocaleString()}
                    unit="원"
                    color="text-blue-600"
                    bg="bg-blue-50"
                  />
                  <KpiCard
                    icon={DollarSign}
                    label="총 정산금액(순)"
                    value={grandTotal.settlement.toLocaleString()}
                    unit="원"
                    color="text-green-600"
                    bg="bg-green-50"
                  />
                  <KpiCard
                    icon={Receipt}
                    label="위탁수수료 합계"
                    value={grandTotal.fee.toLocaleString()}
                    unit="원"
                    color="text-purple-600"
                    bg="bg-purple-50"
                  />
                </div>

                {/* 차트 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      월별 정산금액(순) 추이 — {rangeLabel}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} barSize={Math.max(16, Math.min(48, 360 / Math.max(1, chartData.length)))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: number) =>
                            v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v.toLocaleString()
                          }
                        />
                        <Tooltip
                          formatter={(value) => [`${Number(value ?? 0).toLocaleString()}원`, '정산금액(순)']}
                        />
                        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 피벗 테이블 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      정산그룹 × 월 정산 내역
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      정산금액(순) = 매출×분배율 − 부지사용료 − 위탁수수료
                    </span>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 z-10 min-w-[140px] bg-card">
                              정산그룹
                            </TableHead>
                            <TableHead className="min-w-[60px]">주기</TableHead>
                            {monthlyData.map((md) => (
                              <TableHead
                                key={md.key}
                                className="min-w-[92px] text-right whitespace-nowrap"
                              >
                                {shortMonthLabel({ year: md.year, month: md.month })}
                              </TableHead>
                            ))}
                            <TableHead className="min-w-[110px] bg-muted/30 text-right font-semibold">
                              기간 합계
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allGroups.map(({ group, cycle, matchedBy }) => {
                            const unmatched = matchedBy === 'unmatched'
                            let rowTotal = 0
                            return (
                              <TableRow
                                key={group}
                                className={cn(unmatched && 'bg-muted/30 text-muted-foreground')}
                              >
                                <TableCell className="sticky left-0 z-10 bg-card font-medium">
                                  {group}
                                  {unmatched && (
                                    <span className="ml-1 text-[10px] text-muted-foreground/80">
                                      (매칭 실패)
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {cycle || '−'}
                                </TableCell>
                                {monthlyData.map((md) => {
                                  const cell = cellMap.get(`${group}|${md.key}`)
                                  const value = cell?.settlement ?? 0
                                  rowTotal += value
                                  const cycleEnd = !unmatched && isCycleEndMonth(cycle, md.month)
                                  return (
                                    <TableCell
                                      key={md.key}
                                      className={cn(
                                        'text-right tabular-nums whitespace-nowrap',
                                        value === 0 && 'text-muted-foreground/40',
                                        value < 0 && 'text-destructive',
                                        !unmatched && cycle && cycle !== '월' && cycleEnd && value !== 0 && 'font-semibold'
                                      )}
                                      title={cell ? formatCellTooltip(cell) : undefined}
                                    >
                                      {value === 0 ? '−' : value.toLocaleString()}
                                    </TableCell>
                                  )
                                })}
                                <TableCell
                                  className={cn(
                                    'bg-muted/30 text-right font-semibold tabular-nums whitespace-nowrap',
                                    rowTotal < 0 ? 'text-destructive' : !unmatched && 'text-green-700'
                                  )}
                                >
                                  {rowTotal === 0 ? '−' : `${rowTotal.toLocaleString()}원`}
                                </TableCell>
                              </TableRow>
                            )
                          })}

                          {/* 월별 합계 행 */}
                          <TableRow className="border-t-2 bg-muted/40 font-semibold">
                            <TableCell className="sticky left-0 z-10 bg-muted/40 text-sm" colSpan={2}>
                              월별 합계
                            </TableCell>
                            {monthlyData.map((md) => {
                              const colTotal = md.rows.reduce((s, r) => s + r.settlement, 0)
                              return (
                                <TableCell
                                  key={md.key}
                                  className={cn(
                                    'text-right tabular-nums whitespace-nowrap',
                                    colTotal < 0 ? 'text-destructive' : 'text-green-700',
                                    colTotal === 0 && 'text-muted-foreground/40'
                                  )}
                                >
                                  {colTotal === 0 ? '−' : colTotal.toLocaleString()}
                                </TableCell>
                              )
                            })}
                            <TableCell
                              className={cn(
                                'bg-muted/60 text-right tabular-nums whitespace-nowrap',
                                grandTotal.settlement < 0 ? 'text-destructive' : 'text-green-700'
                              )}
                            >
                              {grandTotal.settlement.toLocaleString()}원
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {hasUnmatched && (
                  <p className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      정산그룹관리에 매핑되지 않은 충전건이 포함되어 있습니다.
                      해당 충전소를 정산그룹에 등록해 주세요.
                    </span>
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── 탭2: 고지서 발급 ───────────────────────────────────────────── */}
        {!loading && !error && activeTab === 'invoice' && (
          <div className="space-y-4">
            {/* 자동 발급/발송 설정 */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">고지서 자동 발급/발송</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">생성주기</label>
                    <select
                      value={autoCycle}
                      onChange={(e) => setAutoCycle(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    >
                      {['월', '분기', '반기', '년'].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">생성일자</label>
                    <input
                      type="text"
                      value={autoDate}
                      onChange={(e) => setAutoDate(e.target.value)}
                      placeholder="예: 매월 25일"
                      className="w-40 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                  </div>
                  <p className="ml-auto self-center text-xs text-muted-foreground">
                    설정한 주기·일자에 모든 정산그룹 앞으로 자동 발송됩니다.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 직접 발급 */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">매월 직접 발급</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-3">
                  <MonthSelect
                    label="정산월"
                    value={invoiceMonth}
                    onChange={(v) => setInvoiceMonth(v)}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">정산그룹</label>
                    <select
                      value={invoiceGroupName}
                      onChange={(e) => setInvoiceGroupName(e.target.value)}
                      disabled={invoiceableGroups.length === 0}
                      className="min-w-[200px] rounded-md border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      <option value="">
                        {invoiceableGroups.length === 0 ? '발급 대상 없음' : '— 그룹 선택 —'}
                      </option>
                      {invoiceableGroups.map((g) => (
                        <option key={g.group} value={g.group}>
                          {g.group} · 정산 {g.settlement.toLocaleString()}원
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    className="gap-2"
                    disabled={invoiceableGroups.length === 0 || !invoiceGroupName}
                    onClick={handleIssueInvoice}
                  >
                    <FileText className="h-4 w-4" />
                    고지서 미리보기
                  </Button>
                  <p className="ml-auto self-center text-xs text-muted-foreground">
                    매출이 발생한 정산그룹만 발급 가능합니다.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 발급 이력 테이블 */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">고지서 발급 이력</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {invoiceHistory.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    발급 이력이 없습니다. 위에서 직접 발급해 보세요.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>발급일</TableHead>
                        <TableHead>정산기간</TableHead>
                        <TableHead>대상 그룹</TableHead>
                        <TableHead>발송 이메일</TableHead>
                        <TableHead className="text-right">정산금액(순)</TableHead>
                        <TableHead className="text-center">상태</TableHead>
                        <TableHead className="text-center">미리보기</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceHistory.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-muted-foreground">{row.issuedAt}</TableCell>
                          <TableCell>{row.period}</TableCell>
                          <TableCell className="font-medium">{row.target}</TableCell>
                          <TableCell className="text-muted-foreground">{row.email}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold text-green-700">
                            {row.settlement.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', invoiceStatusColor[row.status])}>
                              {row.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setPreviewInvoice(row)}
                              aria-label="고지서 미리보기"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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

      {/* 고지서 미리보기 모달 */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onSend={handleSendInvoice}
          alreadySent={previewInvoice.status === '발송완료'}
        />
      )}
    </div>
  )
}

// ─── 보조 UI 컴포넌트 ────────────────────────────────────────────────────────

function MonthSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: MonthKey
  onChange: (v: MonthKey) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1">
        <select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: parseInt(e.target.value) })}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select
          value={value.month}
          onChange={(e) => onChange({ ...value, month: parseInt(e.target.value) })}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
        </select>
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  unit: string
  color: string
  bg: string
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={cn('rounded-md p-1.5', bg)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function formatCellTooltip(c: SettlementRow): string {
  const lines = [
    `${c.group} · ${c.period}`,
    `매출: ${c.revenue.toLocaleString()}원`,
    `충전량: ${c.kwh.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`,
    `분배(${c.rate}%): ${c.revenueShare.toLocaleString()}원`,
    `−부지: ${c.landFee.toLocaleString()}원`,
    `−위탁: ${c.fee.toLocaleString()}원`,
    `정산: ${c.settlement.toLocaleString()}원`,
  ]
  return lines.join('\n')
}

// ─── 고지서 A4 미리보기 모달 ─────────────────────────────────────────────────

function InvoicePreviewModal({
  invoice,
  onClose,
  onSend,
  alreadySent,
}: {
  invoice: InvoiceRecord
  onClose: () => void
  onSend: () => void
  alreadySent: boolean
}) {
  const total = invoice.settlement
  const invoiceNo = invoice.id.replace('INV-', '') // 표시용

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-transparent print:p-0">
      <div className="flex max-h-full w-full max-w-[840px] flex-col overflow-hidden rounded-lg bg-background shadow-2xl print:max-h-none print:overflow-visible print:shadow-none">
        {/* 액션 바 (인쇄 시 숨김) */}
        <div className="flex items-center justify-between border-b px-4 py-2 print:hidden">
          <p className="text-sm font-medium">고지서 미리보기</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              PDF 인쇄
            </Button>
            <Button
              size="sm"
              onClick={onSend}
              disabled={alreadySent}
              className="gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              {alreadySent ? '발송 완료' : '이메일 발송'}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="닫기">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* A4 본문 — 210 × 297mm 비율 */}
        <div className="overflow-y-auto bg-muted/30 p-6 print:overflow-visible print:bg-transparent print:p-0">
          <div className="mx-auto flex w-[210mm] min-h-[297mm] flex-col bg-white p-[18mm] text-[10pt] text-slate-900 shadow-md print:shadow-none">
            {/* 상단 헤더 */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-[22pt] font-bold tracking-tight">정산 고지서</h1>
                <p className="mt-1 text-[9pt] text-slate-500">Settlement Invoice</p>
              </div>
              <div className="text-right text-[9pt]">
                <p>
                  <span className="text-slate-500">고지서 번호: </span>
                  <span className="font-mono">{invoiceNo}</span>
                </p>
                <p>
                  <span className="text-slate-500">발급일: </span>
                  {invoice.issuedAt}
                </p>
                <p className="mt-2 text-[10pt] font-semibold">GS차지비</p>
                <p className="text-[8pt] text-slate-500">서울특별시 강남구 / 사업자 123-45-67890</p>
              </div>
            </div>

            {/* 발급/수신 영역 */}
            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-[8pt] font-medium text-slate-500">발급자</p>
                <p className="mt-1 text-[11pt] font-semibold">GS차지비 주식회사</p>
                <p className="text-[9pt] text-slate-600">대표이사 (인)</p>
                <p className="mt-3 text-[8pt] text-slate-500">담당: 정산팀 · settle@gschargev.co.kr</p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[8pt] font-medium text-slate-500">수신</p>
                <p className="mt-1 text-[12pt] font-semibold">{invoice.target}</p>
                <p className="mt-2 text-[8pt] text-slate-500">정산기간</p>
                <p className="text-[10pt] font-medium">{invoice.period}</p>
                <p className="mt-2 text-[8pt] text-slate-500">정산주기</p>
                <p className="text-[10pt]">{invoice.cycle || '월'}</p>
              </div>
            </div>

            {/* 정산 내역 */}
            <div className="mt-6">
              <p className="text-[10pt] font-semibold">정산 내역</p>
              <table className="mt-2 w-full border-collapse text-[9.5pt]">
                <thead>
                  <tr className="border-y border-slate-900 bg-slate-900 text-white">
                    <th className="px-3 py-2 text-left">항목</th>
                    <th className="px-3 py-2 text-right">수치</th>
                    <th className="px-3 py-2 text-right">금액 (원)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2">충전 매출 합계</td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {invoice.kwh.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {invoice.revenue.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2">매출 분배 정산</td>
                    <td className="px-3 py-2 text-right text-slate-500">분배율 {invoice.rate}%</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {invoice.revenueShare.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <td className="px-3 py-2">부지사용료</td>
                    <td className="px-3 py-2 text-right text-slate-500">차감</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {invoice.landFee > 0 ? `-${invoice.landFee.toLocaleString()}` : '0'}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <td className="px-3 py-2">위탁운영 수수료</td>
                    <td className="px-3 py-2 text-right text-slate-500">차감</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {invoice.fee > 0 ? `-${invoice.fee.toLocaleString()}` : '0'}
                    </td>
                  </tr>
                  <tr className="border-y-2 border-slate-900 bg-slate-100">
                    <td className="px-3 py-3 text-[11pt] font-bold">정산금액 합계 (지급액)</td>
                    <td />
                    <td className={cn(
                      'px-3 py-3 text-right tabular-nums text-[14pt] font-bold',
                      total < 0 ? 'text-red-600' : 'text-slate-900'
                    )}>
                      {total.toLocaleString()} 원
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="mt-2 text-[8pt] text-slate-500">
                정산금액 = (매출 × 분배율) − 부지사용료 − 위탁운영수수료
              </p>
            </div>

            {/* 입금 정보 */}
            <div className="mt-6 rounded border border-slate-200 px-4 py-3">
              <p className="text-[9pt] font-semibold">입금 계좌</p>
              <div className="mt-1 grid grid-cols-3 gap-2 text-[9pt]">
                <div>
                  <p className="text-slate-500">은행</p>
                  <p>국민은행</p>
                </div>
                <div>
                  <p className="text-slate-500">계좌번호</p>
                  <p className="font-mono">123456-78-901234</p>
                </div>
                <div>
                  <p className="text-slate-500">예금주</p>
                  <p>GS차지비 주식회사</p>
                </div>
              </div>
            </div>

            {/* 안내 + 직인 자리 */}
            <div className="mt-auto pt-8">
              <p className="text-[8pt] text-slate-500">
                ※ 본 고지서는 정산 시점의 충전이력 및 정산그룹 설정값을 기준으로 산정되었습니다.
                <br />
                ※ 금액 이의가 있을 경우 발급일로부터 7일 이내에 정산팀(settle@gschargev.co.kr)으로 문의 바랍니다.
              </p>
              <div className="mt-6 flex justify-end">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-500 text-[9pt] font-bold text-red-500">
                  GS차지비
                  <br />
                  (인)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
