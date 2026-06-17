import { NextResponse } from 'next/server'
import { getDummyChargingHistory } from '@/lib/dummy-data'

// Apps Script 웹 앱 배포 후 아래 URL을 교체하세요
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_CHARGING_HISTORY_URL ?? ''

export async function GET() {
  const dummy = getDummyChargingHistory()

  if (!APPS_SCRIPT_URL) {
    // Apps Script 미구성 환경에서도 더미만으로 동작
    return NextResponse.json({ data: dummy })
  }

  try {
    // Apps Script는 302 리다이렉트를 반환하므로 follow 설정
    const res = await fetch(APPS_SCRIPT_URL, {
      redirect: 'follow',
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const json = await res.json()
    const real: unknown[] = Array.isArray(json?.data) ? json.data : []
    return NextResponse.json({ data: [...real, ...dummy] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed'
    // 실데이터 실패해도 더미는 노출 (개발 데모 안정성)
    return NextResponse.json({ data: dummy, warning: message })
  }
}
