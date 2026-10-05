# LSPD Recruitment System

Sistema interno de reclutamiento del LSPD: entrevistas en tiempo real, normativa, pruebas psicotécnicas y analítica.

**Stack:** Vite · React 19 · TypeScript · Tailwind v4 · Motion · componentes inspirados en React Bits · Radix · cmdk · Zustand · Supabase.

## Puesta en marcha en Vercel

La app elige sola dónde guardar los datos:

| Backend | Cuándo | Sincronización |
| --- | --- | --- |
| **Neon** (recomendado) | Integración Neon instalada en el proyecto de Vercel (`DATABASE_URL`) | Funciones `/api/records` + sondeo cada ~1 s |
| Supabase | Variables `VITE_`/`NEXT_PUBLIC_SUPABASE_URL` y `_ANON_KEY` | Realtime (`supabase/schema.sql`) |
| Local | Ninguna de las anteriores | Sólo este navegador (el enlace no funciona en otro dispositivo) |

### Con Neon

1. Vercel → proyecto → **Storage / Integrations → Neon** → conéctalo al proyecto (Production y Preview).
2. **Redeploy**. La tabla `lspd_records` se crea automáticamente en la primera petición.
3. Arriba a la derecha del panel debe aparecer **SYSTEM ONLINE · RT·NEON**.

La contraseña de la base de datos sólo se usa en el servidor (`api/records.ts`); nunca llega al navegador.

Opcional: `VITE_ACCESS_CODE` en Environment Variables para pedir un código al entrar al panel.

`vercel.json` redirige todas las rutas (excepto `/api`) a `index.html`, así que `/portal/CÓDIGO` y las recargas no dan 404.

## Uso

1. Entra con tu nombre (y el código de acceso si lo configuraste).
2. **Nueva entrevista** → nombre del postulante + ID de Discord → **Crear**. Siempre se generan 30 preguntas aleatorias.
3. Copia el enlace y envíaselo al postulante.
4. Cuando abra el enlace lo verás en *Sala de espera* (dashboard y sala de la entrevista). Pulsa **INICIAR ENTREVISTA**.
5. Sus respuestas e incidencias (cambio de pestaña, pérdida de foco, salida de pantalla completa, pegado) llegan en tiempo real. Evalúa con 1/2/3 y navega con ← →.
6. **Finalizar** calcula el resultado (APTO ≥ 70, REVISIÓN 55–69, NO APTO < 55).

## Control de integridad del postulante

Antes de entrar a la sala, el postulante pasa un **control de seguridad**:

- **Sólo ordenador:** móviles y tablets quedan bloqueados.
- **Un único monitor:** si hay pantallas extra (`screen.isExtended`) no puede continuar.
- **Compartir pantalla completa:** se exige compartir el monitor entero (no una ventana ni pestaña). El entrevistador ve una captura cada ~4 s en la sala.
- **Pantalla completa** del navegador.

Si durante la sesión deja de compartir, conecta otro monitor o sale de pantalla completa, su vista se bloquea hasta que lo corrija y se registra una **incidencia crítica**. También se registran cambio de pestaña, pérdida de foco y pegado de texto.

Requiere Google Chrome o Microsoft Edge en un ordenador. Una web no puede bloquear el sistema operativo ni impedir el uso de otros dispositivos: lo que hace es detectarlo y dejar constancia.

## Pruebas psicotécnicas en directo

Desde la sala, el entrevistador **lanza** cualquiera de las 5 pruebas: se abre en la pantalla del postulante, el entrevistador ve su progreso y su pantalla en directo, y la nota se guarda automáticamente en la entrevista.

## Desarrollo

```bash
npm install
cp .env.example .env   # opcional
npm run dev
```

## Notas

- El banco de preguntas (`src/data/questions.ts`) y la normativa (`src/data/normativa.ts`) son contenido de ejemplo: sustitúyelos por los vuestros.
- El login no es una autenticación real; `VITE_ACCESS_CODE` sólo añade una barrera básica y la API `/api/records` es pública.
- Sistema de animación: [`src/lib/animations.ts`](src/lib/animations.ts) y guía en [`src/docs/MOTION.md`](src/docs/MOTION.md).
