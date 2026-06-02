import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/adapters/db'
import { AccountsPermissionsClient } from './accounts-permissions-client'

export default async function PermissionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'main_admin') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="계정별 권한 관리" />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="w-full max-w-sm shadow-sm">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              본사 운영팀(main_admin) 권한이 필요합니다.
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: {
        select: {
          accounts: true,
          sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } },
        },
      },
    },
  })

  const dto = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    businessNo: u.businessNo,
    role: u.role,
    lockedUntil: u.lockedUntil?.toISOString() ?? null,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    mustChangePassword: u.mustChangePassword,
    failedLoginCount: u.failedLoginCount,
    accountCount: u._count.accounts,
    activeSessionCount: u._count.sessions,
  }))

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="계정별 권한 관리" />
      <div className="flex-1 overflow-y-auto p-6">
        <AccountsPermissionsClient users={dto} currentUserId={user.id} />
      </div>
    </div>
  )
}
