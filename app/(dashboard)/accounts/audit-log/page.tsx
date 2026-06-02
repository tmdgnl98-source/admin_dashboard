import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/adapters/db'
import { AuditLogClient } from './audit-log-client'

interface PageProps {
  searchParams: Promise<{
    action?: string
    userId?: string
    resourceType?: string
    page?: string
  }>
}

const PAGE_SIZE = 50

export default async function AuditLogPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'main_admin') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="감사 로그" />
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

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const where: Record<string, string> = {}
  if (sp.action) where.action = sp.action
  if (sp.userId) where.userId = sp.userId
  if (sp.resourceType) where.resourceType = sp.resourceType

  const [logs, total, actionCounts] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 20,
    }),
  ])

  const dto = logs.map((l) => ({
    id: l.id,
    action: l.action,
    resourceType: l.resourceType,
    resourceId: l.resourceId,
    actorName: l.user?.name ?? null,
    actorEmail: l.user?.email ?? null,
    userId: l.userId,
    ipAddress: l.ipAddress,
    userAgent: l.userAgent,
    before: l.before,
    after: l.after,
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="감사 로그" />
      <div className="flex-1 overflow-y-auto p-6">
        <AuditLogClient
          logs={dto}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          actionOptions={actionCounts.map((a) => ({ action: a.action, count: a._count.action }))}
          currentFilters={{
            action: sp.action ?? '',
            userId: sp.userId ?? '',
            resourceType: sp.resourceType ?? '',
          }}
        />
      </div>
    </div>
  )
}
