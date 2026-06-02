import { cva, type VariantProps } from 'class-variance-authority'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { StatusTone } from './status-badge'

/**
 * 두 가지 모드:
 *   1. KPI 카드: title + value + (변동률) + (아이콘) — 대시보드용
 *   2. 도트 요약: label + value + tone 도트 — 상태 요약 행에서 사용
 */

const iconWrapVariants = cva('rounded-md p-1.5', {
  variants: {
    tone: {
      success: 'bg-success-soft text-success-soft-foreground',
      warning: 'bg-warning-soft text-warning-soft-foreground',
      danger: 'bg-danger-soft text-danger-soft-foreground',
      info: 'bg-info-soft text-info-soft-foreground',
      neutral: 'bg-primary/10 text-primary',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

const dotVariants = cva('h-2.5 w-2.5 shrink-0 rounded-full', {
  variants: {
    tone: {
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-danger',
      info: 'bg-info',
      neutral: 'bg-muted-foreground',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

const changeVariants = cva('font-medium', {
  variants: {
    tone: {
      success: 'text-success',
      danger: 'text-danger',
      neutral: 'text-muted-foreground',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

// ─── KPI Card ────────────────────────────────────────────────────────

interface KpiCardProps extends VariantProps<typeof iconWrapVariants> {
  title: string
  value: string | number
  unit?: string
  description?: string
  change?: string
  changeTone?: 'success' | 'danger' | 'neutral'
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

export function KpiCard({
  title,
  value,
  unit,
  description,
  change,
  changeTone = 'neutral',
  icon: Icon,
  tone = 'neutral',
  className,
}: KpiCardProps) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn(iconWrapVariants({ tone }))}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {(change || description) && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {change && (
              <span className={cn(changeVariants({ tone: changeTone }))}>
                {change}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Dot Summary (한 줄짜리 상태 요약) ────────────────────────────────

interface DotSummaryProps {
  label: string
  value: string | number
  tone?: StatusTone
  className?: string
}

export function DotSummary({ label, value, tone = 'neutral', className }: DotSummaryProps) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border bg-card p-3', className)}>
      <div className={cn(dotVariants({ tone }))} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  )
}
