/**
 * React Bits · GradientText
 */
import { cn } from '@/lib/utils'

export function GradientText({
  children,
  className,
  colors = ['#93c5fd', '#3b82f6', '#38bdf8', '#93c5fd'],
}: {
  children: React.ReactNode
  className?: string
  colors?: string[]
}) {
  return (
    <span
      className={cn('bg-clip-text text-transparent animate-shine', className)}
      style={{ backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`, backgroundSize: '300% 100%', animationDuration: '8s' }}
    >
      {children}
    </span>
  )
}
