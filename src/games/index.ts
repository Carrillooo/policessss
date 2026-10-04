import { Brain, Car, MapPinned, ScanEye, Zap } from 'lucide-react'
import type { GameDef, GameId } from './types'
import Memoria from './Memoria'
import Reaccion from './Reaccion'
import Atencion from './Atencion'
import Matriculas from './Matriculas'
import Reconstruccion from './Reconstruccion'

export type { GameDef, GameId, GameProps, GameDetail, GameProgress } from './types'

export const GAMES: GameDef[] = [
  {
    id: 'memoria',
    name: 'Memoria operativa',
    tagline: 'SECUENCIAS · MEMORIA DE TRABAJO',
    description:
      'Una secuencia de símbolos se enciende sobre la retícula y desaparece. Reprodúcela en el mismo orden. Cada ronda añade elementos.',
    instructions: [
      'Observa el orden numerado en que aparecen los símbolos.',
      'Cuando se oculten, pulsa las celdas en ese mismo orden.',
      'Seis rondas de dificultad creciente (3 → 7 elementos).',
    ],
    controls: [
      ['Clic', 'Seleccionar celda'],
      ['← ↑ → ↓', 'Moverse'],
      ['Enter', 'Seleccionar'],
    ],
    icon: Brain,
    accent: '56 189 248',
    durationLabel: '≈ 2 MIN',
    component: Memoria,
  },
  {
    id: 'reaccion',
    name: 'Tiempo de reacción',
    tagline: 'RESPUESTA · ESTÍMULO VISUAL',
    description:
      'El panel cambiará de golpe tras un intervalo aleatorio. Responde lo más rápido posible. Anticiparte penaliza.',
    instructions: [
      'Pulsa el panel para armar el intento y espera.',
      'Cuando aparezca «¡AHORA!», pulsa inmediatamente.',
      'Cinco intentos. Se puntúa la media en milisegundos.',
    ],
    controls: [
      ['Espacio', 'Responder'],
      ['Clic / toque', 'Responder'],
    ],
    icon: Zap,
    accent: '251 146 60',
    durationLabel: '≈ 1 MIN',
    component: Reaccion,
  },
  {
    id: 'atencion',
    name: 'Atención selectiva',
    tagline: 'VIGILANCIA · DISCRIMINACIÓN',
    description:
      'Un flujo continuo de símbolos atraviesa el escáner. Detecta sólo la placa policial ★ e ignora los distractores de forma similar.',
    instructions: [
      'Pulsa sobre la placa ★ o presiona Espacio mientras esté en pantalla.',
      'No reacciones a otros símbolos: cuentan como falsa alarma.',
      'Una placa que sale sin detectar es una omisión.',
    ],
    controls: [
      ['Espacio', 'Objetivo presente'],
      ['Clic / toque', 'Marcar símbolo'],
    ],
    icon: ScanEye,
    accent: '167 139 250',
    durationLabel: '≈ 40 S',
    component: Atencion,
  },
  {
    id: 'matriculas',
    name: 'Matrículas',
    tagline: 'RETENCIÓN · IDENTIFICACIÓN VEHICULAR',
    description:
      'Una placa de San Andreas cruza tu campo visual durante un instante. Identifícala entre placas casi idénticas o tecléala de memoria.',
    instructions: [
      'Memoriza la placa mientras la barra de exposición se vacía.',
      'Elige la placa correcta entre cuatro similares, o escríbela.',
      'Ocho vehículos; la exposición se acorta progresivamente.',
    ],
    controls: [
      ['1 – 4', 'Elegir placa'],
      ['Enter', 'Verificar'],
    ],
    icon: Car,
    accent: '96 165 250',
    durationLabel: '≈ 2 MIN',
    component: Matriculas,
  },
  {
    id: 'reconstruccion',
    name: 'Reconstrucción de escena',
    tagline: 'MEMORIA ESPACIAL · ESCENA',
    description:
      'Vehículos, personas y objetos se despliegan sobre un plano táctico. Al ocultarse, recoloca cada elemento en su posición original.',
    instructions: [
      'Memoriza la posición de cada elemento en el plano.',
      'Arrástralos de vuelta o selecciónalos y pulsa la celda.',
      'Exacto = punto completo · celda adyacente = medio punto.',
    ],
    controls: [
      ['Arrastrar', 'Colocar'],
      ['Tab + Enter', 'Elegir elemento'],
      ['← ↑ → ↓', 'Moverse por el plano'],
    ],
    icon: MapPinned,
    accent: '45 212 191',
    durationLabel: '≈ 2 MIN',
    component: Reconstruccion,
  },
]

export const getGame = (id?: string) => GAMES.find((g) => g.id === id) as GameDef | undefined

export const isGameId = (id?: string): id is GameId => GAMES.some((g) => g.id === id)
