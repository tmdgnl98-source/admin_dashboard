import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth/server'
import { prisma } from '@/lib/adapters/db'
import { MessagingClient } from './messaging-client'

export default async function MessagingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'main_admin') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="메일·문자 발송" />
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

  // 수신자 통계
  const [allCount, mainCount, normalCount, partnerCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'main_admin' } }),
    prisma.user.count({ where: { role: 'normal_admin' } }),
    prisma.user.count({ where: { role: 'partner_admin' } }),
  ])

  // 최근 발송 이력 (AuditLog에서)
  const recent = await prisma.auditLog.findMany({
    where: { action: 'notification.broadcast' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: { select: { name: true, email: true } } },
  })

  const recentDto = recent.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    actorName: r.user?.name ?? 'system',
    after: r.after as {
      audience?: { role?: string; userIds?: string[] }
      channels?: string[]
      subject?: string
      recipientCount?: number
      successCount?: number
      failCount?: number
    } | null,
  }))

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="메일·문자 발송" />
      <div className="flex-1 overflow-y-auto p-6">
        <MessagingClient
          audienceCounts={{
            all: allCount,
            main_admin: mainCount,
            normal_admin: normalCount,
            partner_admin: partnerCount,
          }}
          recent={recentDto}
        />
      </div>
    </div>
  )
}
