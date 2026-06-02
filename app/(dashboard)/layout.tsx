import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { getCurrentUser } from '@/lib/auth/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // proxy.ts는 쿠키 존재만 체크. 여기서 실제 세션 검증 + user 로드.
  const user = await getCurrentUser()
  if (!user) redirect('/login')

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
