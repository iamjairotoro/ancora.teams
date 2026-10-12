/* Degradado bajo la barra de estado del iPhone (punto 53). Mide el margen superior; sin margen no se ve. */
import ui from './portal-nav.module.css'

export default function PortalStatusFade() {
  return <div className={ui.statusFade} aria-hidden="true" />
}
