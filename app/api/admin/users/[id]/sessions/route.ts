import { NextResponse } from 'next/server'
import { prisma } from '@/lib/adapters/db'
import { requireRole } from '@/lib/auth/server'
import { revokeAllSessions } from '@/lib/auth/session'
import { recordAudit } from '@/lib/audit/log'

/** 사용자의 모든 활성 세션 강제 로그아웃 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('main_admin')
    const { id } = await params

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const before = await prisma.session.count({
      where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } },
    })
    await revokeAllSessions(id)
    await recordAudit({
      userId: actor.id,
      action: 'user.force_logout',
      resourceType: 'User',
      resourceId: id,
      after: { revokedSessions: before },
    })

    return NextResponse.json({ ok: true, revokedSessions: before })
  } catch (e) {
    if (e instanceof Error && e.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[admin/users/sessions]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
