import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth/server'
import { stationAdapter } from '@/lib/adapters/station'
import { NewAccountForm } from './new-account-form'

export default async function NewAccountPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'main_admin') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="신규 계정 등록" />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="w-full max-w-sm shadow-sm">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              본사 운영팀(main_admin) 권한이 필요합니다.
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { items: stations } = await stationAdapter.listStations({ limit: 1000 })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="신규 계정 등록" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          <NewAccountForm
            stations={stations.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      </div>
    </div>
  )
}
