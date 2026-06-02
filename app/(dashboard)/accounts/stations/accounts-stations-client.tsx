'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UserPlus, X, AlertCircle, Crown, User, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  STATION_STATUS_LABEL,
  type StationStatus,
} from '@/lib/adapters/station/types'

type ScopeRole = 'owner' | 'member' | 'viewer'

const SCOPE_LABEL: Record<ScopeRole, string> = {
  owner: 'Owner',
  member: 'Member',
  viewer: 'Viewer',
}

const SCOPE_ICON: Record<ScopeRole, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  member: User,
  viewer: Eye,
}

interface AccountDto {
  id: string
  userId: string
  scopeRole: ScopeRole
  userName: string
  userEmail: string
  userPhone: string
  createdAt: string
}

interface StationDto {
  id: string
  name: string
  address: string
  status: StationStatus
  chargerCount: number
  accounts: AccountDto[]
}

interface PartnerDto {
  id: string
  name: string
  email: string
  phone: string
  businessNo: string | null
}

interface Props {
  stations: StationDto[]
  partners: PartnerDto[]
}

export function AccountsStationsClient({ stations, partners }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; msg: string } | null>(null)
  const [grantingStation, setGrantingStation] = useState<StationDto | null>(null)

  const filtered = useMemo(() => {
    if (!search) return stations
    const k = search.toLowerCase()
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(k) ||
        s.id.toLowerCase().includes(k) ||
        s.address.toLowerCase().includes(k) ||
        s.accounts.some(
          (a) =>
            a.userName.toLowerCase().includes(k) ||
            a.userEmail.toLowerCase().includes(k),
        ),
    )
  }, [stations, search])

  const counts = useMemo(() => ({
    totalStations: stations.length,
    totalMappings: stations.reduce((s, st) => s + st.accounts.length, 0),
    stationsWithoutOwner: stations.filter(
      (st) => !st.accounts.some((a) => a.scopeRole === 'owner'),
    ).length,
    unassignedStations: stations.filter((st) => st.accounts.length === 0).length,
  }), [stations])

  const revoke = async (stationId: string, userId: string, userName: string) => {
    if (!confirm(`${userName}의 ${stationId} 권한을 회수합니다.`)) return
    setBusy(`revoke-${stationId}-${userId}`)
    setBanner(null)
    try {
      const r = await fetch(
        `/api/admin/accounts?userId=${userId}&stationId=${stationId}`,
        { method: 'DELETE' },
      )
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setBanner({ tone: 'danger', msg: data.error ?? '요청 실패' })
        return
      }
      setBanner({ tone: 'success', msg: `${userName}의 ${stationId} 권한이 회수되었습니다.` })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const changeScope = async (stationId: string, userId: string, newScope: ScopeRole) => {
    setBusy(`scope-${stationId}-${userId}`)
    setBanner(null)
    try {
      const r = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, stationId, scopeRole: newScope }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setBanner({ tone: 'danger', msg: data.error ?? '요청 실패' })
        return
      }
      setBanner({ tone: 'success', msg: `권한이 ${SCOPE_LABEL[newScope]}(으)로 변경되었습니다.` })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const grant = async (stationId: string, userId: string, scopeRole: ScopeRole) => {
    setBusy(`grant-${stationId}`)
    setBanner(null)
    try {
      const r = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, stationId, scopeRole }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setBanner({ tone: 'danger', msg: data.error ?? '요청 실패' })
        return
      }
      setBanner({ tone: 'success', msg: '권한이 부여되었습니다.' })
      setGrantingStation(null)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryItem label="전체 충전소" value={counts.totalStations} tone="primary" />
        <SummaryItem label="권한 매핑" value={counts.totalMappings} tone="info" />
        <SummaryItem
          label="Owner 미지정"
          value={counts.stationsWithoutOwner}
          tone={counts.stationsWithoutOwner > 0 ? 'warning' : 'success'}
        />
        <SummaryItem
          label="담당자 0명"
          value={counts.unassignedStations}
          tone={counts.unassignedStations > 0 ? 'danger' : 'success'}
        />
      </div>

      {banner && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md p-3 text-sm',
            banner.tone === 'success'
              ? 'bg-success-soft text-success-soft-foreground'
              : 'bg-danger-soft text-danger-soft-foreground',
          )}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {banner.msg}
        </div>
      )}

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="충전소명, 주소, 담당자 검색"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>

      {/* 충전소 카드 리스트 */}
      <div className="space-y-3">
        {filtered.map((station) => (
          <StationRow
            key={station.id}
            station={station}
            busy={busy}
            onChangeScope={changeScope}
            onRevoke={revoke}
            onGrantClick={() => setGrantingStation(station)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            조건에 맞는 충전소가 없습니다.
          </p>
        )}
      </div>

      {/* 권한 부여 모달 */}
      {grantingStation && (
        <GrantModal
          station={grantingStation}
          partners={partners.filter(
            (p) => !grantingStation.accounts.some((a) => a.userId === p.id),
          )}
          onClose={() => setGrantingStation(null)}
          onGrant={(userId, scopeRole) => grant(grantingStation.id, userId, scopeRole)}
          busy={busy === `grant-${grantingStation.id}`}
        />
      )}
    </div>
  )
}

