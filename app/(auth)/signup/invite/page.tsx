'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { AuthHeader } from '@/components/layout/auth-header'
import { CheckCircle2, ShieldCheck, KeyRound, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'

/**
 * 초대 토큰을 통한 빠른 가입 (Track A).
 * 일반 5단계 가입과 달리:
 *   - 사업자정보·충전소매칭은 토큰에 이미 들어있으므로 생략
 *   - 본인인증 + 비밀번호 설정만 진행
 *   - 가입 완료 시 토큰의 station_ids로 Account 자동 생성
 */

// Mock 초대 데이터 — 실제로는 token으로 API 조회
const MOCK_INVITE = {
  companyName: '(주)강남파트너',
  businessNo: '123-45-67890',
  contactName: '홍길동',
  contactPhone: '010-1234-5678',
  email: 'partner@example.com',
  stations: [
    { id: 'CS001', name: '강남 충전소', chargerCount: 4 },
    { id: 'CS128', name: '서초 충전소', chargerCount: 2 },
  ],
  expiresAt: '2026-06-30',
}

export default function InviteSignupPage() {
  return (
    <>
      <AuthHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</div>}>
          <InviteSignupInner />
        </Suspense>
      </main>
    </>
  )
}

function InviteSignupInner() {
  const params = useSearchParams()
  const token = params.get('token') ?? '(no-token)'

  const [step, setStep] = useState<'verify' | 'password' | 'done'>('verify')
  const [identityOk, setIdentityOk] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  if (step === 'done') {
    return (
      <Card className="shadow-sm">
        <CardHeader className="items-center pt-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft">
            <Check className="h-7 w-7 text-success" />
          </div>
          <CardTitle className="mt-4 text-center text-xl">가입이 완료되었습니다</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-8 text-center">
          <p className="text-sm text-muted-foreground">
            {MOCK_INVITE.stations.length}개 충전소에 대한 권한이 부여되었습니다.
            <br />
            로그인 후 바로 운영 현황을 확인하실 수 있습니다.
          </p>
          <Link href="/login">
            <Button className="w-full">로그인</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">파트너 가입</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          초대받으신 정보를 확인하고 가입을 완료하세요.
        </p>
      </div>

      {/* 초대 정보 카드 */}
      <Card className="border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="space-y-3 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">초대받은 사업자</p>
              <p className="text-base font-semibold">{MOCK_INVITE.companyName}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {MOCK_INVITE.businessNo} · {MOCK_INVITE.contactName} · {MOCK_INVITE.contactPhone}
              </p>
            </div>
            <StatusBadge status="활성" />
          </div>
          <div className="rounded-md bg-background/60 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">권한 부여 예정 충전소</p>
            <ul className="space-y-1.5 text-sm">
              {MOCK_INVITE.stations.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  <span>{s.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                  <span className="text-xs text-muted-foreground">· 충전기 {s.chargerCount}대</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            초대 만료일: {MOCK_INVITE.expiresAt} · 토큰: <code className="font-mono">{token}</code>
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="py-6">
          {step === 'verify' && (
            <div className="space-y-5">
              <StepHeader
                icon={ShieldCheck}
                title="본인인증"
                desc="초대받은 담당자 본인 확인을 위해 본인인증을 진행합니다."
              />
              {!identityOk ? (
                <>
                  <div className="rounded-md bg-info-soft p-3 text-sm text-info-soft-foreground">
                    초대 시 등록된 휴대폰 번호({MOCK_INVITE.contactPhone})로 본인인증을 진행하세요.
                  </div>
                  <Button onClick={() => setIdentityOk(true)} className="w-full">
                    본인인증 진행
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-md bg-success-soft p-3 text-sm text-success-soft-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    본인인증이 완료되었습니다.
                  </div>
                  <Button onClick={() => setStep('password')} className="w-full">
                    다음
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 'password' && (
            <div className="space-y-5">
              <StepHeader icon={KeyRound} title="비밀번호 설정" desc="로그인에 사용할 비밀번호를 설정하세요." />
              <div>
                <label className="mb-1.5 block text-sm font-medium">이메일 (로그인 ID)</label>
                <input
                  type="email"
                  value={MOCK_INVITE.email}
                  disabled
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">영문·숫자·기호 포함 10자 이상</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">비밀번호 확인</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-danger">
                    <AlertCircle className="h-3 w-3" /> 비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>
              <Button
                onClick={() => setStep('done')}
                disabled={!(password.length >= 10 && password === passwordConfirm)}
                className="w-full"
              >
                가입 완료
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StepHeader({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md bg-primary/10 p-2 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
