import Link from 'next/link'
import Image from 'next/image'

/**
 * 카드형 auth 페이지(/signup, /forgot-password)에서 공유하는 헤더.
 * 로그인은 풀스크린 split이라 이걸 안 쓴다.
 */
export function AuthHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-6">
        <Link href="/login" className="flex items-center gap-3">
          <Image
            src="/GSchargev_logo.png"
            alt="GS 차지비"
            width={160}
            height={40}
            priority
            className="h-9 w-auto"
          />
          <span className="text-sm text-muted-foreground">파트너 콘솔</span>
        </Link>
      </div>
    </header>
  )
}
