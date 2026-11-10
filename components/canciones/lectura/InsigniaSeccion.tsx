// La insignia de cada sección en la lectura (etapa C3a): el código de la parte en un círculo de su color y, al lado, el nombre de la sección.
import type { ClaveParte } from '@/lib/partesCancion'
import ui from './lectura-partes.module.css'

export default function InsigniaSeccion({ abrev, clave, nombre }: { abrev: string; clave: ClaveParte; nombre: string }) {
  return (
    <p className={ui.insignia} data-parte={clave}>
      <span className={ui.insigniaCod} aria-hidden="true">{abrev}</span>
      <span className={ui.insigniaNombre}>{nombre}</span>
    </p>
  )
}
