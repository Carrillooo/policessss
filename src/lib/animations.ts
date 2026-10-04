/**
 * LSPD Motion Design System
 * ------------------------------------------------------------
 * Única fuente de verdad para duraciones, curvas y variantes.
 * Ningún componente debe declarar valores de animación "a mano":
 * importa desde aquí. Ver `src/docs/MOTION.md`.
 */
import type { Transition, Variants } from 'motion/react'

/* ---------------------------------------------------------------- */
/* Duraciones (segundos)                                             */
/* ---------------------------------------------------------------- */
export const DURATION = {
  /** Microinteracción: hover, focus, toggles (100–180ms) */
  micro: 0.14,
  /** Botones y estados de pulsación (120–200ms) */
  button: 0.16,
  /** Cards y elementos de lista (150–250ms) */
  card: 0.22,
  /** Modales, palette, drawers (200–300ms) */
  modal: 0.26,
  /** Cambio de página (200–350ms) */
  page: 0.3,
  /** Contadores y barras de progreso */
  counter: 0.9,
  /** Flash de actualización realtime */
  flash: 0.7,
} as const

/* ---------------------------------------------------------------- */
/* Curvas                                                            */
/* ---------------------------------------------------------------- */
export const EASE = {
  /** Salida rápida y aterrizaje suave: la curva por defecto */
  out: [0.16, 1, 0.3, 1] as const,
  /** Entrada/salida simétrica, para loops y morphs */
  inOut: [0.65, 0, 0.35, 1] as const,
  /** Para elementos que se van: acelera hacia fuera */
  in: [0.4, 0, 1, 1] as const,
}

/* ---------------------------------------------------------------- */
/* Transiciones base                                                 */
/* ---------------------------------------------------------------- */
export const FAST_TRANSITION: Transition = { duration: DURATION.micro, ease: EASE.out }
export const HOVER_TRANSITION: Transition = { duration: DURATION.button, ease: EASE.out }
export const DEFAULT_TRANSITION: Transition = { duration: DURATION.card, ease: EASE.out }
export const MODAL_TRANSITION: Transition = { duration: DURATION.modal, ease: EASE.out }
export const PAGE_TRANSITION: Transition = { duration: DURATION.page, ease: EASE.out }
export const EXIT_TRANSITION: Transition = { duration: DURATION.micro, ease: EASE.in }
/** Spring discreto: sin rebote visible, sólo inercia */
export const SPRING_TRANSITION: Transition = { type: 'spring', stiffness: 420, damping: 36, mass: 0.8 }
/** Spring para indicadores que "persiguen" (sidebar, tabs) */
export const INDICATOR_SPRING: Transition = { type: 'spring', stiffness: 520, damping: 42 }

/** Retardo entre hijos en entradas escalonadas */
export const STAGGER = { fast: 0.035, default: 0.06, slow: 0.09 } as const

/* ---------------------------------------------------------------- */
/* Variantes semánticas                                              */
/* Cada tipo de movimiento tiene una única "firma" reconocible.      */
/* ---------------------------------------------------------------- */

/** ENTER / EXIT genérico: fade + desplazamiento corto */
export const enterVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: DEFAULT_TRANSITION },
  exit: { opacity: 0, y: -4, transition: EXIT_TRANSITION },
}

/** Contenedor que escalona a sus hijos (dashboard, listas) */
export const staggerContainer = (stagger: number = STAGGER.default, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

/** Card que entra con algo más de profundidad */
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: DEFAULT_TRANSITION },
}

/** PAGE CHANGE: sólo el área de contenido, nunca toda la pantalla */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: PAGE_TRANSITION },
  exit: { opacity: 0, y: -6, filter: 'blur(2px)', transition: EXIT_TRANSITION },
}

/** QUESTION CHANGE: sale hacia la izquierda, entra desde la derecha (con dirección) */
export const questionVariants: Variants = {
  hidden: (dir: number = 1) => ({ opacity: 0, x: 28 * dir, filter: 'blur(6px)' }),
  show: { opacity: 1, x: 0, filter: 'blur(0px)', transition: DEFAULT_TRANSITION },
  exit: (dir: number = 1) => ({ opacity: 0, x: -20 * dir, filter: 'blur(4px)', transition: EXIT_TRANSITION }),
}

/** MODAL: fade + scale + blur */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8, filter: 'blur(6px)' },
  show: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', transition: MODAL_TRANSITION },
  exit: { opacity: 0, scale: 0.98, y: 4, filter: 'blur(4px)', transition: EXIT_TRANSITION },
}

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: MODAL_TRANSITION },
  exit: { opacity: 0, transition: EXIT_TRANSITION },
}

/** DRAWER: entra desde la derecha */
export const drawerVariants: Variants = {
  hidden: { x: '100%', opacity: 0.6 },
  show: { x: 0, opacity: 1, transition: { ...SPRING_TRANSITION, stiffness: 380 } },
  exit: { x: '100%', opacity: 0.6, transition: { duration: DURATION.modal * 0.8, ease: EASE.in } },
}

/** TOAST: sube desde abajo, se va hacia la derecha */
export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING_TRANSITION },
  exit: { opacity: 0, x: 40, transition: EXIT_TRANSITION },
}

/** REALTIME UPDATE: un evento nuevo cae desde arriba */
export const realtimeEnterVariants: Variants = {
  hidden: { opacity: 0, y: -14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING_TRANSITION },
}

/** SUCCESS / WARNING / ERROR: marca que "aterriza" */
export const markVariants: Variants = {
  hidden: { scale: 0.4, opacity: 0, rotate: -12 },
  show: { scale: 1, opacity: 1, rotate: 0, transition: { ...SPRING_TRANSITION, stiffness: 600, damping: 28 } },
  exit: { scale: 0.6, opacity: 0, transition: EXIT_TRANSITION },
}

/** Feedback semántico: colores usados por flashes y glows */
export const FEEDBACK_COLOR = {
  success: '34 197 94',
  warning: '245 158 11',
  error: '239 68 68',
  info: '59 130 246',
  realtime: '56 189 248',
} as const
export type FeedbackTone = keyof typeof FEEDBACK_COLOR

/** Keyframes de "flash" de borde para actualizaciones realtime */
export const flashBorder = (tone: FeedbackTone = 'realtime') => ({
  boxShadow: [
    `0 0 0 1px rgb(${FEEDBACK_COLOR[tone]} / 0.9), 0 0 24px -4px rgb(${FEEDBACK_COLOR[tone]} / 0.55)`,
    `0 0 0 1px rgb(${FEEDBACK_COLOR[tone]} / 0), 0 0 0px 0px rgb(${FEEDBACK_COLOR[tone]} / 0)`,
  ],
  transition: { duration: DURATION.flash, ease: EASE.out },
})

/** Interacciones de pulsación compartidas por botones y cards clicables */
export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.98 },
  transition: HOVER_TRANSITION,
} as const
