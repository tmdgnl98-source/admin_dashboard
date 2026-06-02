'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Mail, MessageSquare, AlertCircle, CheckCircle2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type Audience = 'all' | 'main_admin' | 'normal_admin' | 'partner_admin' | 'custom'

interface AudienceCounts {
  all: number
  main_admin: number
  normal_admin: number
  partner_admin: number
}

interface RecentBroadcast {
  id: string
  createdAt: string
  actorName: string
  after: {
    audience?: { role?: string; userIds?: string[] }
    channels?: string[]
    subject?: string
    recipientCount?: number
    successCount?: number
    failCount?: number
  } | null
}

interface Props {
  audienceCounts: AudienceCounts
  recent: RecentBroadcast[]
}

export function MessagingClient({ audienceCounts, recent }: Props) {
  const router = useRouter()
  const [audience, setAudience] = useState<Audience>('partner_admin')
  const [customUserIds, setCustomUserIds] = useState('')
  const [channels, setChannels] = useState<Set<string>>(new Set(['email']))
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<
    | { ok: true; recipientCount: number; successCount: number; failCount: number }
    | { ok: false; error: string }
    | null
  >(null)

  const toggleChannel = (c: string) => {
    const next = new Set(channels)
    if (next.has(c)) next.delete(c)
    else next.add(c)
    setChannels(next)
  }

  const recipientPreview =
    audience === 'all'
      ? `전체 ${audienceCounts.all}명`
      : audience === 'custom'
        ? `직접 지정 ${customUserIds.split(/[\s,]+/).filter(Boolean).length}명`
        : `${roleLabel(audience)} ${audienceCounts[audience]}명`

  const submit = async () => {
    if (!confirm(`${recipientPreview} 에게 ${channels.size}개 채널로 발송합니다. 진행할까요?`)) return
    setLoading(true)
    setResult(null)
    try {
      const audiencePayload: { role?: string; userIds?: string[] } = {}
      if (audience === 'custom') {
        audiencePayload.userIds = customUserIds.split(/[\s,]+/).filter(Boolean)
      } else {
        audiencePayload.role = audience
      }

      const r = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: audiencePayload,
          channels: Array.from(channels),
          subject,
          body,
        }),
      })
      const data = await r.json()
      if (!r.ok) {
        setResult({ ok: false, error: data.error ?? '발송 실패' })
        return
      }
      setResult({
        ok: true,
        recipientCount: data.recipientCount,
        successCount: data.successCount,
        failCount: data.failCount,
      })
      setSubject('')
      setBody('')
      router.refresh()
    } catch {
      setResult({ ok: false, error: '네트워크 오류' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 발송 폼 */}
      <div className="lg:col-span-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4 text-primary" />
              메시지 작성
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pb-6">
            {result?.ok === false && (
              <div className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger-soft-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {result.error}
              </div>
            )}
            {result?.ok === true && (
              <div className="flex items-start gap-2 rounded-md bg-success-soft p-3 text-sm text-success-soft-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {result.recipientCount}명에게 발송 완료.{' '}
                  <span className="font-semibold">성공 {result.successCount}건</span>
                  {result.failCount > 0 && (
                    <>
                      , <span className="font-semibold text-danger">실패 {result.failCount}건</span>
                    </>
                  )}
                </span>
              </div>
            )}

            {/* 수신자 */}
            <div>
              <label className="mb-2 block text-sm font-medium">수신자</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <AudienceOption
                  label="파트너 전체"
                  count={audienceCounts.partner_admin}
                  checked={audience === 'partner_admin'}
                  onClick={() => setAudience('partner_admin')}
                />
                <AudienceOption
                  label="본사 운영팀"
                  count={audienceCounts.main_admin}
                  checked={audience === 'main_admin'}
                  onClick={() => setAudience('main_admin')}
                />
                <AudienceOption
                  label="일반 직원"
                  count={audienceCounts.normal_admin}
                  checked={audience === 'normal_admin'}
                  onClick={() => setAudience('normal_admin')}
                />
                <AudienceOption
                  label="전체"
                  count={audienceCounts.all}
                  checked={audience === 'all'}
                  onClick={() => setAudience('all')}
                />
                <AudienceOption
                  label="직접 지정"
                  count={null}
                  checked={audience === 'custom'}
                  onClick={() => setAudience('custom')}
                />
              </div>
              {audience === 'custom' && (
                <input
                  value={customUserIds}
                  onChange={(e) => setCustomUserIds(e.target.value)}
                  placeholder="사용자 ID를 콤마 또는 공백으로 구분 (UUID)"
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                />
              )}
            </div>

            {/* 채널 */}
            <div>
              <label className="mb-2 block text-sm font-medium">발송 채널 (중복 선택)</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <ChannelOption
                  icon={Mail}
                  label="이메일"
                  checked={channels.has('email')}
                  onClick={() => toggleChannel('email')}
                />
                <ChannelOption
                  icon={MessageSquare}
                  label="SMS"
                  checked={channels.has('sms')}
                  onClick={() => toggleChannel('sms')}
                />
                <ChannelOption
                  icon={MessageSquare}
                  label="카카오톡 알림톡"
                  checked={channels.has('kakao')}
                  onClick={() => toggleChannel('kakao')}
                />
              </div>
            </div>

            {/* 제목 + 본문 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">제목</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="[차지비] ..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">본문</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder={'안녕하세요 {name}님,\n\n... 본문 내용 ...\n\n차지비 운영팀 드림'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                <code>{'{name}'}</code> 변수는 수신자 이름으로 치환됩니다.
              </p>
            </div>

            {/* 발송 */}
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{recipientPreview}</span> · {channels.size}개 채널
                {channels.size > 0 && (
                  <span className="ml-2 text-xs">
                    (총 발송 {audience === 'custom'
                      ? customUserIds.split(/[\s,]+/).filter(Boolean).length * channels.size
                      : (audience === 'all'
                          ? audienceCounts.all
                          : audienceCounts[audience]) * channels.size}
                    건)
                  </span>
                )}
              </div>
              <Button
                onClick={submit}
                disabled={!subject || !body || channels.size === 0 || loading}
                className="gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? '발송 중...' : '발송'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 발송 이력 */}
      <div>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">최근 발송 이력</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                발송 이력이 없습니다.
              </p>
            ) : (
              <div className="divide-y">
                {recent.map((r) => (
                  <div key={r.id} className="px-4 py-3 text-sm">
                    <p className="line-clamp-1 font-medium">
                      {r.after?.subject ?? '(제목 없음)'}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(r.createdAt).toLocaleString('ko-KR')}</span>
                      <span>·</span>
                      <span>{r.actorName}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">
                        {r.after?.audience?.role
                          ? `${roleLabel(r.after.audience.role)}`
                          : `${r.after?.audience?.userIds?.length ?? 0}명`}
                      </span>
                      {r.after?.channels?.map((c) => (
                        <span
                          key={c}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                        >
                          {channelLabel(c)}
                        </span>
                      ))}
                      {r.after?.failCount !== undefined && r.after.failCount > 0 ? (
                        <StatusBadge status="발송실패">{`실패 ${r.after.failCount}`}</StatusBadge>
                      ) : (
                        <StatusBadge status="발송완료" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function roleLabel(r: string): string {
  return {
    all: '전체',
    main_admin: '본사 운영팀',
    normal_admin: '일반 직원',
    partner_admin: '파트너',
  }[r] ?? r
}

function channelLabel(c: string): string {
  return { email: '이메일', sms: 'SMS', kakao: '알림톡', inapp: '인앱' }[c] ?? c
}

function AudienceOption({
  label,
  count,
  checked,
  onClick,
}: {
  label: string
  count: number | null
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md border p-3 text-left transition',
        checked
          ? 'border-primary bg-primary/5'
          : 'border-input bg-background hover:bg-muted/30',
      )}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {count !== null ? `${count}명` : '직접 입력'}
      </p>
    </button>
  )
}

function ChannelOption({
  icon: Icon,
  label,
  checked,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
        checked
          ? 'border-primary bg-primary/5'
          : 'border-input bg-background hover:bg-muted/30',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="h-4 w-4 accent-[var(--primary)] pointer-events-none"
      />
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{label}</span>
    </button>
  )
}
