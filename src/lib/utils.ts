import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const pad = (n: number) => String(n).padStart(2, '0')

/** 1423 → "23:43" */
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
}

/** Date | timestamp → "19:42" */
export function formatClock(t: number | Date) {
  const d = typeof t === 'number' ? new Date(t) : t
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatClockSeconds(t: number | Date) {
  const d = typeof t === 'number' ? new Date(t) : t
  return `${formatClock(d)}:${pad(d.getSeconds())}`
}

export const uid = (prefix = '') => prefix + Math.random().toString(36).slice(2, 10)

/** Normaliza texto para búsqueda sin acentos */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Enlace público del portal del postulante para un código de entrevista */
export const portalLink = (code: string) => `${window.location.origin}/portal/${code}`
