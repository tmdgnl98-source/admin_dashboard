import { NextResponse } from 'next/server'
import { prisma } from '@/lib/adapters/db'
import { requireRole } from '@/lib/auth/server'
import { hashPassword } from '@/lib/auth/password'
import { generateTempPassword } from '@/lib/auth/temp-password'
import { revokeAllSessions } from '@/lib/auth/session'
import { recordAudit } from '@/lib/audit/log'

/**
 * 운영자가 사용자 비밀번호 재발급.
 * 임시 비번을 생성하고, mustChangePassword=true 로 설정 → 다음 로그인 시 강제 변경.
 * 모든 활성 세션도 revoke.
 *
 * 운영 시에는 임시 비번을 SMS/이메일로 발송 (NotificationAdapter)
 * 지금은 응답에 임시 비번을 그대로 반환 (admin이 직접 사용자에게 전달).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('main_admin')
    const { id } = await params

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const tempPassword = generateTempPassword()
    const passwordHash = await hashPassword(tempPassword)

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    })
    await revokeAllSessions(id)

    await recordAudit({
      userId: actor.id,
      action: 'user.password_reset',
      resourceType: 'User',
      resourceId: id,
    })

    return NextResponse.json({
      ok: true,
      tempPassword,
      note: '사용자에게 안전한 채널로 전달하세요. 다음 로그인 시 변경이 강제됩니다.',
    })
  } catch (e) {
    if (e instanceof Error && e.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[admin/users/password-reset]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

