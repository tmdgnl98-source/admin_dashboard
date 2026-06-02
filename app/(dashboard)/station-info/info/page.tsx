import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/auth/server'
import { canAccessStation, getVisibleStations } from '@/lib/stations/visible'
import { stationAdapter } from '@/lib/adapters/station'
import {
  STATION_STATUS_LABEL,
  FACILITY_TYPE_LABEL,
  CHARGER_STATUS_LABEL,
  CONNECTOR_TYPE_LABEL,
} from '@/lib/adapters/station/types'
import {
  MapPin,
  Phone,
  Building2,
  Calendar,
  Wrench,
  TrendingUp,
  Zap,
  ArrowLeft,
  Activity,
} from 'lucide-react'
import { contractAdapter } from '@/lib/adapters/contract'

interface PageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function StationInfoPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await searchParams

  // id 없으면 첫 번째 접근 가능 충전소로 fallback
  if (!id) {
    const visible = await getVisibleStations(user)
    if (visible.length === 0) {
      return <NoStationsView />
    }
    redirect(`/station-info/info?id=${visible[0].id}`)
  }

  const allowed = await canAccessStation(user, id)
  if (!allowed) return <ForbiddenView stationId={id} />

  const station = await stationAdapter.getStation(id)
  if (!station) return <NotFoundView stationId={id} />

  const [chargers, contracts] = await Promise.all([
    stationAdapter.listChargers(id),
    contractAdapter.getContractsByStation(id),
  ])
  const activeContract = contracts.find((c) => c.status === 'active')

  const chargerCounts = {
    normal: chargers.filter((c) => c.status === 'normal').length,
    charging: chargers.filter((c) => c.status === 'charging').length,
    fault: chargers.filter((c) => c.status === 'fault').length,
    maintenance: chargers.filter((c) => c.status === 'maintenance').length,
    offline: chargers.filter((c) => c.status === 'offline').length,
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="충전소 정보" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Link
            href="/stations/list"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            충전소 리스트
          </Link>

          {/* 헤더 카드 */}
          <Card className="shadow-sm">
            <CardContent className="py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight">{station.name}</h1>
                    <StatusBadge status={STATION_STATUS_LABEL[station.status]} />
                  </div>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {station.id}
                    {station.facilityType && ` · ${FACILITY_TYPE_LABEL[station.facilityType]}`}
                    {station.operatingHours && ` · ${station.operatingHours}`}
                  </p>
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {station.address}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/station-info/chargers?stationId=${station.id}`}>
                    <Button variant="outline">충전기 보기</Button>
                  </Link>
                  <Link href={`/station-info/realtime?stationId=${station.id}`}>
                    <Button>실시간 상태</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiTile
              icon={Zap}
              label="충전기"
              value={`${station.chargerCount}대`}
              tone="primary"
            />
            <KpiTile
              icon={TrendingUp}
              label="이번달 매출"
              value={`${(station.monthlyRevenue ?? 0).toLocaleString()}원`}
              tone="success"
            />
            <KpiTile
              icon={Activity}
              label="이번달 충전"
              value={`${(station.monthlyUsageCount ?? 0).toLocaleString()}건`}
              tone="info"
            />
            <KpiTile
              icon={TrendingUp}
              label="가동률 (30일)"
              value={
                station.uptime30d !== undefined
                  ? `${Math.round(station.uptime30d * 1000) / 10}%`
                  : '-'
              }
              tone={
                (station.uptime30d ?? 0) >= 0.95
                  ? 'success'
                  : (station.uptime30d ?? 0) >= 0.85
                    ? 'warning'
                    : 'danger'
              }
            />
          </div>

          {/* 충전기 상태 요약 */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">충전기 상태</CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <StatusTile label="대기" count={chargerCounts.normal} tone="success" />
                <StatusTile label="충전중" count={chargerCounts.charging} tone="info" />
                <StatusTile label="점검중" count={chargerCounts.maintenance} tone="warning" />
                <StatusTile label="고장" count={chargerCounts.fault} tone="danger" />
                <StatusTile label="미연결" count={chargerCounts.offline} tone="muted" />
              </div>
            </CardContent>
          </Card>

          {/* 충전기 미리보기 */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">충전기 ({chargers.length})</CardTitle>
              <Link
                href={`/station-info/chargers?stationId=${station.id}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                전체 보기 →
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {chargers.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                      <span className="font-medium">
                        {c.type === 'fast' ? '급속' : '완속'} {c.capacity}kW
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {CONNECTOR_TYPE_LABEL[c.connectorType]}
                      </span>
                    </div>
                    <StatusBadge status={CHARGER_STATUS_LABEL[c.status]} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 메타 + 계약 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                <InfoRow icon={Building2} label="소유주" value={station.ownerName ?? '-'} />
                <InfoRow icon={Phone} label="담당 연락처" value={station.contactPhone ?? '-'} />
                <InfoRow
                  icon={Calendar}
                  label="설치일"
                  value={station.installedAt ?? '-'}
                />
                <InfoRow
                  icon={Wrench}
                  label="마지막 점검"
                  value={station.lastInspectionAt ?? '-'}
                />
                <InfoRow
                  icon={Wrench}
                  label="다음 점검 예정"
                  value={station.nextInspectionAt ?? '-'}
                />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">계약 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                {activeContract ? (
                  <>
                    <InfoRow
                      icon={Calendar}
                      label="계약 기간"
                      value={`${activeContract.startDate} ~ ${activeContract.endDate}`}
                    />
                    <InfoRow
                      icon={TrendingUp}
                      label="수익 분배율"
                      value={`${Math.round(activeContract.revenueShareRate * 100)}%`}
                    />
                    {activeContract.monthlyRent !== undefined && (
                      <InfoRow
                        icon={Building2}
                        label="월 임대료"
                        value={`${activeContract.monthlyRent.toLocaleString()}원`}
                      />
                    )}
                    <InfoRow
                      icon={Calendar}
                      label="정산 주기"
                      value={cycleLabel(activeContract.settlementCycle)}
                    />
                    <InfoRow
                      icon={Calendar}
                      label="자동 갱신"
                      value={activeContract.autoRenew ? '예' : '아니오'}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">활성 계약 정보가 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function cycleLabel(c: string): string {
  return { monthly: '월별', quarterly: '분기', semiannual: '반기', annual: '연간' }[c] ?? c
}

function KpiTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const wrapCls = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success-soft text-success-soft-foreground',
    warning: 'bg-warning-soft text-warning-soft-foreground',
    danger: 'bg-danger-soft text-danger-soft-foreground',
    info: 'bg-info-soft text-info-soft-foreground',
  }[tone]
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className={`rounded-md p-1.5 ${wrapCls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function StatusTile({
  label,
  count,
  tone,
}: {
  label: string
  count: number
  tone: 'success' | 'warning' | 'danger' | 'info' | 'muted'
}) {
  const dotCls = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
    muted: 'bg-muted-foreground',
  }[tone]
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card p-3">
      <div className={`h-2.5 w-2.5 rounded-full ${dotCls}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold tabular-nums">{count}</p>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function NoStationsView() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="충전소 정보" />
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">접근 가능한 충전소가 없습니다.</p>
            <p className="text-xs text-muted-foreground">운영팀에 권한 부여를 요청하세요.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ForbiddenView({ stationId }: { stationId: string }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="충전소 정보" />
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">접근 권한이 없습니다.</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{stationId}</span> 충전소는 권한 부여된 사용자만 접근 가능합니다.
            </p>
            <Link href="/stations/list">
              <Button variant="outline" className="mt-2">충전소 리스트로</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function NotFoundView({ stationId }: { stationId: string }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="충전소 정보" />
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">충전소를 찾을 수 없습니다.</p>
            <p className="font-mono text-xs text-muted-foreground">{stationId}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
