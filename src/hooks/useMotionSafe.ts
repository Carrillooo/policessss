import { useReducedMotion } from 'motion/react'

/** true cuando podemos permitir animaciones decorativas */
export function useMotionSafe() {
  return !useReducedMotion()
}
