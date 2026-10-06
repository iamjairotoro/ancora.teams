// Listas del formulario de personas (pop-up de alta y edición,
// AddPersonDialog) en un solo lugar. Los instrumentos ya no están: se
// retiraron de la interfaz (punto 40) y lib/equipos.ts, que los usa para
// los ensayos, tiene sus propias listas.
import type { Genero, EstadoCivil } from './types'

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
