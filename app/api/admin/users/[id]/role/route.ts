import { NextResponse } from 'next/server'
import { prisma } from '@/lib/adapters/db'
import { requireRole } from '@/lib/auth/server'
import { recordAudit } from '@/lib/audit/log'

const VALID_ROLES = new Set(['main_admin', 'normal_admin', 'partner_admin'])

/** 시스템 권한(role) 변경 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('main_admin')
    const { id } = await params
    const { role } = await req.json()

    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // 본인의 권한을 본인이 강등하는 것은 차단 (system lockout 방지)
    if (actor.id === id && role !== 'main_admin') {
      return NextResponse.json(
        { error: '본인 계정의 main_admin 권한은 본인이 회수할 수 없습니다.' },
        { status: 400 },
      )
    }

    await prisma.user.update({ where: { id }, data: { role } })
    await recordAudit({
      userId: actor.id,
      action: 'user.role_change',
      resourceType: 'User',
      resourceId: id,
      before: { role: target.role },
      after: { role },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Error && e.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[admin/users/role]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
