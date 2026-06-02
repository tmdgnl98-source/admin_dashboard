'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Stepper } from '@/components/ui/stepper'
import { StatusBadge } from '@/components/ui/status-badge'
import { AuthHeader } from '@/components/layout/auth-header'
import {
  Check,
  CheckCircle2,
  ShieldCheck,
  Building2,
  KeyRound,
  Zap,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

const STEPS = ['본인인증', '사업자정보', '계정설정', '충전소매칭', '증빙'] as const

// ─── 가입 흐름 상태 ──────────────────────────────────────────────────

interface SignupState {
  identity?: { name: string; phone: string; birthDate: string; verified: boolean }
  business?: { businessNo: string; companyName: string; representative: string; verified: boolean }
  account?: { email: string; password: string; passwordConfirm: string; agreeTerms: boolean; agreePrivacy: boolean; agreeMarketing: boolean }
  stations?: { selectedIds: string[]; manualIds: string[] }
  evidence?: { needed: boolean; files: string[] }
}

// Mock 후보 충전소 — 사업자번호 매칭 결과 시뮬레이션
const MOCK_CANDIDATES = [
  { id: 'CS001', name: '강남 충전소', address: '서울 강남구 테헤란로 152', chargerCount: 4 },
  { id: 'CS128', name: '서초 충전소', address: '서울 서초구 강남대로 373', chargerCount: 2 },
]

export default function SignupPage() {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<SignupState>({})
  const [done, setDone] = useState(false)

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const goPrev = () => setStep((s) => Math.max(s - 1, 0))
  const finish = () => setDone(true)

  if (done)
    return (
      <>
        <AuthHeader />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <SignupDoneCard state={state} />
        </main>
      </>
    )

  return (
    <>
      <AuthHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">파트너 회원가입</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GS차지비 차지비 운영 콘솔에 오신 것을 환영합니다.
        </p>
      </div>

      <Stepper steps={STEPS as unknown as string[]} current={step} />

      <Card className="shadow-sm">
        <CardContent className="py-6">
          {step === 0 && <StepIdentity state={state} setState={setState} onNext={goNext} />}
          {step === 1 && <StepBusiness state={state} setState={setState} onNext={goNext} onPrev={goPrev} />}
          {step === 2 && <StepAccount state={state} setState={setState} onNext={goNext} onPrev={goPrev} />}
          {step === 3 && <StepStations state={state} setState={setState} onNext={goNext} onPrev={goPrev} />}
          {step === 4 && <StepEvidence state={state} setState={setState} onPrev={goPrev} onFinish={finish} />}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        이미 가입하셨나요?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          로그인
        </Link>
      </p>
      </main>
    </>
  )
}

// ─── Step 1. 본인인증 ────────────────────────────────────────────────

function StepIdentity({
  state,
  setState,
  onNext,
}: {
  state: SignupState
  setState: (s: SignupState | ((s: SignupState) => SignupState)) => void
  onNext: () => void
}) {
  const [name, setName] = useState(state.identity?.name ?? '')
  const [phone, setPhone] = useState(state.identity?.phone ?? '')
  const [birthDate, setBirthDate] = useState(state.identity?.birthDate ?? '')
  const verified = state.identity?.verified ?? false

  const startVerify = () => {
    // Mock: NICE 본인인증 팝업 대체. 항상 성공.
    setState((s) => ({
      ...s,
      identity: { name, phone, birthDate, verified: true },
    }))
  }

  return (
    <div className="space-y-5">
      <StepHeader icon={ShieldCheck} title="본인인증" desc="휴대폰 본인인증으로 신원을 확인합니다." />

      <Field label="닉네임">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          className={inputCls}
          disabled={verified}
        />
      </Field>
      <Field label="생년월일">
        <input
          type="text"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          placeholder="YYYY-MM-DD"
          className={inputCls}
          disabled={verified}
        />
      </Field>
      <Field label="휴대폰 번호">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          className={inputCls}
          disabled={verified}
        />
      </Field>

      {!verified ? (
        <Button onClick={startVerify} disabled={!name || !phone || !birthDate} className="w-full">
          본인인증 진행
        </Button>
      ) : (
        <div className="flex items-center gap-2 rounded-md bg-success-soft p-3 text-sm text-success-soft-foreground">
          <CheckCircle2 className="h-4 w-4" />
          본인인증이 완료되었습니다.
        </div>
      )}

      <StepNav onNext={onNext} canNext={verified} />
    </div>
  )
}

// ─── Step 2. 사업자정보 ───────────────────────────────────────────────

function StepBusiness({
  state,
  setState,
  onNext,
  onPrev,
}: {
  state: SignupState
  setState: (s: SignupState | ((s: SignupState) => SignupState)) => void
  onNext: () => void
  onPrev: () => void
}) {
  const [businessNo, setBusinessNo] = useState(state.business?.businessNo ?? '')
  const [companyName, setCompanyName] = useState(state.business?.companyName ?? '')
  const [representative, setRepresentative] = useState(state.business?.representative ?? '')
  const verified = state.business?.verified ?? false

  const verify = () => {
    // Mock: 국세청 사업자번호 진위확인 API 대체
    setState((s) => ({
      ...s,
      business: {
        businessNo,
        companyName: companyName || '(주)차지비 파트너',
        representative: representative || state.identity?.name || '홍길동',
        verified: true,
      },
    }))
  }

  return (
    <div className="space-y-5">
      <StepHeader icon={Building2} title="사업자 정보" desc="사업자번호 진위확인을 진행합니다." />

      <Field label="사업자등록번호">
        <input
          type="text"
          value={businessNo}
          onChange={(e) => setBusinessNo(e.target.value)}
          placeholder="000-00-00000"
          className={inputCls}
          disabled={verified}
        />
      </Field>
      <Field label="상호 (법인명)">
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="(주)○○○"
          className={inputCls}
          disabled={verified}
        />
      </Field>
      <Field label="대표자명">
        <input
          type="text"
          value={representative}
          onChange={(e) => setRepresentative(e.target.value)}
          placeholder="홍길동"
          className={inputCls}
          disabled={verified}
        />
      </Field>

      {!verified ? (
        <Button onClick={verify} disabled={!businessNo} className="w-full">
          사업자 진위확인
        </Button>
      ) : (
        <div className="flex items-center gap-2 rounded-md bg-success-soft p-3 text-sm text-success-soft-foreground">
          <CheckCircle2 className="h-4 w-4" />
          사업자 정보가 확인되었습니다 — {state.business?.companyName}
        </div>
      )}

      <StepNav onNext={onNext} onPrev={onPrev} canNext={verified} />
    </div>
  )
}

// ─── Step 3. 계정 설정 ────────────────────────────────────────────────

function StepAccount({
  state,
  setState,
  onNext,
  onPrev,
}: {
  state: SignupState
  setState: (s: SignupState | ((s: SignupState) => SignupState)) => void
  onNext: () => void
  onPrev: () => void
}) {
  const [email, setEmail] = useState(state.account?.email ?? '')
  const [password, setPassword] = useState(state.account?.password ?? '')
  const [passwordConfirm, setPasswordConfirm] = useState(state.account?.passwordConfirm ?? '')
  const [agreeTerms, setAgreeTerms] = useState(state.account?.agreeTerms ?? false)
  const [agreePrivacy, setAgreePrivacy] = useState(state.account?.agreePrivacy ?? false)
  const [agreeMarketing, setAgreeMarketing] = useState(state.account?.agreeMarketing ?? false)

  const pwdMatch = password.length > 0 && password === passwordConfirm
  const pwdStrong = password.length >= 10
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const canNext = emailValid && pwdMatch && pwdStrong && agreeTerms && agreePrivacy

  const next = () => {
    setState((s) => ({
      ...s,
      account: { email, password, passwordConfirm, agreeTerms, agreePrivacy, agreeMarketing },
    }))
    onNext()
  }

  return (
    <div className="space-y-5">
      <StepHeader icon={KeyRound} title="계정 설정" desc="로그인에 사용할 이메일과 비밀번호를 설정합니다." />

      <Field label="이메일 (로그인 ID)">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className={inputCls}
        />
      </Field>
      <Field label="비밀번호" hint="영문·숫자·기호 포함 10자 이상">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="비밀번호 확인">
        <input
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className={inputCls}
        />
        {passwordConfirm && !pwdMatch && (
          <p className="mt-1 text-xs text-danger">비밀번호가 일치하지 않습니다.</p>
        )}
      </Field>

      <div className="space-y-2 rounded-md border bg-muted/30 p-4">
        <CheckboxRow
          checked={agreeTerms}
          onChange={setAgreeTerms}
          label="[필수] 서비스 이용약관 동의"
        />
        <CheckboxRow
          checked={agreePrivacy}
          onChange={setAgreePrivacy}
          label="[필수] 개인정보 수집·이용 동의"
        />
        <CheckboxRow
          checked={agreeMarketing}
          onChange={setAgreeMarketing}
          label="[선택] 마케팅 정보 수신 동의"
        />
      </div>

      <StepNav onNext={next} onPrev={onPrev} canNext={canNext} />
    </div>
  )
}

// ─── Step 4. 충전소 매칭 ─────────────────────────────────────────────

function StepStations({
  state,
  setState,
  onNext,
  onPrev,
}: {
  state: SignupState
  setState: (s: SignupState | ((s: SignupState) => SignupState)) => void
  onNext: () => void
  onPrev: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    state.stations?.selectedIds ?? MOCK_CANDIDATES.map((c) => c.id),
  )
  const [manualId, setManualId] = useState('')
  const [manualIds, setManualIds] = useState<string[]>(state.stations?.manualIds ?? [])

  const toggle = (id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  const addManual = () => {
    if (manualId && !manualIds.includes(manualId)) {
      setManualIds([...manualIds, manualId])
      setManualId('')
    }
  }

  const next = () => {
    setState((s) => ({ ...s, stations: { selectedIds, manualIds } }))
    onNext()
  }

  const evidenceNeeded = manualIds.length > 0

  return (
    <div className="space-y-5">
      <StepHeader
        icon={Zap}
        title="충전소 매칭"
        desc={`${state.business?.companyName ?? '귀하'} 명의로 등록된 충전소를 확인하세요.`}
      />

      {/* 자동 매칭 */}
      <div>
        <p className="mb-2 text-sm font-medium">자동 매칭 결과</p>
        <p className="mb-3 text-xs text-muted-foreground">
          사업자번호 {state.business?.businessNo} 로 매칭된 충전소입니다.
        </p>
        <div className="space-y-2">
          {MOCK_CANDIDATES.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border bg-card p-3 hover:bg-muted/30"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={() => toggle(c.id)}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.address}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">충전기 {c.chargerCount}대</p>
              </div>
              <StatusBadge status="활성" />
            </label>
          ))}
        </div>
      </div>

      {/* 수동 입력 */}
      <div className="rounded-md border border-dashed p-4">
        <p className="text-sm font-medium">목록에 없는 충전소가 있나요?</p>
        <p className="mb-3 text-xs text-muted-foreground">
          충전소ID를 직접 입력하세요. 운영자 승인 후 권한이 부여됩니다.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="CS000"
            className={inputCls}
          />
          <Button variant="outline" onClick={addManual} disabled={!manualId}>
            추가
          </Button>
        </div>
        {manualIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {manualIds.map((id) => (
              <span key={id} className="rounded-full bg-warning-soft px-3 py-1 text-xs text-warning-soft-foreground">
                {id} · 승인대기 예정
              </span>
            ))}
          </div>
        )}
      </div>

      {evidenceNeeded && (
        <div className="rounded-md bg-info-soft p-3 text-sm text-info-soft-foreground">
          수동 입력 충전소가 있어 다음 단계에서 증빙서류 업로드가 필요합니다.
        </div>
      )}

      <StepNav
        onNext={() => {
          setState((s) => ({ ...s, evidence: { needed: evidenceNeeded, files: [] } }))
          next()
        }}
        onPrev={onPrev}
        canNext={selectedIds.length > 0 || manualIds.length > 0}
        nextLabel={evidenceNeeded ? '다음: 증빙 업로드' : '가입 완료'}
      />
    </div>
  )
}

