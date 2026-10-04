import type { ComponentType } from 'react'

export type GameId = 'memoria' | 'reaccion' | 'atencion' | 'matriculas' | 'reconstruccion'

/** Detalle libre del resultado: las claves se muestran tal cual en el desglose */
export type GameDetail = Record<string, number | string>

/** Estado que cada prueba comunica al HUD compartido */
export interface GameProgress {
  round: number
  rounds: number
  /** puntuación provisional 0..100 */
  score: number
}

export interface GameProps {
  onComplete: (score: number /* 0..100 */, detail: GameDetail) => void
  /** Opcional: alimenta el HUD (ronda x/y, puntuación provisional) */
  onProgress?: (p: GameProgress) => void
}

export interface GameDef {
  id: GameId
  name: string
  tagline: string
  description: string
  /** Pasos de instrucciones mostrados en la intro */
  instructions: string[]
  /** Controles: [tecla, acción] */
  controls: [string, string][]
  icon: ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>
  /** rgb sin "rgb()" — p.ej. "56 189 248" */
  accent: string
  durationLabel: string
  component: ComponentType<GameProps>
}
