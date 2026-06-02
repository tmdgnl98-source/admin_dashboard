import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/adapters/db'
import { Mail, Phone, ShieldCheck, KeyRound, Building2, Calendar } from 'lucide-react'
import type { UserRole } from '@/types/navigation'

const ROLE_LABEL: Record<UserRole, string> = {
  main_admin: '본사 운영팀',
  normal_admin: '일반 직원',
  partner_admin: '파트너',
}

export default async function MePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [activeSessionCount, hasTwoFactor, accountCount] = await Promise.all([
    prisma.session.count({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    }),
    prisma.twoFactorAuth.findUnique({ where: { userId: user.id } }).then(Boolean),
    prisma.account.count({ where: { userId: user.id } }),
  ])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="내 프로필" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* 프로필 요약 카드 */}
          <Card className="shadow-sm">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {user.name.slice(0, 1)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  <StatusBadge status="활성" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {ROLE_LABEL[user.role as UserRole]}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 계정 정보 */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">계정 정보</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 pb-5 sm:grid-cols-2">
              <InfoRow icon={Mail} label="이메일" value={user.email} verified={!!user.emailVerifiedAt} />
              <InfoRow icon={Phone} label="휴대폰" value={user.phone} verified={!!user.phoneVerifiedAt} />
              {user.businessNo && (
                <InfoRow icon={Building2} label="사업자번호" value={user.businessNo} />
              )}
              <InfoRow
                icon={Calendar}
                label="마지막 로그인"
                value={user.lastLoginAt ? user.lastLoginAt.toLocaleString('ko-KR') : '—'}
              />
            </CardContent>
          </Card>

          {/* 보안 */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">보안</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              <SecurityRow
                icon={KeyRound}
                label="비밀번호"
                value={`마지막 변경 ${user.passwordChangedAt.toLocaleDateString('ko-KR')}`}
                action="변경"
              />
              <SecurityRow
                icon={ShieldCheck}
                label="2단계 인증"
                value={hasTwoFactor ? '활성화됨' : '비활성'}
                tone={hasTwoFactor ? 'success' : 'warning'}
                action={hasTwoFactor ? '관리' : '설정'}
              />
              <SecurityRow
                icon={ShieldCheck}
                label="활성 세션"
                value={`${activeSessionCount}개 디바이스`}
                action="전체 로그아웃"
              />
            </CardContent>
          </Card>

          {/* 파트너 권한 (있는 경우) */}
          {user.role === 'partner_admin' && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">충전소 권한</CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <p className="text-sm text-muted-foreground">
                  {accountCount}개 충전소에 권한을 갖고 있습니다.{' '}
                  <a href="/stations/list" className="font-medium text-primary hover:underline">
                    충전소 리스트 보기 →
                  </a>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  verified,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  verified?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{value}</span>
          {verified !== undefined && (
            <StatusBadge status={verified ? '활성' : '미가입'} />
          )}
        </p>
      </div>
    </div>
  )
}

function SecurityRow({
  icon: Icon,
  label,
  value,
  tone,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone?: 'success' | 'warning' | 'danger'
  action: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-card p-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p
            className={`text-xs ${
              tone === 'success'
                ? 'text-success'
                : tone === 'warning'
                  ? 'text-warning'
                  : tone === 'danger'
                    ? 'text-danger'
                    : 'text-muted-foreground'
            }`}
          >
            {value}
          </p>
        </div>
      </div>
      <button className="text-sm font-medium text-primary hover:underline">
        {action}
      </button>
    </div>
  )
}
