import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { getCurrentUser } from '@/lib/auth/server'
import { getVisibleStations } from '@/lib/stations/visible'
import { RealtimeClient } from './realtime-client'

interface PageProps {
  searchParams: Promise<{ stationId?: string }>
}

export default async function RealtimePage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { stationId } = await searchParams
  const visibleStations = await getVisibleStations(user)

  if (visibleStations.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="실시간 상태" />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">접근 가능한 충전소가 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="실시간 상태" />
      <div className="flex-1 overflow-y-auto p-6">
        <RealtimeClient
          stations={visibleStations.map((s) => ({ id: s.id, name: s.name }))}
          initialStationFilter={stationId ?? 'all'}
        />
      </div>
    </div>
  )
}
