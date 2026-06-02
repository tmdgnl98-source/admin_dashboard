import { NextResponse } from 'next/server'
import { prisma } from '@/lib/adapters/db'
import { requireRole } from '@/lib/auth/server'
import { notificationAdapter } from '@/lib/adapters/notification'
import type { NotificationChannel } from '@/lib/adapters/notification'
import { recordAudit } from '@/lib/audit/log'

const VALID_CHANNELS: NotificationChannel[] = ['email', 'sms', 'kakao']

/**
 * 운영자가 임의의 메시지를 다수에게 발송.
 * 수신자 선택 방법:
 *   - role: 'main_admin' | 'normal_admin' | 'partner_admin' | 'all'
 *   - userIds: 특정 사용자 ID 배열
 */
export async function POST(req: Request) {
  try {
    const actor = await requireRole('main_admin')
    const body = await req.json()
    const {
      audience,    // { role?: 'main_admin'|'normal_admin'|'partner_admin'|'all', userIds?: string[] }
      channels,
      subject,
      body: messageBody,
    } = body as {
      audience: { role?: string; userIds?: string[] }
      channels: NotificationChannel[]
      subject: string
      body: string
    }

    if (!subject || !messageBody) {
      return NextResponse.json({ error: '제목과 본문은 필수입니다.' }, { status: 400 })
    }
    const validChannels = (channels ?? []).filter((c) => VALID_CHANNELS.includes(c))
    if (validChannels.length === 0) {
      return NextResponse.json({ error: '최소 1개 채널 선택 필요' }, { status: 400 })
    }

    // 수신자 조회
    let where: Record<string, unknown> = {}
    if (audience.userIds && audience.userIds.length > 0) {
      where = { id: { in: audience.userIds } }
    } else if (audience.role && audience.role !== 'all') {
      where = { role: audience.role }
    }
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true },
    })

    if (users.length === 0) {
      return NextResponse.json({ error: '수신자가 없습니다.' }, { status: 400 })
    }

    // 메시지 빌드 (수신자 × 채널 cartesian)
    const messages = users.flatMap((u) =>
      validChannels.map((channel) => ({
        type: 'announcement' as const,
        channel,
        to: channel === 'email' ? u.email : u.phone,
        subject,
        body: messageBody.replace(/\{name\}/g, u.name),
      })),
    )

    const results = await notificationAdapter.sendBatch(messages)
    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    await recordAudit({
      userId: actor.id,
      action: 'notification.broadcast',
      resourceType: 'Notification',
      resourceId: `bc-${Date.now()}`,
      after: {
        audience,
        channels: validChannels,
        subject,
        recipientCount: users.length,
        successCount,
        failCount,
      },
    })

    return NextResponse.json({
      ok: true,
      recipientCount: users.length,
      messageCount: messages.length,
      successCount,
      failCount,
    })
  } catch (e) {
    if (e instanceof Error && e.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[admin/notifications/send]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
