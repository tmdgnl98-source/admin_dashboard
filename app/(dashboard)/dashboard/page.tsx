import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KpiCard, DotSummary } from '@/components/ui/summary-card'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import {
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  Clock,
} from 'lucide-react'

const kpiCards = [
  { title: '총 충전소', value: '142', unit: '개소', change: '+3', changeTone: 'success' as const, icon: Zap, tone: 'neutral' as const, description: '전월 대비' },
  { title: '정상 운영', value: '128', unit: '개소', change: '90.1%', changeTone: 'success' as const, icon: CheckCircle2, tone: 'success' as const, description: '가동률' },
  { title: '고장/점검', value: '14', unit: '개소', change: '-2', changeTone: 'danger' as const, icon: AlertTriangle, tone: 'warning' as const, description: '전월 대비' },
  { title: '금월 충전량', value: '48,320', unit: 'kWh', change: '+12.4%', changeTone: 'success' as const, icon: TrendingUp, tone: 'info' as const, description: '전월 대비' },
]

const recentFaults = [
  { id: 'CS001', station: '강남 충전소', charger: '2번 충전기', status: '수리중', time: '2시간 전' },
  { id: 'CS047', station: '홍대 충전소', charger: '1번 충전기', status: '접수완료', time: '4시간 전' },
  { id: 'CS023', station: '신촌 충전소', charger: '3번 충전기', status: '처리완료', time: '1일 전' },
  { id: 'CS089', station: '잠실 충전소', charger: '1번 충전기', status: '수리중', time: '1일 전' },
]

const recentActivity = [
  { type: '충전 완료', station: '서초 충전소', user: 'user_2847', amount: '45.2 kWh', time: '5분 전' },
  { type: '충전 시작', station: '강남 충전소', user: 'user_1293', amount: '-', time: '8분 전' },
  { type: '고장 신고', station: '홍대 충전소', user: 'system', amount: '-', time: '2시간 전' },
  { type: '충전 완료', station: '신촌 충전소', user: 'user_5591', amount: '30.8 kWh', time: '2시간 전' },
]

const stationStatusSummary: Array<{ label: string; count: number; tone: StatusTone }> = [
  { label: '정상', count: 128, tone: 'success' },
  { label: '고장', count: 8, tone: 'danger' },
  { label: '점검중', count: 6, tone: 'warning' },
  { label: '미연결', count: 0, tone: 'neutral' },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="대시보드" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <KpiCard
              key={card.title}
              title={card.title}
              value={card.value}
              unit={card.unit}
              change={card.change}
              changeTone={card.changeTone}
              description={card.description}
              icon={card.icon}
              tone={card.tone}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent Faults */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <CardTitle className="text-sm font-semibold">고장 신고 현황</CardTitle>
              <Badge variant="secondary" className="ml-auto text-xs">
                14건
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentFaults.map((fault) => (
                  <div key={fault.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{fault.station}</p>
                      <p className="text-xs text-muted-foreground">
                        {fault.id} · {fault.charger}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                      <StatusBadge status={fault.status} />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {fault.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Activity className="h-4 w-4 text-info" />
              <CardTitle className="text-sm font-semibold">최근 활동</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{activity.station}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.type} · {activity.user}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                      {activity.amount !== '-' && (
                        <span className="text-xs font-medium text-primary">
                          {activity.amount}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Station Status Overview */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">충전소 상태 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stationStatusSummary.map((item) => (
                <DotSummary
                  key={item.label}
                  label={item.label}
                  value={item.count}
                  tone={item.tone}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