// ─── Step 5. 증빙 ────────────────────────────────────────────────────

function StepEvidence({
  state,
  setState,
  onPrev,
  onFinish,
}: {
  state: SignupState
  setState: (s: SignupState | ((s: SignupState) => SignupState)) => void
  onPrev: () => void
  onFinish: () => void
}) {
  const [files, setFiles] = useState<string[]>(state.evidence?.files ?? [])
  const needed = state.evidence?.needed ?? false

  const addFile = () => {
    const name = `증빙서류_${Date.now().toString().slice(-4)}.pdf`
    setFiles((fs) => [...fs, name])
  }

  if (!needed) {
    return (
      <div className="space-y-5">
        <StepHeader icon={FileText} title="증빙 업로드" desc="추가 서류가 필요하지 않습니다." />
        <div className="rounded-md bg-success-soft p-4 text-sm text-success-soft-foreground">
          모든 충전소가 자동 매칭되었습니다. 바로 가입을 완료할 수 있습니다.
        </div>
        <StepNav onPrev={onPrev} onNext={onFinish} canNext nextLabel="가입 완료" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <StepHeader
        icon={FileText}
        title="증빙 업로드"
        desc="수동 입력하신 충전소의 소유 증빙을 업로드해주세요."
      />

      <div className="rounded-md border bg-muted/30 p-4 text-sm">
        <p className="mb-2 font-medium">아래 중 하나 이상을 업로드</p>
        <ul className="ml-5 list-disc space-y-0.5 text-xs text-muted-foreground">
          <li>사업자등록증</li>
          <li>충전소 임대차계약서 또는 부동산 등기부등본</li>
          <li>차지비와 체결된 충전기 운영 계약서</li>
        </ul>
      </div>

      <div>
        <Button variant="outline" onClick={addFile} className="w-full">
          + 파일 추가 (mock)
        </Button>
        {files.length > 0 && (
          <ul className="mt-3 space-y-1">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-xs"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  {f}
                </span>
                <button
                  onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-danger"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <StepNav
        onPrev={onPrev}
        onNext={() => {
          setState((s) => ({ ...s, evidence: { needed: true, files } }))
          onFinish()
        }}
        canNext={files.length > 0}
        nextLabel="가입 신청 완료"
      />
    </div>
  )
}

// ─── 완료 화면 ───────────────────────────────────────────────────────

function SignupDoneCard({ state }: { state: SignupState }) {
  const needsApproval = (state.evidence?.needed ?? false) || (state.stations?.manualIds.length ?? 0) > 0
  return (
    <Card className="shadow-sm">
      <CardHeader className="items-center pt-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft">
          <Check className="h-7 w-7 text-success" />
        </div>
        <CardTitle className="mt-4 text-center text-xl">
          {needsApproval ? '가입 신청이 접수되었습니다' : '가입이 완료되었습니다'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-8 text-center">
        {needsApproval ? (
          <p className="text-sm text-muted-foreground">
            제출하신 증빙을 운영팀이 확인한 후 영업일 기준 1-3일 내에 결과를 알려드립니다.
            <br />
            결과는 이메일과 SMS로 발송됩니다.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            지금 바로 로그인하여 보유 충전소를 확인하실 수 있습니다.
          </p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/login">
            <Button className="w-full">로그인 하러 가기</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── 공통 ───────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60'

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

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
      {label}
    </label>
  )
}

function StepNav({
  onNext,
  onPrev,
  canNext,
  nextLabel = '다음',
}: {
  onNext?: () => void
  onPrev?: () => void
  canNext?: boolean
  nextLabel?: string
}) {
  return (
    <div className="flex justify-between pt-2">
      {onPrev ? (
        <Button variant="outline" onClick={onPrev}>
          이전
        </Button>
      ) : (
        <span />
      )}
      {onNext && (
        <Button onClick={onNext} disabled={!canNext}>
          {nextLabel}
        </Button>
      )}
    </div>
  )
}
