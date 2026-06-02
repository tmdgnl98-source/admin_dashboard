'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import {
  Activity,
  Zap,
  Clock,
  Battery,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import type { Charger, ChargerStatus } from '@/lib/adapters/station/types'
import {
  CHARGER_STATUS_LABEL,
  CONNECTOR_TYPE_LABEL,
} from '@/lib/adapters/station/types'

const POLL_INTERVAL_MS = 10_000

interface ApiResponse {
  fetchedAt: string
  stations: Record<string, { id: string; name: string; address: string }>
  chargers: Charger[]
}

interface Props {
  stations: Array<{ id: string; name: string }>
  initialStationFilter: string
}

export function RealtimeClient({ stations, initialStationFilter }: Props) {
  const [stationFilter, setStationFilter] = useState<string>(initialStationFilter)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        const url =
          stationFilter === 'all'
            ? '/api/stations/realtime'
            : `/api/stations/realtime?stationId=${stationFilter}`
        const r = await fetch(url, { cache: 'no-store' })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const json: ApiResponse = await r.json()
        // 날짜 객체로 변환
        json.chargers.forEach((c) => {
          if (c.lastSeenAt) c.lastSeenAt = new Date(c.lastSeenAt)
          if (c.currentSession?.startedAt) {
            c.currentSession.startedAt = new Date(c.currentSession.startedAt)
          }
        })
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '데이터 불러오기 실패')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [stationFilter])

  const counts = useMemo(() => {
    const byStatus: Record<ChargerStatus, number> = {
      normal: 0,
      charging: 0,
      maintenance: 0,
      fault: 0,
      offline: 0,
    }
    if (data) for (const c of data.chargers) byStatus[c.status]++
    return byStatus
  }, [data])

  return (
    <div className="space-y-4">
      {/* 상단: 필터 + 라이브 인디케이터 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">모든 충전소</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.id})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span>10초마다 자동 갱신</span>
          {data && (
            <>
              <span>·</span>
              <span>
                마지막 갱신 {new Date(data.fetchedAt).toLocaleTimeString('ko-KR')}
              </span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger-soft-foreground">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi
          icon={Zap}
          label="충전중"
          count={counts.charging}
          tone="info"
          highlight
        />
        <Kpi icon={Activity} label="대기" count={counts.normal} tone="success" />
        <Kpi icon={Activity} label="점검중" count={counts.maintenance} tone="warning" />
        <Kpi icon={AlertCircle} label="고장" count={counts.fault} tone="danger" />
        <Kpi icon={Activity} label="미연결" count={counts.offline} tone="muted" />
      </div>

      {/* 충전기 그리드 */}
      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          데이터 불러오는 중...
        </div>
      ) : data && data.chargers.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          충전기가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data?.chargers.map((c) => (
            <ChargerCard
              key={c.id}
              charger={c}
              stationName={data.stations[c.stationId]?.name ?? c.stationId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  count,
  tone,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  tone: 'success' | 'warning' | 'danger' | 'info' | 'muted'
  highlight?: boolean
}) {
  const wrapCls = {
    success: 'bg-success-soft text-success-soft-foreground',
    warning: 'bg-warning-soft text-warning-soft-foreground',
    danger: 'bg-danger-soft text-danger-soft-foreground',
    info: 'bg-info-soft text-info-soft-foreground',
    muted: 'bg-muted text-muted-foreground',
  }[tone]
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4',
        highlight && 'border-info/40 ring-2 ring-info/15',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className={cn('rounded-md p-1.5', wrapCls)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{count}</p>
    </div>
  )
}

function ChargerCard({ charger, stationName }: { charger: Charger; stationName: string }) {
  const session = charger.currentSession

  return (
    <Card className={cn('shadow-sm', charger.status === 'charging' && 'border-info/40')}>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/station-info/info?id=${charger.stationId}`}
              className="text-sm font-medium hover:text-primary"
            >
              {stationName}
            </Link>
            <p className="font-mono text-xs text-muted-foreground">{charger.id}</p>
          </div>
          <StatusBadge
            status={CHARGER_STATUS_LABEL[charger.status]}
            solid={charger.status === 'charging' || charger.status === 'fault'}
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {charger.type === 'fast' ? '급속' : '완속'} {charger.capacity}kW
          </span>
          <span>·</span>
          <span>{CONNECTOR_TYPE_LABEL[charger.connectorType]}</span>
        </div>

        {session ? (
          <div className="space-y-2 rounded-md bg-info-soft/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-info-soft-foreground">
                <Battery className="h-3.5 w-3.5" />
                충전율
              </span>
              <span className="font-bold tabular-nums text-info-soft-foreground">
                {session.soc}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-info transition-all"
                style={{ width: `${session.soc}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatElapsed(session.startedAt)}
              </span>
              <span>
                {session.energyKwh}kWh · {session.userAlias}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>오늘 사용 {charger.todayUsageCount ?? 0}건</span>
            {charger.lastSeenAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(charger.lastSeenAt)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatElapsed(start: Date): string {
  const sec = Math.floor((Date.now() - start.getTime()) / 1000)
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 경과`
  return `${Math.floor(min / 60)}시간 ${min % 60}분 경과`
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}초 전`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}
