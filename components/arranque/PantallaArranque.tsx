// Pantalla de arranque / verificación de acceso, SOLO en teléfono (≤ 768 px): degradado azul marino, anillo dorado que gira suave alrededor del ícono de Áncora y «Verificando acceso…» discreto debajo. Igual en claro y oscuro.
// Es una capa fija que cubre toda la pantalla y que el CSS oculta (display:none) desde 769 px: en escritorio y tablet no se ve ni cambia nada de lo que ya había debajo. Sin retraso: aparece con el primer pintado,
// así no hay destello de otra pantalla. Con «reducir movimiento» el anillo queda quieto. Respeta las zonas seguras (notch y barra inferior).
import { TEXTOS_ARRANQUE as T } from '@/lib/textos/arranque'
import ui from './arranque.module.css'

export default function PantallaArranque() {
  return (
    <div className={ui.raiz} role="status" aria-live="polite">
      <div className={ui.centro}>
        <div className={ui.marco}>
          <span className={ui.anillo} aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={ui.logo} src="/logo-icon-cream.png" alt="" width={400} height={400} decoding="async" />
        </div>
        <p className={ui.texto}>{T.verificando}</p>
      </div>
    </div>
  )
}
