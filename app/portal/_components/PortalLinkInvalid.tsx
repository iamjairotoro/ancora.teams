// «Enlace no válido» del portal (punto 48): lo que se ve al abrir una URL antigua /portal/member_<id>, que identificaba a la persona solo por su id y ya no abre nada.
// Punto 54, commit 7: sin estilos en línea (acceso.module.css, en rem y tokens --anc-*), así sigue la escala del portal.
import { MSG_LINK_INVALID } from '@/lib/auth/accessLink'
import ui from './acceso/acceso.module.css'

export default function PortalLinkInvalid() {
  return (
    <main className={ui.pantalla}>
      <div role="alert" className={ui.tarjeta}>
        <p className={ui.titulo}>{MSG_LINK_INVALID}</p>
        <p className={ui.texto}>Este enlace ya no sirve. Entra con tu cuenta de Google o pide un enlace nuevo a tu líder.</p>
        <a href="/portal" className={ui.ir}>Ir a mi portal</a>
      </div>
    </main>
  )
}
