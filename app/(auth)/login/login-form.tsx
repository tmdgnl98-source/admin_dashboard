'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle, ShieldCheck } from 'lucide-react'

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  )
}

type Stage = 'credentials' | 'otp'

function LoginFormInner() {
  const params = useSearchParams()
  const next = params.get('next') ?? '/dashboard'

  const [stage, setStage] = useState<Stage>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submitCredentials = async () => {
    if (!email || !password) return
    setError(null)
    setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? '로그인 실패')
        return
      }
      // TODO: 2FA가 사용자에게 활성화돼 있으면 stage='otp'로. 지금은 바로 진입.
      window.location.href = next
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const submitOtp = () => {
    setError(null)
    if (otp.length !== 6) {
      setError('인증코드 6자리를 입력해주세요.')
      return
    }
    window.location.href = next
  }

  return (
    <div className="w-full max-w-sm">
      {/* mobile logo */}
      <div className="mb-8 flex items-center gap-2 md:hidden">
        <Image
          src="/GSchargev_logo.png"
          alt="GS 차지비"
          width={160}
          height={40}
          priority
          className="h-9 w-auto"
        />
        <span className="text-sm text-muted-foreground">파트너 콘솔</span>
      </div>

      {stage === 'credentials' && (
        <>
          <h2 className="text-2xl font-bold tracking-tight">로그인</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            파트너 계정으로 로그인하세요.
          </p>

          <div className="mt-7 space-y-4">
            {error && <ErrorBanner message={error} />}

            <div>
              <label className="mb-1.5 block text-sm font-medium">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                autoComplete="email"
                className={inputCls}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium">비밀번호</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  비밀번호 찾기
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={inputCls}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              로그인 상태 유지
            </label>

            <Button
              onClick={submitCredentials}
              disabled={!email || !password || loading}
              className="h-11 w-full text-base"
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </div>

          <Divider />

          <Button variant="outline" className="h-11 w-full justify-center" disabled>
            SSO로 계속하기 (준비 중)
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            아직 계정이 없으신가요?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              파트너 가입
            </Link>
          </p>
        </>
      )}

      {stage === 'otp' && (
        <>
          <h2 className="text-2xl font-bold tracking-tight">2단계 인증</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            인증 앱(Google Authenticator 등)에 표시된 6자리 코드를 입력하세요.
          </p>

          <div className="mt-7 space-y-4">
            {error && <ErrorBanner message={error} />}

            <div className="flex items-center gap-2 rounded-md bg-info-soft p-3 text-sm text-info-soft-foreground">
              <ShieldCheck className="h-4 w-4" />
              계정 보호를 위해 추가 인증이 필요합니다.
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">인증 코드</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStage('credentials')} className="flex-1 h-11">
                이전
              </Button>
              <Button onClick={submitOtp} disabled={otp.length !== 6} className="flex-1 h-11">
                인증
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              인증 앱에 접근할 수 없나요?{' '}
              <button className="text-primary hover:underline">백업 코드 사용</button>
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger-soft-foreground">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  )
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">또는</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50'
