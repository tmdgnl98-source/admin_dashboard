'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Copy,
  UserPlus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/navigation'

type ScopeRole = 'owner' | 'member' | 'viewer'

interface Props {
  stations: Array<{ id: string; name: string }>
}

interface CreateResult {
  ok: boolean
  user?: { id: string; email: string; name: string }
  tempPassword?: string
  sendResults?: Array<{ channel: string; ok: boolean; reason?: string }>
  error?: string
}

export function NewAccountForm({ stations }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('partner_admin')
  const [businessNo, setBusinessNo] = useState('')
  const [stationGrants, setStationGrants] = useState<Array<{ stationId: string; scopeRole: ScopeRole }>>([])
  const [sendEmail, setSendEmail] = useState(true)
  const [sendSms, setSendSms] = useState(false)
  const [sendKakao, setSendKakao] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreateResult | null>(null)

  const addStation = () => {
    const available = stations.find((s) => !stationGrants.some((g) => g.stationId === s.id))
    if (available) setStationGrants([...stationGrants, { stationId: available.id, scopeRole: 'member' }])
  }

  const removeStation = (stationId: string) =>
    setStationGrants(stationGrants.filter((g) => g.stationId !== stationId))

  const updateStation = (stationId: string, updates: Partial<{ stationId: string; scopeRole: ScopeRole }>) =>
    setStationGrants(
      stationGrants.map((g) => (g.stationId === stationId ? { ...g, ...updates } : g)),
    )

  const submit = async () => {
    setError(null)
    setLoading(true)
    try {
      const channels: string[] = []
      if (sendEmail) channels.push('email')
      if (sendSms) channels.push('sms')
      if (sendKakao) channels.push('kakao')

      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          role,
          businessNo: role === 'partner_admin' ? businessNo : undefined,
          stationGrants: stationGrants.length > 0 ? stationGrants : undefined,
          sendChannels: channels,
        }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? '계정 생성 실패')
        return
      }
      setResult(data)
    } catch {
      setError('네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setName('')
    setEmail('')
    setPhone('')
    setBusinessNo('')
    setStationGrants([])
    setResult(null)
    setError(null)
    router.refresh()
  }

  if (result?.ok) {
    return <SuccessView result={result} onReset={reset} />
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4 text-primary" />
          신규 계정 등록
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        {error && (
          <div className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger-soft-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* 기본 정보 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="이름 *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className={inputCls}
            />
          </Field>
          <Field label="권한 *">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={inputCls}
            >
              <option value="partner_admin">파트너 (충전소 소유주)</option>
              <option value="normal_admin">일반 직원</option>
              <option value="main_admin">본사 운영팀</option>
            </select>
          </Field>
          <Field label="이메일 *" hint="로그인 ID로 사용됩니다">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className={inputCls}
            />
          </Field>
          <Field label="휴대폰 *">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className={inputCls}
            />
          </Field>
          {role === 'partner_admin' && (
            <Field label="사업자번호 *" hint="파트너만 입력">
              <input
                value={businessNo}
                onChange={(e) => setBusinessNo(e.target.value)}
                placeholder="000-00-00000"
                className={inputCls}
              />
            </Field>
          )}
        </div>

        {/* 충전소 권한 (파트너만) */}
        {role === 'partner_admin' && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">충전소 권한 (선택)</label>
              <Button variant="outline" size="sm" onClick={addStation} className="gap-1">
                <UserPlus className="h-3.5 w-3.5" />
                추가
              </Button>
            </div>
            {stationGrants.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                나중에 충전소별 계정 관리 페이지에서 부여할 수도 있습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {stationGrants.map((g) => (
                  <div key={g.stationId} className="flex items-center gap-2">
                    <select
                      value={g.stationId}
                      onChange={(e) => updateStation(g.stationId, { stationId: e.target.value })}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.id})
                        </option>
                      ))}
                    </select>
                    <select
                      value={g.scopeRole}
                      onChange={(e) =>
                        updateStation(g.stationId, { scopeRole: e.target.value as ScopeRole })
                      }
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="owner">Owner</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => removeStation(g.stationId)}
                      className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 임시비번 발송 */}
        <div>
          <p className="mb-2 text-sm font-medium">임시 비밀번호 안내 발송</p>
          <p className="mb-3 text-xs text-muted-foreground">
            계정 생성 시 임시 비밀번호가 자동 생성됩니다. 어떤 채널로 사용자에게 안내할까요?
          </p>
          <div className="space-y-2">
            <ChannelOption
              icon={Mail}
              label="이메일"
              hint={email || '입력한 이메일로'}
              checked={sendEmail}
              onChange={setSendEmail}
            />
            <ChannelOption
              icon={MessageSquare}
              label="SMS"
              hint={phone || '입력한 휴대폰으로'}
              checked={sendSms}
              onChange={setSendSms}
            />
            <ChannelOption
              icon={MessageSquare}
              label="카카오톡 알림톡"
              hint="카카오톡 비즈메시지"
              checked={sendKakao}
              onChange={setSendKakao}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            발송 외에도 생성 직후 화면에서 임시 비밀번호를 복사하여 직접 전달할 수 있습니다.
          </p>
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Link href="/accounts/permissions" className="flex-1">
            <Button variant="outline" className="w-full">
              취소
            </Button>
          </Link>
          <Button
            onClick={submit}
            disabled={!name || !email || !phone || (role === 'partner_admin' && !businessNo) || loading}
            className="flex-1"
          >
            {loading ? '생성 중...' : '계정 생성'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SuccessView({ result, onReset }: { result: CreateResult; onReset: () => void }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (!result.tempPassword) return
    navigator.clipboard.writeText(result.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-5 py-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-success-soft p-2">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-base font-semibold">계정이 생성되었습니다</p>
            <p className="text-sm text-muted-foreground">
              {result.user?.name} ({result.user?.email})
            </p>
          </div>
        </div>

        {/* 임시 비밀번호 카드 */}
        <div className="rounded-lg border-2 border-dashed border-warning/40 bg-warning-soft/40 p-4">
          <p className="mb-2 text-xs font-medium text-warning-soft-foreground">
            🔑 임시 비밀번호 (사용자에게 안전한 채널로 전달)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-base">
              {result.tempPassword}
            </code>
            <Button variant="outline" size="sm" onClick={copy} className="gap-1">
              <Copy className="h-3.5 w-3.5" />
              {copied ? '복사됨' : '복사'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            첫 로그인 시 비밀번호 변경이 강제됩니다. 이 화면을 벗어나면 다시 볼 수 없습니다.
          </p>
        </div>

        {/* 발송 결과 */}
        {result.sendResults && result.sendResults.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">안내 발송 결과</p>
            <div className="space-y-1">
              {result.sendResults.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <span>{channelLabel(s.channel)}</span>
                  {s.ok ? (
                    <StatusBadge status="발송완료" />
                  ) : (
                    <StatusBadge status="발송실패" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 border-t pt-4">
          <Button variant="outline" onClick={onReset} className="flex-1">
            한 명 더 등록
          </Button>
          <Link href="/accounts/permissions" className="flex-1">
            <Button className="w-full">계정 목록으로</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function channelLabel(c: string): string {
  return { email: '이메일', sms: 'SMS', kakao: '카카오톡 알림톡', inapp: '인앱' }[c] ?? c
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ChannelOption({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-md border p-3 transition',
        checked ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted/30',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </label>
  )
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50'
