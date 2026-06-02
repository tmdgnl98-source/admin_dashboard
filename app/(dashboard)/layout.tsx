import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Sidebar } from '@/components/layout/sidebar'
import { getCurrentUser } from '@/lib/auth/server'

const PASSWORD_CHANGE_PATH = '/me/change-password'
// 비번 변경 강제 상태에서도 접근 허용해야 하는 경로 (로그아웃 등은 API라 layout 안 거침)
const ALLOWED_DURING_FORCED_CHANGE = [PASSWORD_CHANGE_PATH]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // 임시 비번 강제 변경: 비번 변경 페이지 외 다른 dashboard 접근 차단
  if (user.mustChangePassword) {
    const h = await headers()
    const pathname = h.get('x-pathname') ?? ''
    const allowed = ALLOWED_DURING_FORCED_CHANGE.some((p) => pathname.startsWith(p))
    if (!allowed) redirect(PASSWORD_CHANGE_PATH)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />
      <main className="flex flex-1 flex-col overflow-hidden bg-muted/30">
        {children}
      </main>
    </div>
  )
}
