import { NextResponse } from 'next/server'
import { prisma } from '@/lib/adapters/db'
import { requireRole } from '@/lib/auth/server'
import { hashPassword } from '@/lib/auth/password'
import { generateTempPassword } from '@/lib/auth/temp-password'
import { notificationAdapter } from '@/lib/adapters/notification'
import type { NotificationChannel } from '@/lib/adapters/notification'
import { recordAudit } from '@/lib/audit/log'

const VALID_ROLES = new Set(['main_admin', 'normal_admin', 'partner_admin'])
const VALID_CHANNELS: NotificationChannel[] = ['email', 'sms', 'kakao']

/**
 * 운영자가 신규 계정을 직접 생성.
 * - 임시비번 자동 생성, mustChangePassword=true 로 설정 → 첫 로그인 시 강제 변경
 * - 선택한 채널(이메일/SMS/카카오톡)로 안내 메시지 자동 발송
 * - 응답에 임시비번도 함께 반환 (운영자가 직접 전달도 가능)
 *
 * 옵션으로 충전소 권한도 동시에 부여 가능.
 */
export async function POST(req: Request) {
  try {
    const actor = await requireRole('main_admin')
    const body = await req.json()
    const {
      email,
      name,
      phone,
      role,
      businessNo,
      stationGrants,    // [{ stationId, scopeRole }]
      sendChannels,     // ['email', 'sms', 'kakao']
    } = body as {
      email: string
      name: string
      phone: string
      role: string
      businessNo?: string
      stationGrants?: Array<{ stationId: string; scopeRole: 'owner' | 'member' | 'viewer' }>
      sendChannels?: NotificationChannel[]
    }

    if (!email || !name || !phone || !role) {
      return NextResponse.json({ error: '이메일, 이름, 휴대폰, 권한은 필수입니다.' }, { status: 400 })
    }
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: '유효하지 않은 권한' }, { status: 400 })
    }
    if (role === 'partner_admin' && !businessNo) {
      return NextResponse.json({ error: '파트너는 사업자번호가 필수입니다.' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 409 })
    }

    const tempPassword = generateTempPassword()
    const passwordHash = await hashPassword(tempPassword)

    const created = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        role: role as 'main_admin' | 'normal_admin' | 'partner_admin',
        businessNo: businessNo || null,
        passwordHash,
        mustChangePassword: true,
        emailVerifiedAt: new Date(), // 운영자가 직접 등록한 것이므로 검증 완료로 간주
      },
    })

    // 충전소 권한 동시 부여
    if (stationGrants && stationGrants.length > 0) {
      await prisma.account.createMany({
        data: stationGrants.map((g) => ({
          userId: created.id,
          stationId: g.stationId,
          scopeRole: g.scopeRole,
          invitedByUserId: actor.id,
        })),
        skipDuplicates: true,
      })
    }

    // 알림 발송
    const channels = (sendChannels ?? []).filter((c) => VALID_CHANNELS.includes(c))
    const sendResults: Array<{ channel: NotificationChannel; ok: boolean; reason?: string }> = []

    if (channels.length > 0) {
      const subject = '[차지비] 파트너 콘솔 계정이 발급되었습니다'
      const body = renderInviteBody({ name, email, tempPassword, role })
      const messages = channels.map((channel) => ({
        type: 'invite' as const,
        channel,
        to: channel === 'email' ? email : phone,
        subject,
        body,
      }))
      const results = await notificationAdapter.sendBatch(messages)
      results.forEach((r, i) => {
        sendResults.push({
          channel: channels[i],
          ok: r.success,
          reason: r.failureReason,
        })
      })
    }

    await recordAudit({
      userId: actor.id,
      action: 'user.create',
      resourceType: 'User',
      resourceId: created.id,
      after: { email, name, role, businessNo, sentChannels: channels },
    })

    return NextResponse.json({
      ok: true,
      user: {
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
      },
      tempPassword,
      sendResults,
    })
  } catch (e) {
    if (e instanceof Error && e.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e instanceof Error && e.name === 'ForbiddenError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('[admin/users/POST]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function renderInviteBody(opts: { name: string; email: string; tempPassword: string; role: string }): string {
  return `${opts.name}님, 차지비 파트너 콘솔 계정이 발급되었습니다.

  로그인 URL: https://admin.chargev.co.kr/login
  이메일: ${opts.email}
  임시 비밀번호: ${opts.tempPassword}

  보안을 위해 첫 로그인 시 비밀번호 변경이 필요합니다.
  문의: 1544-4279 / 평일 09:00-18:00`
}
