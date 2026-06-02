import Image from 'next/image'
import { Megaphone, Phone, Activity } from 'lucide-react'
import { noticeAdapter, NOTICE_TYPE_LABEL, type Notice } from '@/lib/adapters/notice'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  // 공지사항은 NoticeAdapter에서 — mock 단계에선 임시 DB, 운영 시 사내 CMS로 자동 전환.
  const notices = await noticeAdapter.listRecent(3)

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* ─── Left: Brand Panel ───────────────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden px-14 py-14 text-white md:flex lg:px-20 xl:px-24"
        style={{ background: 'var(--brand-gradient)' }}
      >
        {/* decorative circles — 시각적 텍스처용, 의미 없음 */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-40 left-10 h-[360px] w-[360px] rounded-full bg-white/[0.04]" />

        {/* 로고 — 다크 그라데이션 위 가독성 확보용 흰색 카드 */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="rounded-xl bg-white px-5 py-3 shadow-md">
            <Image
              src="/GSchargev_logo.png"
              alt="GS 차지비"
              width={160}
              height={40}
              priority
              className="h-11 w-auto"
            />
          </div>
          <span className="text-sm font-medium text-white/85">파트너 콘솔</span>
        </div>

        {/* 중간 — 시스템 상태 + 공지사항 */}
        <div className="relative z-10 w-full max-w-2xl space-y-8">
          {/* 시스템 상태 */}
          <div className="rounded-xl border border-white/20 bg-white/15 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
                </span>
                <span className="text-base font-semibold">시스템 정상 운영 중</span>
              </div>
              <span className="text-sm text-white/70">실시간</span>
            </div>
            <div className="mt-3.5 flex items-center gap-2 text-sm text-white/85">
              <Phone className="h-4 w-4" />
              <span>기술지원 1544-4279 / 평일 09:00-18:00</span>
            </div>
          </div>

          {/* 공지사항 — NoticeAdapter 기반 */}
          {notices.length > 0 && (
            <div className="rounded-xl border border-white/20 bg-white/15 p-5 backdrop-blur-sm">
              <div className="mb-3.5 flex items-center gap-2 text-sm font-semibold text-white/90">
                <Megaphone className="h-4 w-4" />
                공지사항
              </div>
              <ul className="space-y-2.5">
                {notices.map((n) => (
                  <NoticeItem key={n.id} notice={n} />
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="relative z-10 text-sm text-white/70">
          © 2026 GS차지비
        </div>
      </div>

      {/* ─── Right: Form ─────────────────────────────────── */}
      <div className="grid place-items-center bg-background p-6 md:p-10">
        <LoginForm />
      </div>
    </div>
  )
}

function NoticeItem({ notice }: { notice: Notice }) {
  return (
    <li className="flex items-start gap-2.5 text-base leading-relaxed">
      <span className="mt-1 shrink-0 rounded bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
        {NOTICE_TYPE_LABEL[notice.type]}
      </span>
      <span className="text-white/95">{notice.title}</span>
    </li>
  )
}