function StationRow({
  station,
  busy,
  onChangeScope,
  onRevoke,
  onGrantClick,
}: {
  station: StationDto
  busy: string | null
  onChangeScope: (stationId: string, userId: string, newScope: ScopeRole) => void
  onRevoke: (stationId: string, userId: string, userName: string) => void
  onGrantClick: () => void
}) {
  const hasOwner = station.accounts.some((a) => a.scopeRole === 'owner')

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{station.name}</h3>
              <StatusBadge status={STATION_STATUS_LABEL[station.status]} />
              {!hasOwner && station.accounts.length > 0 && (
                <StatusBadge status="만료임박">Owner 없음</StatusBadge>
              )}
              {station.accounts.length === 0 && (
                <StatusBadge status="비활성">미지정</StatusBadge>
              )}
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {station.id} · 충전기 {station.chargerCount}대
            </p>
            <p className="text-xs text-muted-foreground">{station.address}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onGrantClick} className="gap-1">
            <UserPlus className="h-3.5 w-3.5" />
            권한 부여
          </Button>
        </div>

        {station.accounts.length > 0 && (
          <div className="space-y-1 border-t pt-3">
            {station.accounts.map((a) => {
              const Icon = SCOPE_ICON[a.scopeRole]
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.userName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.userEmail} · {a.userPhone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={a.scopeRole}
                      onChange={(e) =>
                        onChangeScope(station.id, a.userId, e.target.value as ScopeRole)
                      }
                      disabled={busy === `scope-${station.id}-${a.userId}`}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="owner">Owner</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => onRevoke(station.id, a.userId, a.userName)}
                      disabled={busy === `revoke-${station.id}-${a.userId}`}
                      className="text-muted-foreground hover:text-danger disabled:opacity-50"
                      title="권한 회수"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GrantModal({
  station,
  partners,
  onClose,
  onGrant,
  busy,
}: {
  station: StationDto
  partners: PartnerDto[]
  onClose: () => void
  onGrant: (userId: string, scopeRole: ScopeRole) => void
  busy: boolean
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [scopeRole, setScopeRole] = useState<ScopeRole>('member')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return partners
    const k = search.toLowerCase()
    return partners.filter(
      (p) =>
        p.name.toLowerCase().includes(k) ||
        p.email.toLowerCase().includes(k) ||
        p.phone.includes(k) ||
        (p.businessNo?.includes(k) ?? false),
    )
  }, [partners, search])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b p-4">
          <h3 className="text-base font-semibold">권한 부여</h3>
          <p className="text-xs text-muted-foreground">
            {station.name} ({station.id})
          </p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium">파트너 선택</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름, 이메일, 사업자번호 검색"
              className="mb-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border">
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  부여 가능한 파트너가 없습니다.
                </p>
              ) : (
                filtered.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40',
                      selectedUserId === p.id && 'bg-accent',
                    )}
                  >
                    <input
                      type="radio"
                      name="partner"
                      value={p.id}
                      checked={selectedUserId === p.id}
                      onChange={() => setSelectedUserId(p.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.email} · {p.businessNo ?? '사업자번호 없음'}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">권한 범위</label>
            <select
              value={scopeRole}
              onChange={(e) => setScopeRole(e.target.value as ScopeRole)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="owner">Owner (정산/계약/멤버 초대)</option>
              <option value="member">Member (모니터링/유지보수 접수)</option>
              <option value="viewer">Viewer (읽기 전용)</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={() => onGrant(selectedUserId, scopeRole)}
            disabled={!selectedUserId || busy}
          >
            {busy ? '처리 중...' : '권한 부여'}
          </Button>
        </div>
      </div>
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
  tone: 'primary' | 'info' | 'success' | 'warning' | 'danger'
}) {
  const dotCls = {
    primary: 'bg-primary',
    info: 'bg-info',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
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
