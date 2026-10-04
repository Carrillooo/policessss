# LSPD Recruitment System

Sistema interno de reclutamiento del LSPD (CAD/MDT de nueva generación): entrevistas en tiempo real, consulta de normativa, pruebas psicotécnicas y analítica.

**Stack:** Vite · React 19 · TypeScript · Tailwind v4 · Motion · componentes inspirados en React Bits · Radix · cmdk · Lucide · Zustand · Supabase Realtime (opcional).

```bash
npm install
npm run dev
```

## Demo rápida

1. `/login` → **ACCEDER AL SISTEMA**.
2. Abre la entrevista programada `LSPD-9T1R` (Entrevistas → Kevin O’Brien).
3. En otra pestaña abre `/portal/LSPD-9T1R` (vista del postulante): verás la secuencia *PROCESSING SECURE CONNECTION → IDENTITY VERIFIED → WAITING FOR INTERVIEWER*.
4. Pulsa **INICIAR ENTREVISTA**: el postulante ve *INTERVIEW STARTED* y la primera pregunta. Las respuestas, cambios de pregunta e incidencias (cambio de pestaña, pérdida de foco, salida de pantalla completa) se sincronizan al instante.
5. **Ctrl/⌘ + K** abre la Command Palette (prueba "pinchar ruedas").

Sin una segunda pestaña, el **Simulador demo** de la sala genera respuestas e incidencias.

## Realtime

- Por defecto: `BroadcastChannel` (sincroniza pestañas del mismo navegador).
- Con Supabase: define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env` y se usará un canal *broadcast* de Supabase Realtime (cargado de forma perezosa).

## Motion design system

Todos los tiempos, curvas y variantes están en [`src/lib/animations.ts`](src/lib/animations.ts). La guía está en [`src/docs/MOTION.md`](src/docs/MOTION.md). Componentes inspirados en React Bits en [`src/components/reactbits`](src/components/reactbits). Se respeta `prefers-reduced-motion`.

> El acceso actual es una sesión simulada (sin autenticación real) y los datos se guardan en `localStorage`.
