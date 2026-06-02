import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { getCurrentUser } from '@/lib/auth/server'
import { getVisibleStations } from '@/lib/stations/visible'
import { stationAdapter } from '@/lib/adapters/station'
import { ChargersClient } from './chargers-client'

interface PageProps {
  searchParams: Promise<{ stationId?: string }>
}

export default async function ChargersPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { stationId } = await searchParams

  const visibleStations = await getVisibleStations(user)
  if (visibleStations.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="충전기 현황" />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">접근 가능한 충전소가 없습니다.</p>
        </div>
      </div>
    )
  }

  // 단일 충전소 필터링 — query string으로 들어온 경우
  const targetStationIds = stationId
    ? visibleStations.filter((s) => s.id === stationId).map((s) => s.id)
    : visibleStations.map((s) => s.id)

  const chargers = await stationAdapter.listChargersByStations(targetStationIds)
  const stationMap = Object.fromEntries(visibleStations.map((s) => [s.id, s]))

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="충전기 현황" />
      <div className="flex-1 overflow-y-auto p-6">
        <ChargersClient
          chargers={chargers}
          stations={visibleStations}
          stationMap={stationMap}
          initialStationFilter={stationId ?? 'all'}
        />
      </div>
    </div>
  )
}
