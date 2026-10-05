/**
 * Control de integridad del postulante
 * ------------------------------------------------------------
 * Una web NO puede bloquear el sistema operativo ni otras pantallas.
 * Lo que sí hacemos:
 * - Bloquear móviles / tablets.
 * - Detectar varios monitores (Window Management: `screen.isExtended`).
 * - Exigir compartir la PANTALLA COMPLETA (getDisplayMedia, superficie
 *   "monitor") y enviar capturas periódicas al entrevistador.
 * - Exigir pantalla completa.
 * Cualquier requisito que se pierda durante la sesión bloquea la vista
 * del postulante y genera una incidencia crítica.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export const SNAPSHOT_INTERVAL = 4000
const SNAPSHOT_WIDTH = 720

type ScreenWithExtended = Screen & { isExtended?: boolean; addEventListener?: (t: string, l: () => void) => void; removeEventListener?: (t: string, l: () => void) => void }

export function detectMobile() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
  const uaMobile = uaData?.mobile || /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(ua)
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  const touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches
  return Boolean(uaMobile || iPadOS || touchOnly)
}

export function detectSupport() {
  const canShare = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia
  const canDetectMonitors = typeof screen !== 'undefined' && 'isExtended' in screen
  return { canShare, canDetectMonitors, ok: canShare && canDetectMonitors }
}

export interface ProctorState {
  mobile: boolean
  supported: boolean
  sharing: boolean
  extended: boolean
  fullscreen: boolean
  /** Error al compartir (p. ej. eligió una ventana en vez de la pantalla) */
  shareError: string
  /** Todo en orden */
  ok: boolean
}

interface Options {
  /** Recibe cada captura (data URL JPEG) */
  onSnapshot?: (snap: { image: string; sharing: boolean; extended: boolean; fullscreen: boolean }) => void
  /** Se llama cuando un requisito pasa de cumplirse a no cumplirse */
  onViolation?: (type: 'SCREEN_SHARE_STOPPED' | 'MULTI_MONITOR' | 'FULLSCREEN_EXIT') => void
  /** Activa capturas y avisos */
  active: boolean
}

export function useProctoring({ onSnapshot, onViolation, active }: Options) {
  const [mobile] = useState(detectMobile)
  const [support] = useState(detectSupport)
  const [sharing, setSharing] = useState(false)
  const [extended, setExtended] = useState(() => Boolean((screen as ScreenWithExtended).isExtended))
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement)
  const [shareError, setShareError] = useState('')
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cbs = useRef({ onSnapshot, onViolation, active })
  cbs.current = { onSnapshot, onViolation, active }
  const state = useRef({ sharing, extended, fullscreen })
  state.current = { sharing, extended, fullscreen }

  /* Monitores */
  useEffect(() => {
    const scr = screen as ScreenWithExtended
    if (!('isExtended' in scr)) return
    const on = () => {
      const ext = Boolean(scr.isExtended)
      setExtended((prev) => {
        if (!prev && ext && cbs.current.active) cbs.current.onViolation?.('MULTI_MONITOR')
        return ext
      })
    }
    scr.addEventListener?.('change', on)
    const poll = setInterval(on, 2000) // por si el evento no se dispara
    return () => {
      scr.removeEventListener?.('change', on)
      clearInterval(poll)
    }
  }, [])

  /* Pantalla completa */
  useEffect(() => {
    const on = () => {
      const fs = !!document.fullscreenElement
      setFullscreen(fs)
      if (!fs && cbs.current.active) cbs.current.onViolation?.('FULLSCREEN_EXIT')
    }
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const stopSharing = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setSharing(false)
  }, [])

  /* Compartir pantalla completa */
  const requestShare = useCallback(async () => {
    setShareError('')
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor', frameRate: 5 },
        audio: false,
        // Opciones de Chromium: forzar la pantalla completa
        ...({ monitorTypeSurfaces: 'include', surfaceSwitching: 'exclude', selfBrowserSurface: 'exclude' } as object),
      } as DisplayMediaStreamOptions)
      const track = stream.getVideoTracks()[0]
      const surface = (track.getSettings() as MediaTrackSettings & { displaySurface?: string }).displaySurface
      if (surface && surface !== 'monitor') {
        stream.getTracks().forEach((t) => t.stop())
        setShareError('Debes compartir tu PANTALLA COMPLETA, no una ventana ni una pestaña.')
        return false
      }
      streamRef.current = stream
      if (!videoRef.current) {
        const v = document.createElement('video')
        v.muted = true
        v.playsInline = true
        videoRef.current = v
      }
      videoRef.current.srcObject = stream
      await videoRef.current.play().catch(() => undefined)
      track.addEventListener('ended', () => {
        streamRef.current = null
        setSharing(false)
        if (cbs.current.active) cbs.current.onViolation?.('SCREEN_SHARE_STOPPED')
      })
      setSharing(true)
      return true
    } catch {
      setShareError('Permiso denegado. Para continuar debes compartir tu pantalla completa.')
      return false
    }
  }, [])

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      /* el navegador puede rechazarlo sin gesto del usuario */
    }
  }, [])

  /* Capturas periódicas */
  useEffect(() => {
    if (!active) return
    const canvas = document.createElement('canvas')
    const take = () => {
      const v = videoRef.current
      const { sharing: sh, extended: ex, fullscreen: fs } = state.current
      let image = ''
      if (sh && v && v.videoWidth) {
        const scale = SNAPSHOT_WIDTH / v.videoWidth
        canvas.width = SNAPSHOT_WIDTH
        canvas.height = Math.round(v.videoHeight * scale)
        canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height)
        image = canvas.toDataURL('image/jpeg', 0.55)
      }
      cbs.current.onSnapshot?.({ image, sharing: sh, extended: ex, fullscreen: fs })
    }
    take()
    const id = setInterval(take, SNAPSHOT_INTERVAL)
    return () => clearInterval(id)
  }, [active, sharing])

  useEffect(() => () => stopSharing(), [stopSharing])

  const state2: ProctorState = {
    mobile,
    supported: support.ok,
    sharing,
    extended,
    fullscreen,
    shareError,
    ok: !mobile && support.ok && sharing && !extended && fullscreen,
  }
  return { ...state2, requestShare, requestFullscreen, stopSharing }
}
