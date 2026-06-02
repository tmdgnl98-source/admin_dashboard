/**
 * Auth 라우트 그룹의 공통 레이아웃은 pass-through.
 * 각 페이지(/login, /signup, /forgot-password)가 자체 레이아웃을 갖는다.
 * — /login은 풀스크린 split, /signup은 카드형 등 톤이 달라서.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>
}
