import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepperProps {
  steps: string[]
  current: number  // 0-based
  className?: string
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn('flex w-full items-center', className)}>
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        const last = i === steps.length - 1
        return (
          <li key={label} className={cn('flex items-center', !last && 'flex-1')}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
                  !done && !active && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'whitespace-nowrap text-xs font-medium',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {!last && (
              <div
                className={cn(
                  'mx-3 h-px flex-1',
                  done ? 'bg-primary/40' : 'bg-border',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
