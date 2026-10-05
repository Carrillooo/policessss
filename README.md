# LSPD Recruitment System

Sistema interno de reclutamiento del LSPD: entrevistas en tiempo real, normativa, pruebas psicotécnicas y analítica.

**Stack:** Vite · React 19 · TypeScript · Tailwind v4 · Motion · componentes inspirados en React Bits · Radix · cmdk · Zustand · Supabase.

## Puesta en marcha (Vercel + Supabase)

Sin Supabase la app funciona en **modo local**: los datos sólo existen en tu navegador y el enlace del postulante **no** funciona en otro dispositivo.

1. Crea un proyecto en [supabase.com](https://supabase.com) **o** instala la integración **Supabase** desde Vercel → Storage / Marketplace (crea las variables `NEXT_PUBLIC_SUPABASE_*` automáticamente, que la app también acepta; en ese caso salta el paso 4).
2. En **SQL Editor** ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. En **Project Settings → API** copia la *Project URL* y la *anon public key*.
4. En Vercel → tu proyecto → **Settings → Environment Variables** añade:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ACCESS_CODE` (opcional: código que se pide para entrar al panel)
5. Vuelve a desplegar (**Deployments → Redeploy**). Las variables `VITE_*` se leen al compilar.

`vercel.json` redirige todas las rutas a `index.html`, así que los enlaces `/portal/CÓDIGO` y recargar cualquier página ya no dan 404.

## Uso

1. Entra con tu nombre (y el código de acceso si lo configuraste).
2. **Nueva entrevista** → nombre del postulante + ID de Discord → **Crear**. Siempre se generan 30 preguntas aleatorias.
3. Copia el enlace y envíaselo al postulante.
4. Cuando abra el enlace lo verás en *Sala de espera* (dashboard y sala de la entrevista). Pulsa **INICIAR ENTREVISTA**.
5. Sus respuestas e incidencias (cambio de pestaña, pérdida de foco, salida de pantalla completa, pegado) llegan en tiempo real. Evalúa con 1/2/3 y navega con ← →.
6. **Finalizar** calcula el resultado (APTO ≥ 70, REVISIÓN 55–69, NO APTO < 55).

## Desarrollo

```bash
npm install
cp .env.example .env   # opcional
npm run dev
```

## Notas

- El banco de preguntas (`src/data/questions.ts`) y la normativa (`src/data/normativa.ts`) son contenido de ejemplo: sustitúyelos por los vuestros.
- El login no es una autenticación real; `VITE_ACCESS_CODE` sólo añade una barrera básica. La tabla de Supabase es accesible con la clave anónima.
- Sistema de animación: [`src/lib/animations.ts`](src/lib/animations.ts) y guía en [`src/docs/MOTION.md`](src/docs/MOTION.md).
