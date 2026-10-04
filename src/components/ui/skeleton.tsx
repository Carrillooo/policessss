import { cn } from '@/lib/utils'

/** Skeleton con barrido de luz (no spinner) */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-white/[0.045]', className)}>
      <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  )
}
