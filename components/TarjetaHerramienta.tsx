// La tarjeta común de las herramientas del servicio (Checklist, Cronograma, Notas): fondo, borde y esquinas redondeadas. Recorta lo que se sale (overflow:hidden) para respetar las esquinas, por eso
// NINGÚN menú puede abrirse dentro de ella con position:absolute: los menús (⋯) van con <MenuFlotante>, que sale por portal (hoja inferior en teléfono). tests/portal/menus-recorte.test.js lo vigila.
import type { ReactNode } from 'react'

export default function TarjetaHerramienta({ children }: { children: ReactNode }) {
  return <div className="am-h" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>{children}</div>
}
