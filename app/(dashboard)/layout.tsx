import { TopBar } from '@/components/layout/top-bar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <TopBar userRole="main_admin" />
      <main className="mx-auto flex w-full min-w-0 max-w-[2200px] flex-1 flex-col">
        {children}
      </main>
    </div>
  )
}
