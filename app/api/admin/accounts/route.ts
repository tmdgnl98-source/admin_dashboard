import { NextResponse } from 'next/server'
import { prisma } from '@/lib/adapters/db'
import { requireRole } from '@/lib/auth/server'
import { recordAudit } from '@/lib/audit/log'

const VALID_SCOPE = new Set(['owner', 'member', 'viewer'])

/** 충전소 권한 부여 (Account 생성) */
export async function POST(req: Request) {
  try {
    const actor = await requireRole('main_admin')
    const { userId, stationId, scopeRole } = await req.json()

    if (!userId || !stationId || !scopeRole) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
    }
    if (!VALID_SCOPE.has(scopeRole)) {
      return NextResponse.json({ error: 'Invalid scopeRole' }, { status: 400 })
    }

    const account = await prisma.account.upsert({
      where: { userId_stationId: { userId, stationId } },
      update: { scopeRole },
      create: { userId, stationId, scopeRole, invitedByUserId: actor.id },
    })

    await recordAudit({
      userId: actor.id,
      action: 'account.grant',
      resourceType: 'Account',
      resourceId: account.id,
      after: { userId, stationId, scopeRole },
    })

    return NextResponse.json({ ok: true, account })
  } catch (e) {
    return errorResponse(e, '[admin/accounts/POST]')
  }
}

/** 충전소 권한 회수 (Account 삭제) */
export async function DELETE(req: Request) {
  try {
    const actor = await requireRole('main_admin')
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const stationId = searchParams.get('stationId')

    if (!userId || !stationId) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const existing = await prisma.account.findUnique({
      where: { userId_stationId: { userId, stationId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    await prisma.account.delete({ where: { id: existing.id } })
    await recordAudit({
      userId: actor.id,
      action: 'account.revoke',
      resourceType: 'Account',
      resourceId: existing.id,
      before: existing,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e, '[admin/accounts/DELETE]')
  }
}

function errorResponse(e: unknown, tag: string) {
  if (e instanceof Error && e.name === 'UnauthorizedError') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (e instanceof Error && e.name === 'ForbiddenError') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  console.error(tag, e)
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
