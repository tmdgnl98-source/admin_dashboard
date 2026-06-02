'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/status-badge'
import { DotSummary } from '@/components/ui/summary-card'

const stations = ['전체', '강남 충전소', '홍대 충전소', '신촌 충전소', '잠실 충전소', '판교 충전소']
const periods = ['2026년 4월', '2026년 3월', '2026년 2월', '2026년 1월']

interface KepcoRecord {
  station: string
  contractNo: string
  customerNo: string
  monthlyFee: string
  dueDate: string
  paidDate: string | null
  status: '납부완료' | '납부대기' | '미납'
}

const kepcoRecords: KepcoRecord[] = [
  { station: '강남 충전소', contractNo: 'SE-2024-0012', customerNo: '2840193847', monthlyFee: '2,840,000', dueDate: '2026-04-30', paidDate: '2026-04-28', status: '납부완료' },
  { station: '홍대 충전소', contractNo: 'SE-2024-0034', customerNo: '1938475610', monthlyFee: '1,520,000', dueDate: '2026-04-30', paidDate: '2026-04-29', status: '납부완료' },
  { station: '신촌 충전소', contractNo: 'SE-2024-0051', customerNo: '3847561029', monthlyFee: '980,000', dueDate: '2026-04-30', paidDate: null, status: '납부대기' },
  { station: '잠실 충전소', contractNo: 'SE-2023-0078', customerNo: '4756102938', monthlyFee: '3,210,000', dueDate: '2026-04-30', paidDate: null, status: '미납' },
  { station: '판교 충전소', contractNo: 'SE-2024-0092', customerNo: '5610293847', monthlyFee: '1,870,000', dueDate: '2026-04-30', paidDate: '2026-04-25', status: '납부완료' },
  { station: '강남 충전소 B동', contractNo: 'SE-2025-0003', customerNo: '6102938475', monthlyFee: '1,340,000', dueDate: '2026-04-30', paidDate: '2026-04-27', status: '납부완료' },
]

const statusSummary = (records: KepcoRecord[]) => ({
  completed: records.filter((r) => r.status === '납부완료').length,
  pending: records.filter((r) => r.status === '납부대기').length,
  unpaid: records.filter((r) => r.status === '미납').length,
  total: records.reduce((sum, r) => sum + parseInt(r.monthlyFee.replace(/,/g, '')), 0),
})

export default function KepcoPaymentPage() {
  const [selectedStation, setSelectedStation] = useState('전체')
  const [selectedPeriod, setSelectedPeriod] = useState('2026년 4월')

  const filtered =
    selectedStation === '전체'
      ? kepcoRecords
      : kepcoRecords.filter((r) => r.station.startsWith(selectedStation.replace(' 충전소', '')))

  const summary = statusSummary(filtered)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="한전 납부 이력" />

      <div className="flex flex-1 flex-col overflow-y-auto p-6 gap-4">
        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {stations.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {periods.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DotSummary label="납부완료" value={`${summary.completed}건`} tone="success" />
          <DotSummary label="납부대기" value={`${summary.pending}건`} tone="warning" />
          <DotSummary label="미납" value={`${summary.unpaid}건`} tone="danger" />
          <DotSummary label="총 전기요금" value={`${summary.total.toLocaleString()}원`} tone="info" />
        </div>

        {/* 테이블 */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {selectedPeriod} 충전소별 전기요금 납부 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>충전소명</TableHead>
                  <TableHead>계약번호</TableHead>
                  <TableHead>고객번호</TableHead>
                  <TableHead className="text-right">당월 요금</TableHead>
                  <TableHead>납부기한</TableHead>
                  <TableHead>납부일자</TableHead>
                  <TableHead className="text-center">납부 상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.station}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.contractNo}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.customerNo}</TableCell>
                    <TableCell className="text-right font-medium">{row.monthlyFee}원</TableCell>
                    <TableCell className="text-muted-foreground">{row.dueDate}</TableCell>
                    <TableCell className="text-muted-foreground">{row.paidDate ?? '-'}</TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
