import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { getCurrentUser } from '@/lib/auth/server'
import { getVisibleStations } from '@/lib/stations/visible'
import { StationsListClient } from './stations-list-client'

export default async function StationListPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const stations = await getVisibleStations(user)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="충전소 리스트" />
      <div className="flex-1 overflow-y-auto p-6">
        <StationsListClient stations={stations} role={user.role} />
      </div>
    </div>
  )
}
