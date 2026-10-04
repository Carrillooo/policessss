import { cn } from '@/lib/utils'

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-white/[0.04] px-1 font-mono text-[10px] text-muted shadow-[inset_0_-1px_0_rgb(148_163_184/0.15)]',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
