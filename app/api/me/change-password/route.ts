import { NextResponse } from 'next/server'
import { prisma } from '@/lib/adapters/db'
import { getCurrentUser } from '@/lib/auth/server'
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/lib/auth/password'
import { revokeAllSessions } from '@/lib/auth/session'
import { recordAudit } from '@/lib/audit/log'

/**
 * 본인 비밀번호 변경.
 * - mustChangePassword=true 인 경우(임시비번 강제변경) 현재 비번 확인은 통과시키지만 검증은 함.
 * - 변경 후 mustChangePassword=false, passwordChangedAt 갱신, 다른 모든 세션 revoke.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { currentPassword, newPassword, newPasswordConfirm } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
    }
    if (newPassword !== newPasswordConfirm) {
      return NextResponse.json({ error: '새 비밀번호 확인이 일치하지 않습니다.' }, { status: 400 })
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: '새 비밀번호는 현재 비밀번호와 달라야 합니다.' }, { status: 400 })
    }
    const strength = validatePasswordStrength(newPassword)
    if (!strength.ok) {
      return NextResponse.json({ error: strength.reason }, { status: 400 })
    }

    const currentOk = await verifyPassword(currentPassword, user.passwordHash)
    if (!currentOk) {
      return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })
    }

    const newHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    })
    // 다른 디바이스의 세션은 모두 revoke. 현재 세션도 일단 revoke되지만 호출부에서 즉시 재로그인 가능.
    await revokeAllSessions(user.id)

    await recordAudit({
      userId: user.id,
      action: 'user.password_change',
      resourceType: 'User',
      resourceId: user.id,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[me/change-password]', e)
    return NextResponse.json({ error: '비밀번호 변경 처리 중 오류' }, { status: 500 })
  }
}
