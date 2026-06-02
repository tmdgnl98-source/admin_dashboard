import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * 도메인 상태 → tone 매핑. 페이지 곳곳에서 `bg-green-100 text-green-800` 식으로
 * 직접 박지 말고, 상태 라벨만 넘기면 알아서 시맨틱 토큰을 적용한다.
 *
 * 새 상태가 생기면 STATUS_TONE 에 추가만 하면 됨.
 */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export const STATUS_TONE: Record<string, StatusTone> = {
  // success
  정상: 'success',
  처리완료: 'success',
  납부완료: 'success',
  발송완료: 'success',
  활성: 'success',
  승인: 'success',
  가입완료: 'success',

  // warning
  점검중: 'warning',
  수리중: 'warning',
  납부대기: 'warning',
  만료임박: 'warning',
  승인대기: 'warning',
  미가입: 'warning',

  // danger
  고장: 'danger',
  미납: 'danger',
  발송실패: 'danger',
  만료: 'danger',
  반려: 'danger',
  비활성: 'danger',

  // info
  접수완료: 'info',
  진행중: 'info',
  발송중: 'info',

  // neutral (default)
  미연결: 'neutral',
}

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        success: 'bg-success-soft text-success-soft-foreground',
        warning: 'bg-warning-soft text-warning-soft-foreground',
        danger: 'bg-danger-soft text-danger-soft-foreground',
        info: 'bg-info-soft text-info-soft-foreground',
        neutral: 'bg-muted text-muted-foreground',
      },
      solid: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      { tone: 'success', solid: true, class: 'bg-success text-success-foreground' },
      { tone: 'warning', solid: true, class: 'bg-warning text-warning-foreground' },
      { tone: 'danger', solid: true, class: 'bg-danger text-danger-foreground' },
      { tone: 'info', solid: true, class: 'bg-info text-info-foreground' },
      { tone: 'neutral', solid: true, class: 'bg-foreground text-background' },
    ],
    defaultVariants: { tone: 'neutral', solid: false },
  },
)

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  /** 한글 상태 라벨 — STATUS_TONE에 등록된 키면 자동 tone 결정 */
  status?: string
  /** status가 매핑에 없거나, 강제로 지정하고 싶을 때 */
  tone?: StatusTone
  className?: string
  children?: React.ReactNode
  solid?: boolean
}

export function StatusBadge({
  status,
  tone: toneOverride,
  solid = false,
  className,
  children,
}: StatusBadgeProps) {
  const tone =
    toneOverride ?? (status ? STATUS_TONE[status] ?? 'neutral' : 'neutral')
  return (
    <span className={cn(statusBadgeVariants({ tone, solid }), className)}>
      {children ?? status}
    </span>
  )
}

export { statusBadgeVariants }
