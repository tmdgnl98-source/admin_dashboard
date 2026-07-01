import { NextRequest, NextResponse } from 'next/server'
import { getDummyGroupRows } from '@/lib/dummy-data'

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL ?? ''
const HEADERS = ['정산그룹', '충전소ID', '충전소명', '정산주기', '매출분배율', '부지사용료', '정산단가', '위탁운영수수료', '기타 조건']

export async function GET() {
  const dummy = getDummyGroupRows()

  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ data: dummy, headers: HEADERS })
  }
  try {
    const url = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent('정산 그룹 관리')}`
    const res = await fetch(url, { redirect: 'follow', cache: 'no-store' })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const json = await res.json()
    const real: unknown[] = Array.isArray(json?.data) ? json.data : []
    return NextResponse.json({
      data: [...real, ...dummy],
      headers: json?.headers ?? HEADERS,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed'
    return NextResponse.json({ data: dummy, headers: HEADERS, warning: message })
  }
}

export async function POST(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ error: 'APPS_SCRIPT_URL not configured' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const json = await res.json()
    return NextResponse.json(json)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
