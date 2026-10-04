import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { HOVER_TRANSITION } from '@/lib/animations'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_0_0_1px_rgb(96_165_250/0.5),0_8px_24px_-8px_rgb(59_130_246/0.7),inset_0_1px_0_rgb(255_255_255/0.2)] hover:shadow-[0_0_0_1px_rgb(147_197_253/0.7),0_10px_32px_-6px_rgb(59_130_246/0.85),inset_0_1px_0_rgb(255_255_255/0.25)]',
  secondary: 'bg-panel-2 text-fg border border-line-strong hover:border-blue-400/40 hover:bg-[#15203a]',
  outline: 'border border-line-strong text-fg hover:border-blue-400/50 hover:bg-blue-500/[0.06]',
  ghost: 'text-muted hover:text-fg hover:bg-white/[0.04]',
  danger:
    'bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/[0.16] hover:border-red-400/50 hover:text-red-200',
  success:
    'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/[0.16] hover:border-emerald-400/50',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-[10px]',
  lg: 'h-12 px-6 text-sm gap-2.5 rounded-xl tracking-wide',
  icon: 'h-9 w-9 rounded-lg',
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  children?: React.ReactNode
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={HOVER_TRANSITION}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background,box-shadow,border-color,color] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
          <span className="animate-shimmer absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </span>
      )}
      {children}
    </motion.button>
  ),
)
Button.displayName = 'Button'
