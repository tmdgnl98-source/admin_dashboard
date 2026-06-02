'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthHeader } from '@/components/layout/auth-header'
import { CheckCircle2, KeyRound } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <>
      <AuthHeader />
      <main className="mx-auto max-w-md space-y-6 px-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">비밀번호 찾기</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          가입한 이메일로 재설정 링크를 보내드립니다.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            이메일 인증
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {sent ? (
            <div className="flex items-start gap-2 rounded-md bg-success-soft p-3 text-sm text-success-soft-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">재설정 링크를 발송했습니다.</p>
                <p className="mt-0.5 text-xs">
                  메일이 도착하지 않았다면 스팸함을 확인하거나 5분 후 다시 시도해주세요.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button onClick={() => setSent(true)} disabled={!email} className="w-full">
                재설정 링크 받기
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          ← 로그인으로 돌아가기
        </Link>
      </p>
      </main>
    </>
  )
}
