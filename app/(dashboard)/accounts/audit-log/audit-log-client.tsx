'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as CR } from 'lucide-react'
import { cn } from '@/lib/utils'

// 액션별 한글 라벨. 매핑 없으면 raw 표시.
const ACTION_LABEL: Record<string, string> = {
  'login.success': '로그인 성공',
  'login.failed': '로그인 실패',
  'login.failed_locked': '로그인 실패 (계정 잠금)',
  logout: '로그아웃',
  'user.lock': '계정 잠금',
  'user.unlock': '계정 잠금 해제',
  'user.force_logout': '강제 로그아웃',
  'user.role_change': '권한 변경',
  'user.password_reset': '비밀번호 재발급',
  'account.grant': '충전소 권한 부여',
  'account.revoke': '충전소 권한 회수',
}

const ACTION_TONE: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'muted'> = {
  'login.success': 'success',
  'login.failed': 'warning',
  'login.failed_locked': 'danger',
  logout: 'muted',
  'user.lock': 'danger',
  'user.unlock': 'success',
  'user.force_logout': 'warning',
  'user.role_change': 'info',
  'user.password_reset': 'warning',
  'account.grant': 'success',
  'account.revoke': 'danger',
}

interface LogDto {
  id: string
  action: string
  resourceType: string
  resourceId: string
  actorName: string | null
  actorEmail: string | null
  userId: string | null
  ipAddress: string
  userAgent: string
  before: unknown
  after: unknown
  createdAt: string
}

interface Props {
  logs: LogDto[]
  total: number
  page: number
  pageSize: number
  actionOptions: Array<{ action: string; count: number }>
  currentFilters: { action: string; userId: string; resourceType: string }
}

export function AuditLogClient({
  logs,
  total,
  page,
  pageSize,
  actionOptions,
  currentFilters,
}: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState(currentFilters)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (filters.action) params.set('action', filters.action)
    if (filters.userId) params.set('userId', filters.userId)
    if (filters.resourceType) params.set('resourceType', filters.resourceType)
    router.push(`/accounts/audit-log?${params.toString()}`)
  }

  const resetFilters = () => {
    setFilters({ action: '', userId: '', resourceType: '' })
    router.push('/accounts/audit-log')
  }

  const goPage = (p: number) => {
    const params = new URLSearchParams()
    if (filters.action) params.set('action', filters.action)
    if (filters.userId) params.set('userId', filters.userId)
    if (filters.resourceType) params.set('resourceType', filters.resourceType)
    params.set('page', String(p))
    router.push(`/accounts/audit-log?${params.toString()}`)
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              액션
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">모든 액션</option>
              {actionOptions.map((opt) => (
                <option key={opt.action} value={opt.action}>
                  {ACTION_LABEL[opt.action] ?? opt.action} ({opt.count})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              사용자 ID
            </label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              placeholder="UUID 또는 비워두면 전체"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-xs"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              리소스 타입
            </label>
            <select
              value={filters.resourceType}
              onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">전체</option>
              <option value="User">User</option>
              <option value="Account">Account</option>
              <option value="Session">Session</option>
              <option value="InviteToken">InviteToken</option>
              <option value="ClaimRequest">ClaimRequest</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={applyFilters} size="sm">
              검색
            </Button>
            <Button onClick={resetFilters} variant="outline" size="sm">
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>총 {total.toLocaleString()}건</span>
        <span>
          {page} / {totalPages} 페이지
        </span>
      </div>

      {/* 테이블 */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              감사 로그가 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>시각</TableHead>
                  <TableHead>액션</TableHead>
                  <TableHead>리소스</TableHead>
                  <TableHead>주체</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const isExpanded = expanded.has(log.id)
                  const hasDetails = log.before !== null || log.after !== null
                  return (
                    <>
                      <TableRow
                        key={log.id}
                        className={cn(
                          hasDetails && 'cursor-pointer hover:bg-muted/30',
                        )}
                        onClick={() => hasDetails && toggleExpand(log.id)}
                      >
                        <TableCell>
                          {hasDetails ? (
                            isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <CR className="h-3.5 w-3.5 text-muted-foreground" />
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('ko-KR')}
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-medium">{log.resourceType}</span>
                          <span className="ml-1 font-mono text-muted-foreground">
                            {log.resourceId.slice(0, 8)}...
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.actorName ? (
                            <div>
                              <p className="text-sm font-medium">{log.actorName}</p>
                              <p className="text-xs text-muted-foreground">{log.actorEmail}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">system</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.ipAddress}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${log.id}-detail`}>
                          <TableCell />
                          <TableCell colSpan={5} className="bg-muted/20 py-3">
                            <DetailView log={log} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goPage(page + 1)}
          >
            다음
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const tone = ACTION_TONE[action] ?? 'muted'
  const label = ACTION_LABEL[action] ?? action
  const cls = {
    success: 'bg-success-soft text-success-soft-foreground',
    warning: 'bg-warning-soft text-warning-soft-foreground',
    danger: 'bg-danger-soft text-danger-soft-foreground',
    info: 'bg-info-soft text-info-soft-foreground',
    muted: 'bg-muted text-muted-foreground',
  }[tone]
  return (
    <span className={cn('rounded px-2 py-0.5 text-xs font-medium', cls)}>{label}</span>
  )
}

function DetailView({ log }: { log: LogDto }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {log.before !== null && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">변경 전</p>
            <pre className="overflow-x-auto rounded-md bg-background p-2 text-xs">
              {JSON.stringify(log.before, null, 2)}
            </pre>
          </div>
        )}
        {log.after !== null && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">변경 후</p>
            <pre className="overflow-x-auto rounded-md bg-background p-2 text-xs">
              {JSON.stringify(log.after, null, 2)}
            </pre>
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">UA:</span> {log.userAgent}
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">Resource ID:</span>{' '}
        <span className="font-mono">{log.resourceId}</span>
      </div>
    </div>
  )
}
