'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type {
  Charger,
  ChargerStatus,
  ChargerType,
  ChargingStation,
} from '@/lib/adapters/station/types'
import {
  CHARGER_STATUS_LABEL,
  CONNECTOR_TYPE_LABEL,
} from '@/lib/adapters/station/types'

const STATUS_FILTERS: Array<{ key: 'all' | ChargerStatus; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'normal', label: '대기' },
  { key: 'charging', label: '충전중' },
  { key: 'maintenance', label: '점검중' },
  { key: 'fault', label: '고장' },
  { key: 'offline', label: '미연결' },
]

const TYPE_FILTERS: Array<{ key: 'all' | ChargerType; label: string }> = [
  { key: 'all', label: '전체 타입' },
  { key: 'fast', label: '급속' },
  { key: 'slow', label: '완속' },
]

interface Props {
  chargers: Charger[]
  stations: ChargingStation[]
  stationMap: Record<string, ChargingStation>
  initialStationFilter: string
}

export function ChargersClient({
  chargers,
  stations,
  stationMap,
  initialStationFilter,
}: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ChargerStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ChargerType>('all')
  const [stationFilter, setStationFilter] = useState<string>(initialStationFilter)

  const filtered = useMemo(() => {
    let items = chargers
    if (stationFilter !== 'all') items = items.filter((c) => c.stationId === stationFilter)
    if (statusFilter !== 'all') items = items.filter((c) => c.status === statusFilter)
    if (typeFilter !== 'all') items = items.filter((c) => c.type === typeFilter)
    if (search) {
      const k = search.toLowerCase()
      items = items.filter(
        (c) =>
          c.id.toLowerCase().includes(k) ||
          c.serial.toLowerCase().includes(k) ||
          (stationMap[c.stationId]?.name.toLowerCase().includes(k) ?? false),
      )
    }
    return items
  }, [chargers, search, statusFilter, typeFilter, stationFilter, stationMap])

  const counts = useMemo(() => {
    const byStatus: Record<ChargerStatus, number> = {
      normal: 0,
      charging: 0,
      maintenance: 0,
      fault: 0,
      offline: 0,
    }
    for (const c of chargers) byStatus[c.status]++
    return byStatus
  }, [chargers])

  return (
    <div className="space-y-4">
      {/* 상태 요약 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryItem label="대기" count={counts.normal} tone="success" />
        <SummaryItem label="충전중" count={counts.charging} tone="info" />
        <SummaryItem label="점검중" count={counts.maintenance} tone="warning" />
        <SummaryItem label="고장" count={counts.fault} tone="danger" />
        <SummaryItem label="미연결" count={counts.offline} tone="muted" />
      </div>

      {/* 필터 */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="충전기 ID, 시리얼, 충전소명 검색"
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">모든 충전소</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              {TYPE_FILTERS.map((f) => (
                <FilterBtn
                  key={f.key}
                  active={typeFilter === f.key}
                  onClick={() => setTypeFilter(f.key)}
                  label={f.label}
                />
              ))}
            </div>
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <FilterBtn
                  key={f.key}
                  active={statusFilter === f.key}
                  onClick={() => setStatusFilter(f.key)}
                  label={f.label}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              조건에 맞는 충전기가 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>충전기 ID</TableHead>
                  <TableHead>충전소</TableHead>
                  <TableHead>타입</TableHead>
                  <TableHead>커넥터</TableHead>
                  <TableHead className="text-right">용량</TableHead>
                  <TableHead>펌웨어</TableHead>
                  <TableHead>마지막 통신</TableHead>
                  <TableHead className="text-right">오늘 사용</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const station = stationMap[c.stationId]
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.id}</TableCell>
                      <TableCell>
                        {station ? (
                          <Link
                            href={`/station-info/info?id=${station.id}`}
                            className="text-sm font-medium hover:text-primary"
                          >
                            {station.name}
                          </Link>
                        ) : (
                          c.stationId
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-xs font-medium',
                            c.type === 'fast'
                              ? 'bg-info-soft text-info-soft-foreground'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {c.type === 'fast' ? '급속' : '완속'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {CONNECTOR_TYPE_LABEL[c.connectorType]}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {c.capacity}kW
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        v{c.firmwareVersion ?? '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.lastSeenAt ? formatRelativeTime(c.lastSeenAt) : '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.todayUsageCount ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={CHARGER_STATUS_LABEL[c.status]} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryItem({
  label,
  count,
  tone,
}: {
  label: string
  count: number
  tone: 'success' | 'warning' | 'danger' | 'info' | 'muted'
}) {
  const dotCls = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
    muted: 'bg-muted-foreground',
  }[tone]
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dotCls)} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-bold tabular-nums">{count}</p>
      </div>
    </div>
  )
}

function FilterBtn({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background text-muted-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  )
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}초 전`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  return `${day}일 전`
}
