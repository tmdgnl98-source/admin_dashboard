import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { getVisibleStations } from '@/lib/stations/visible'
import { stationAdapter } from '@/lib/adapters/station'

/**
 * 실시간 충전기 상태 폴링용. 모든 접근 가능 충전소의 충전기 상태 반환.
 * 운영 전환 시 SSE/WebSocket으로 전환 가능 (어댑터 너머에서 push).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const stationId = searchParams.get('stationId')

  const visible = await getVisibleStations(user)
  const targetIds = stationId
    ? visible.filter((s) => s.id === stationId).map((s) => s.id)
    : visible.map((s) => s.id)

  const chargers = await stationAdapter.listChargersByStations(targetIds)
  const stations = Object.fromEntries(
    visible.map((s) => [s.id, { id: s.id, name: s.name, address: s.address }]),
  )

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    stations,
    chargers,
  })
}
