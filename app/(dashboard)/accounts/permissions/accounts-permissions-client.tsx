'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Lock, Unlock, LogOut, KeyRound, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/navigation'

const ROLE_LABEL: Record<UserRole, string> = {
  main_admin: '본사 운영팀',
  normal_admin: '일반 직원',
  partner_admin: '파트너',
}

const ROLE_FILTERS: Array<{ key: 'all' | UserRole; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'main_admin', label: '본사 운영팀' },
  { key: 'normal_admin', label: '일반 직원' },
  { key: 'partner_admin', label: '파트너' },
]

interface UserDto {
  id: string
  name: string
  email: string
  phone: string
  businessNo: string | null
  role: UserRole
  lockedUntil: string | null
  lastLoginAt: string | null
  createdAt: string
  mustChangePassword: boolean
  failedLoginCount: number
  accountCount: number
  activeSessionCount: number
}

interface Props {
  users: UserDto[]
  currentUserId: string
}

export function AccountsPermissionsClient({ users, currentUserId }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; msg: string } | null>(null)

  const filtered = useMemo(() => {
    let items = users
    if (roleFilter !== 'all') items = items.filter((u) => u.role === roleFilter)
    if (search) {
      const k = search.toLowerCase()
      items = items.filter(
        (u) =>
          u.name.toLowerCase().includes(k) ||
          u.email.toLowerCase().includes(k) ||
          u.phone.includes(k) ||
          (u.businessNo?.includes(k) ?? false),
      )
    }
    return items
  }, [users, search, roleFilter])

  const counts = useMemo(() => {
    const r: Record<UserRole, number> = { main_admin: 0, normal_admin: 0, partner_admin: 0 }
    for (const u of users) r[u.role]++
    return r
  }, [users])

  const callAction = async (
    label: string,
    fn: () => Promise<Response>,
    successMsg: string,
  ) => {
    setBusyId(label)
    setBanner(null)
    try {
      const r = await fn()
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setBanner({ tone: 'danger', msg: data.error ?? '요청 실패' })
        return
      }
      setBanner({ tone: 'success', msg: data.tempPassword ? `${successMsg} 임시 비밀번호: ${data.tempPassword}` : successMsg })
      router.refresh()
    } catch {
      setBanner({ tone: 'danger', msg: '네트워크 오류' })
    } finally {
      setBusyId(null)
    }
  }

  const lockUser = (u: UserDto) =>
    callAction(
      `lock-${u.id}`,
      () => fetch(`/api/admin/users/${u.id}/lock`, { method: 'POST' }),
      `${u.name} 계정을 잠갔습니다.`,
    )

  const unlockUser = (u: UserDto) =>
    callAction(
      `unlock-${u.id}`,
      () => fetch(`/api/admin/users/${u.id}/lock`, { method: 'DELETE' }),
      `${u.name} 계정 잠금을 해제했습니다.`,
    )

  const forceLogout = (u: UserDto) =>
    callAction(
      `logout-${u.id}`,
      () => fetch(`/api/admin/users/${u.id}/sessions`, { method: 'DELETE' }),
      `${u.name}의 모든 세션을 종료했습니다.`,
    )

  const resetPassword = (u: UserDto) => {
    if (!confirm(`${u.name}의 비밀번호를 재발급합니다. 사용자는 다음 로그인 시 변경이 강제됩니다.`)) return
    callAction(
      `pwreset-${u.id}`,
      () => fetch(`/api/admin/users/${u.id}/password-reset`, { method: 'POST' }),
      `${u.name}의 비밀번호를 재발급했습니다.`,
    )
  }

  const changeRole = (u: UserDto, role: UserRole) => {
    if (u.role === role) return
    if (!confirm(`${u.name}의 권한을 [${ROLE_LABEL[role]}](으)로 변경합니다.`)) return
    callAction(
      `role-${u.id}`,
      () =>
        fetch(`/api/admin/users/${u.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }),
      `${u.name}의 권한을 [${ROLE_LABEL[role]}](으)로 변경했습니다.`,
    )
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryItem label="전체 계정" value={users.length} tone="primary" />
        <SummaryItem label="본사 운영팀" value={counts.main_admin} tone="info" />
        <SummaryItem label="일반 직원" value={counts.normal_admin} tone="muted" />
        <SummaryItem label="파트너" value={counts.partner_admin} tone="success" />
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
          <span className="break-all">{banner.msg}</span>
        </div>
      )}

      {/* 검색 + 필터 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름, 이메일, 전화, 사업자번호 검색"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition',
                roleFilter === f.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              조건에 맞는 계정이 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>휴대폰</TableHead>
                  <TableHead>권한</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-right">충전소</TableHead>
                  <TableHead className="text-right">세션</TableHead>
                  <TableHead>마지막 로그인</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const locked = u.lockedUntil ? new Date(u.lockedUntil) > new Date() : false
                  const isSelf = u.id === currentUserId
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.name}</div>
                        {u.businessNo && (
                          <div className="font-mono text-xs text-muted-foreground">
                            {u.businessNo}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell className="font-mono text-xs">{u.phone}</TableCell>
                      <TableCell>
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value as UserRole)}
                          disabled={isSelf && u.role === 'main_admin'}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
                        >
                          <option value="main_admin">본사 운영팀</option>
                          <option value="normal_admin">일반 직원</option>
                          <option value="partner_admin">파트너</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-center">
                        {locked ? (
                          <StatusBadge status="비활성">잠금</StatusBadge>
                        ) : u.mustChangePassword ? (
                          <StatusBadge status="만료임박">비번변경필요</StatusBadge>
                        ) : (
                          <StatusBadge status="활성" />
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.accountCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.activeSessionCount > 0 ? (
                          <span className="font-semibold text-info">{u.activeSessionCount}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString('ko-KR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {locked ? (
                            <ActionBtn
                              icon={Unlock}
                              label="잠금해제"
                              onClick={() => unlockUser(u)}
                              busy={busyId === `unlock-${u.id}`}
                            />
                          ) : (
                            <ActionBtn
                              icon={Lock}
                              label="잠금"
                              onClick={() => lockUser(u)}
                              disabled={isSelf}
                              busy={busyId === `lock-${u.id}`}
                              tone="danger"
                            />
                          )}
                          <ActionBtn
                            icon={LogOut}
                            label="강제로그아웃"
                            onClick={() => forceLogout(u)}
                            disabled={u.activeSessionCount === 0}
                            busy={busyId === `logout-${u.id}`}
                          />
                          <ActionBtn
                            icon={KeyRound}
                            label="비번재발급"
                            onClick={() => resetPassword(u)}
                            busy={busyId === `pwreset-${u.id}`}
                          />
                        </div>
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
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'primary' | 'info' | 'muted' | 'success'
}) {
  const dotCls = {
    primary: 'bg-primary',
    info: 'bg-info',
    muted: 'bg-muted-foreground',
    success: 'bg-success',
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

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  busy,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
  busy?: boolean
  tone?: 'danger'
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      title={label}
      disabled={disabled || busy}
      onClick={onClick}
      className={cn(
        'h-7 w-7',
        tone === 'danger' && 'text-danger hover:bg-danger-soft',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  )
}
