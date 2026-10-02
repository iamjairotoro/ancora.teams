// Listas del formulario de personas (alta y edición en TeamPanel, pop-up de
// alta en AddPersonDialog) en un solo lugar — antes vivían sueltas dentro de
// TeamPanel.tsx. Los valores y etiquetas son los de siempre, sin cambios.
import type { Instrument, Genero, EstadoCivil } from './types'

// Los instrumentos NO son decoración: alimentan lib/equipos.ts
// (esConvocableAEnsayo → quién recibe la convocatoria a ensayo).
export const ALL_INSTRUMENTOS: Instrument[] = [
  'Guitarra Acustica','Guitarra Electrica','Piano',
  'MD (Direccion Musical en vivo)','Bajo','Bateria','Voz','Sonido','Montaje','Perc menores'
]

export const INSTRUMENTO_CORTO: Record<string, string> = {
  'Guitarra Acustica': 'AG', 'Guitarra Electrica': 'EG',
  'MD (Direccion Musical en vivo)': 'MD', 'Perc menores': 'Perc',
  'Piano': 'Piano', 'Bajo': 'Bass',
  'Bateria': 'Drums', 'Voz': 'Voz', 'Sonido': 'Sonido', 'Montaje': 'Montaje',
}

export const GENERO_OPTIONS: { value: Genero; label: string }[] = [
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'otro', label: 'Otro' },
]

export const ESTADO_CIVIL_OPTIONS: { value: EstadoCivil; label: string }[] = [
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'casado', label: 'Casado/a' },
  { value: 'otro', label: 'Otro' },
]
