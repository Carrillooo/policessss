/**
 * React Bits · ShinyText
 * Barrido de luz sobre el texto. Puramente CSS (barato).
 */
import { cn } from '@/lib/utils'

export function ShinyText({ children, className, speed = 4 }: { children: React.ReactNode; className?: string; speed?: number }) {
  return (
    <span
      className={cn('bg-clip-text text-transparent animate-shine', className)}
      style={{
        backgroundImage:
          'linear-gradient(110deg, rgb(148 163 184 / 0.75) 35%, rgb(255 255 255 / 1) 50%, rgb(148 163 184 / 0.75) 65%)',
        backgroundSize: '250% 100%',
        animationDuration: `${speed}s`,
      }}
    >
      {children}
    </span>
  )
}
