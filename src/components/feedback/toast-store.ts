import { create } from 'zustand'
import { uid } from '@/lib/utils'

export type ToastTone = 'success' | 'info' | 'warning' | 'error'
export interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
  duration: number
}

interface ToastState {
  toasts: ToastItem[]
  push: (t: Omit<ToastItem, 'id' | 'duration' | 'tone'> & Partial<Pick<ToastItem, 'tone' | 'duration'>>) => string
  dismiss: (id: string) => void
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = uid('t_')
    const item: ToastItem = { tone: 'success', duration: 3600, ...t, id }
    set((s) => ({ toasts: [...s.toasts.slice(-3), item] }))
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

/** API imperativa: toast.success('LINK COPIADO') */
export const toast = {
  success: (title: string, description?: string) => useToasts.getState().push({ title, description, tone: 'success' }),
  info: (title: string, description?: string) => useToasts.getState().push({ title, description, tone: 'info' }),
  warning: (title: string, description?: string) => useToasts.getState().push({ title, description, tone: 'warning' }),
  error: (title: string, description?: string) => useToasts.getState().push({ title, description, tone: 'error' }),
}
