// Pantalla de arranque / verificación de acceso, SOLO en teléfono (≤ 768 px): fondo claro u oscuro según la configuración del teléfono (no la preferencia guardada en la app), anillo dorado que gira suave alrededor del ícono de Áncora y «Verificando acceso…» discreto debajo. El ícono es el crema sobre oscuro y el verde sobre claro (<picture> con la media query del sistema: sin JavaScript, sin parpadeo).
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
          <picture>
            <source media="(prefers-color-scheme: dark)" srcSet="/logo-icon-cream.png" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={ui.logo} src="/logo-icon-green.png" alt="" width={400} height={400} decoding="async" />
          </picture>
        </div>
        <p className={ui.texto}>{T.verificando}</p>
      </div>
    </div>
  )
}
