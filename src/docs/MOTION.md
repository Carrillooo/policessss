# LSPD · Motion Design System

Guía interna de movimiento. **Todo valor de animación sale de `src/lib/animations.ts`.**
Si necesitas una duración o curva nueva, añádela allí; nunca la escribas a mano en un componente.

## Prioridades

1. Claridad · 2. Usabilidad · 3. Jerarquía visual · 4. Feedback · 5. Animación · 6. Decoración

Una animación nunca debe retrasar leer una pregunta, evaluar a un candidato, consultar normativa o usar un formulario.

## Duraciones

| Token              | Valor  | Uso                                  |
| ------------------ | ------ | ------------------------------------ |
| `DURATION.micro`   | 140 ms | hover, focus, toggles                |
| `DURATION.button`  | 160 ms | pulsación de botones                 |
| `DURATION.card`    | 220 ms | cards, filas, elementos de lista     |
| `DURATION.modal`   | 260 ms | modales, palette, drawers            |
| `DURATION.page`    | 300 ms | cambio de página (sólo el contenido) |
| `DURATION.counter` | 900 ms | CountUp, barras de progreso          |
| `DURATION.flash`   | 700 ms | destello de actualización realtime   |

Transiciones listas para usar: `FAST_TRANSITION`, `HOVER_TRANSITION`, `DEFAULT_TRANSITION`,
`MODAL_TRANSITION`, `PAGE_TRANSITION`, `SPRING_TRANSITION`, `INDICATOR_SPRING`, `EXIT_TRANSITION`.

## Tipos de movimiento

| Tipo                | Firma                                               | Variante / helper                |
| ------------------- | --------------------------------------------------- | -------------------------------- |
| **ENTER**           | fade + y 8px                                        | `enterVariants`, `cardVariants`  |
| **EXIT**            | fade + y −4px, curva `in`, más rápido que la entrada | `EXIT_TRANSITION`                |
| **SUCCESS**         | marca que aterriza (spring) + glow verde            | `markVariants`, `FEEDBACK_COLOR` |
| **WARNING**         | igual que SUCCESS en ámbar                          | `markVariants`                   |
| **ERROR**           | igual que SUCCESS en rojo; sin sacudidas            | `markVariants`                   |
| **REALTIME UPDATE** | cae desde arriba + destello de borde                | `realtimeEnterVariants`, `flashBorder()` |
| **PAGE CHANGE**     | fade + y 10px + blur 4px, sólo `<main>`             | `pageVariants`                   |
| **QUESTION CHANGE** | sale a la izquierda / entra desde la derecha + blur | `questionVariants` (custom = dirección) |
| **MODAL**           | overlay fade + scale .96 + blur                     | `modalVariants`, `overlayVariants` |
| **DRAWER**          | entra desde la derecha con spring                   | `drawerVariants`                 |
| **TOAST**           | sube con spring, sale hacia la derecha              | `toastVariants`                  |

## Reglas

- Las entradas escalonadas usan `staggerContainer(STAGGER.x)`; nunca más de ~10 hijos con retardo.
- Contadores: siempre `<CountUp>` — interpola desde el valor actual, nunca salta.
- Realtime: animar **sólo** el componente afectado (selectores de zustand granulares).
- Fondos animados (Aurora, LightRays, Particles) sólo en: login, sala de espera, resultado final y cabecera del dashboard. Nunca detrás de tablas.
- `Particles` se carga perezosamente (`LazyParticles`) y se pausa con la pestaña oculta.
- Reduced motion: `<MotionConfig reducedMotion="user">` en la raíz + CSS global. Los elementos marcados `data-decorative="true"` desaparecen.
- Animar `transform`, `opacity` y `filter`; evitar animar `width/height` salvo en barras de progreso.
