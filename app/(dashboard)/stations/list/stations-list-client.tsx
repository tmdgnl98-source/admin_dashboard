'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, MapPin, Zap, TrendingUp, Calendar } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { ChargingStation, StationStatus } from '@/lib/adapters/station/types'
import { STATION_STATUS_LABEL, FACILITY_TYPE_LABEL } from '@/lib/adapters/station/types'
import type { UserRole } from '@/types/navigation'

const STATUS_FILTERS: Array<{ key: 'all' | StationStatus; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '정상' },
  { key: 'maintenance', label: '점검중' },
  { key: 'fault', label: '고장' },
  { key: 'inactive', label: '비활성' },
]

interface Props {
  stations: ChargingStation[]
  role: UserRole
}

export function StationsListClient({ stations, role }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | StationStatus>('all')

  const filtered = useMemo(() => {
    let items = stations
    if (statusFilter !== 'all') items = items.filter((s) => s.status === statusFilter)
    if (search) {
      const k = search.toLowerCase()
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(k) ||
          s.id.toLowerCase().includes(k) ||
          s.address.toLowerCase().includes(k),
      )
    }
    return items
  }, [stations, search, statusFilter])

  const counts = useMemo(() => {
    const byStatus: Record<StationStatus, number> = { active: 0, maintenance: 0, fault: 0, inactive: 0 }
    for (const s of stations) byStatus[s.status]++
    return byStatus
  }, [stations])

  if (stations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Zap className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">
          {role === 'partner_admin' ? '권한이 부여된 충전소가 없습니다.' : '등록된 충전소가 없습니다.'}
        </p>
        {role === 'partner_admin' && (
          <p className="mt-1 text-xs text-muted-foreground">
            운영팀에 문의하거나, 셀프 클레임 신청을 진행해주세요.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryItem label="전체" value={stations.length} tone="primary" />
        <SummaryItem label="정상" value={counts.active} tone="success" />
        <SummaryItem label="점검중" value={counts.maintenance} tone="warning" />
        <SummaryItem label="고장" value={counts.fault} tone="danger" />
        <SummaryItem label="비활성" value={counts.inactive} tone="muted" />
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름, ID, 주소 검색"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition',
                statusFilter === f.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          조건에 맞는 충전소가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted'
}) {
  const dotCls = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    muted: 'bg-muted-foreground',
  }[tone]
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dotCls)} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-bold tabular-nums">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}

function StationCard({ station }: { station: ChargingStation }) {
  const uptimePct = station.uptime30d !== undefined ? Math.round(station.uptime30d * 1000) / 10 : null

  return (
    <Link
      href={`/station-info/info?id=${station.id}`}
      className="group block rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold group-hover:text-primary">
            {station.name}
          </h3>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {station.id}
            {station.facilityType && ` · ${FACILITY_TYPE_LABEL[station.facilityType]}`}
          </p>
        </div>
        <StatusBadge status={STATION_STATUS_LABEL[station.status]} />
      </div>

      <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="line-clamp-2">{station.address}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
        <Stat icon={Zap} label="충전기" value={`${station.chargerCount}대`} />
        {uptimePct !== null && (
          <Stat
            icon={TrendingUp}
            label="가동률"
            value={`${uptimePct}%`}
            tone={uptimePct >= 95 ? 'success' : uptimePct >= 85 ? 'warning' : 'danger'}
          />
        )}
        {station.contractEndAt && (
          <Stat
            icon={Calendar}
            label="계약 만료"
            value={station.contractEndAt.slice(2).replace(/-/g, '.')}
          />
        )}
      </div>

      {station.monthlyRevenue !== undefined && station.monthlyRevenue > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          이번달 매출{' '}
          <span className="font-semibold tabular-nums text-foreground">
            {station.monthlyRevenue.toLocaleString()}원
          </span>
          {station.monthlyUsageCount !== undefined && (
            <span> · 충전 {station.monthlyUsageCount.toLocaleString()}건</span>
          )}
        </p>
      )}
    </Link>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone?: 'success' | 'warning' | 'danger'
}) {
  const toneCls = tone
    ? { success: 'text-success', warning: 'text-warning', danger: 'text-danger' }[tone]
    : ''
  return (
    <div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className={cn('mt-0.5 font-semibold tabular-nums', toneCls)}>{value}</p>
    </div>
  )
}
