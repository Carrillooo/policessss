/**
 * Timeline de entrevista: la línea se "construye" (scaleY) y cada evento
 * nuevo entra con el movimiento REALTIME UPDATE y un destello de color.
 */
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, CircleDot, Flag, Gamepad2, MessageSquare, Play, TriangleAlert, UserCheck, X } from 'lucide-react'
import { realtimeEnterVariants, EASE } from '@/lib/animations'
import { cn, formatClock } from '@/lib/utils'
import type { TimelineEvent } from '@/data/types'

const toneCls = {
  neutral: { dot: 'border-line-strong bg-panel-2 text-muted', text: 'text-muted', flash: '148 163 184' },
  brand: { dot: 'border-sky-400/40 bg-sky-500/10 text-sky-300', text: 'text-sky-200', flash: '56 189 248' },
  ok: { dot: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300', text: 'text-emerald-200', flash: '34 197 94' },
  warn: { dot: 'border-amber-400/40 bg-amber-500/10 text-amber-300', text: 'text-amber-200', flash: '245 158 11' },
  danger: { dot: 'border-red-400/50 bg-red-500/15 text-red-300', text: 'text-red-200', flash: '239 68 68' },
}

function iconFor(e: TimelineEvent) {
  if (e.kind === 'incident') return TriangleAlert
  if (e.kind === 'start') return Play
  if (e.kind === 'finish') return Flag
  if (e.kind === 'join') return UserCheck
  if (e.kind === 'answer') return MessageSquare
  if (e.kind === 'game') return Gamepad2
  if (e.kind === 'evaluation') return e.tone === 'ok' ? Check : e.tone === 'danger' ? X : CircleDot
  return CircleDot
}

export function Timeline({ events, className, newestFirst = false, maxHeight }: { events: TimelineEvent[]; className?: string; newestFirst?: boolean; maxHeight?: number }) {
  const list = newestFirst ? [...events].reverse() : events
  const mounted = useRef(false)
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    mounted.current = true
  }, [])
  useEffect(() => {
    if (!newestFirst && scroller.current) scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [events.length, newestFirst])

  return (
    <div ref={scroller} className={cn('relative overflow-y-auto pr-1', className)} style={{ maxHeight }}>
      <ol className="relative pl-1">
        <motion.span
          aria-hidden
          className="absolute bottom-3 left-[18px] top-3 w-px origin-top bg-gradient-to-b from-sky-400/50 via-line-strong to-transparent"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.8, ease: EASE.out }}
        />
        <AnimatePresence initial={true}>
          {list.map((e, i) => {
            const t = toneCls[e.tone]
            const Icon = iconFor(e)
            return (
              <motion.li
                key={e.id}
                layout="position"
                variants={realtimeEnterVariants}
                initial="hidden"
                animate="show"
                transition={{ delay: mounted.current ? 0 : Math.min(i, 12) * 0.04 }}
                className="relative flex items-start gap-3 py-1.5"
              >
                <span className={cn('relative z-10 grid size-[30px] shrink-0 place-items-center rounded-full border', t.dot)}>
                  <Icon className="size-3.5" />
                  {mounted.current && (
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      initial={{ boxShadow: `0 0 0 0 rgb(${t.flash} / 0.7)` }}
                      animate={{ boxShadow: `0 0 0 10px rgb(${t.flash} / 0)` }}
                      transition={{ duration: 0.9 }}
                    />
                  )}
                </span>
                <div className="min-w-0 pt-1">
                  <div className="tabular font-mono text-[10.5px] text-dim">{formatClock(e.at)}</div>
                  <div className={cn('font-mono text-[11.5px] font-semibold tracking-[0.1em]', t.text)}>{e.label}</div>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>
    </div>
  )
}
