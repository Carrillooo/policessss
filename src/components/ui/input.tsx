import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-10 w-full rounded-[10px] border border-line-strong bg-bg-elevated/80 px-3 text-sm text-fg placeholder:text-dim transition-[border-color,box-shadow] duration-150 focus:border-blue-400/60 focus:shadow-[0_0_0_3px_rgb(59_130_246/0.15)] focus:outline-none',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-24 w-full resize-y rounded-[10px] border border-line-strong bg-bg-elevated/80 px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-dim transition-[border-color,box-shadow] duration-150 focus:border-blue-400/60 focus:shadow-[0_0_0_3px_rgb(59_130_246/0.15)] focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
