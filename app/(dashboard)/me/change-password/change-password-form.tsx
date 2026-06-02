'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'

interface Props {
  forced: boolean
}

export function ChangePasswordForm({ forced }: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError(null)
    if (!current || !next || !confirm) return
    if (next !== confirm) {
      setError('새 비밀번호 확인이 일치하지 않습니다.')
      return
    }
    setLoading(true)
    try {
      const r = await fetch('/api/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
          newPasswordConfirm: confirm,
        }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? '변경 실패')
        return
      }
      setDone(true)
      // 모든 세션이 revoke되므로 잠시 후 로그인 페이지로 이동
      setTimeout(() => router.replace('/login'), 2500)
    } catch {
      setError('네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <Card className="shadow-sm">
        <CardContent className="space-y-3 py-10 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <p className="text-base font-semibold">비밀번호가 변경되었습니다.</p>
          <p className="text-xs text-muted-foreground">
            보안을 위해 모든 디바이스에서 로그아웃됩니다.
            <br />
            새 비밀번호로 다시 로그인해주세요.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-primary" />
          비밀번호 변경
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {forced && (
          <div className="flex items-start gap-2 rounded-md bg-warning-soft p-3 text-sm text-warning-soft-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">초기 비밀번호 변경이 필요합니다.</p>
              <p className="mt-0.5 text-xs">
                안전한 서비스 이용을 위해 비밀번호를 변경한 후 사용해주세요.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger-soft-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {forced ? '임시 비밀번호' : '현재 비밀번호'}
          </label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">새 비밀번호</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            영문, 숫자, 특수문자 포함 10자 이상
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">새 비밀번호 확인</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={inputCls}
          />
        </div>

        <Button
          onClick={submit}
          disabled={!current || !next || !confirm || loading}
          className="h-11 w-full"
        >
          {loading ? '변경 중...' : '비밀번호 변경'}
        </Button>
      </CardContent>
    </Card>
  )
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50'
