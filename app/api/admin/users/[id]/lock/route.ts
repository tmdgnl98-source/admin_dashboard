import { NextResponse } from 'next/server'
import { prisma } from '@/lib/adapters/db'
import { requireRole } from '@/lib/auth/server'
import { revokeAllSessions } from '@/lib/auth/session'
import { recordAudit } from '@/lib/audit/log'

const LOCK_DURATION_MS = 1000 * 60 * 60 * 24 * 365 * 10 // 사실상 영구 (10년)

/** 계정 잠금 (모든 세션 revoke + lockedUntil 설정) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('main_admin')
    const { id } = await params

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS)
    await prisma.user.update({
      where: { id },
      data: { lockedUntil, failedLoginCount: 0 },
    })
    await revokeAllSessions(id)
    await recordAudit({
      userId: actor.id,
      action: 'user.lock',
      resourceType: 'User',
      resourceId: id,
      before: { lockedUntil: target.lockedUntil },
      after: { lockedUntil },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Error && e.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[admin/users/lock]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** 잠금 해제 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('main_admin')
    const { id } = await params

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await prisma.user.update({
      where: { id },
      data: { lockedUntil: null, failedLoginCount: 0 },
    })
    await recordAudit({
      userId: actor.id,
      action: 'user.unlock',
      resourceType: 'User',
      resourceId: id,
      before: { lockedUntil: target.lockedUntil },
      after: { lockedUntil: null },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Error && e.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[admin/users/unlock]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
