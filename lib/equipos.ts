// ── EQUIPOS ──
// Fuente única de verdad para clasificar los INSTRUMENTOS de un miembro (Member.instrumentos,
// lo que cada persona marca en su Perfil) en equipos. Ojo: esto es distinto de los códigos
// de nominación por servicio (AG1, VX1, SONIDO1, etc. en banda_assignments/service_blocks) —
// esos son "slots" de un servicio puntual, no el equipo al que pertenece la persona.
//
// Un miembro puede estar en varios equipos a la vez (ej. toca guitarra Y hace sonido).
//
// Para agregar un equipo nuevo a futuro (ej. "Streaming", "Producción"):
// 1. Agrega los valores de Instrument correspondientes (ver lib/types.ts) a un nuevo array
// 2. Agrégalo al objeto EQUIPOS
// 3. Si ese equipo debe ser convocado a Ensayo, agrégalo a EQUIPOS_ENSAYO
// El resto del código (filtros, convocatorias) se actualiza solo.

import type { Instrument } from './types'

export const INSTR_BANDA: Instrument[] = [
  'Guitarra Acustica','Guitarra Electrica','Piano','Bajo','Bateria',
  'MD (Direccion Musical en vivo)','Perc menores',
]
export const INSTR_VOCES: Instrument[] = ['Voz']
export const INSTR_TECNICA: Instrument[] = ['Sonido','Montaje']

export const EQUIPOS = {
  banda:   { label: 'Banda',   instrumentos: INSTR_BANDA as readonly string[] },
  voces:   { label: 'Voces',   instrumentos: INSTR_VOCES as readonly string[] },
  tecnica: { label: 'Técnica', instrumentos: INSTR_TECNICA as readonly string[] },
} as const

export type EquipoKey = keyof typeof EQUIPOS

// Qué equipos se convocan automáticamente a Ensayo. Técnica queda afuera a propósito.
export const EQUIPOS_ENSAYO: EquipoKey[] = ['banda', 'voces']

// Devuelve en qué equipos está un miembro, según sus instrumentos.
export function equiposDeMiembro(instrumentos: string[] = []): EquipoKey[] {
  return (Object.keys(EQUIPOS) as EquipoKey[]).filter(key =>
    EQUIPOS[key].instrumentos.some(i => instrumentos.includes(i))
  )
}

// ¿Este miembro debería ser convocado a un Ensayo? (está en Banda o Voces,
// sin importar si también está en Técnica u otro equipo)
export function esConvocableAEnsayo(instrumentos: string[] = []): boolean {
  const instrumentosConvocables = EQUIPOS_ENSAYO.flatMap(key => EQUIPOS[key].instrumentos)
  return instrumentos.some(i => instrumentosConvocables.includes(i))
}

// ── Códigos de posición para nominación por servicio (banda_assignments / service_blocks) ──
// Estos SÍ son distintos de los instrumentos de arriba — son slots numerados de un servicio.
export const POSICIONES_BANDA = ['AG1','AG2','EG','KEYS','BASS','DRUMS','MD'] as const
export const POSICIONES_VX = ['VX1','VX2','VX3','VX4'] as const
export const POSICIONES_TECNICA = ['SONIDO1','SONIDO2','MONTAJE1','MONTAJE2','MONTAJE3','MONTAJE4','MONTAJE5','MONTAJE6','MONTAJE7','MONTAJE8'] as const

export const LABEL_TECNICA: Record<string,string> = {
  SONIDO1:'SONIDO', SONIDO2:'SONIDO ASIST',
  MONTAJE1:'MONTAJE 1', MONTAJE2:'MONTAJE 2',
  MONTAJE3:'MONTAJE 3', MONTAJE4:'MONTAJE 4',
  MONTAJE5:'MONTAJE 5', MONTAJE6:'MONTAJE 6',
  MONTAJE7:'MONTAJE 7', MONTAJE8:'MONTAJE 8',
}
