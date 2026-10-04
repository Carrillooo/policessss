import { lazy, Suspense } from 'react'
import { useReducedMotion } from 'motion/react'
import type { ComponentProps } from 'react'

const Particles = lazy(() => import('./Particles'))

/** Partículas cargadas bajo demanda y omitidas con reduced motion */
export function LazyParticles(props: ComponentProps<typeof Particles>) {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <Suspense fallback={null}>
      <Particles {...props} />
    </Suspense>
  )
}
