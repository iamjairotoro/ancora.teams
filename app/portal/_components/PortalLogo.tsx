/* Marca del portal: dos imágenes y el CSS muestra la que corresponde al tema (sin JavaScript, sin parpadeo). */
import ui from './portal.module.css'

/** `height`: número (px) o una medida CSS («3.5rem»: así sigue la escala del portal). */
export default function PortalLogo({ height }: { height: number | string }) {
  const st = { height, width: 'auto', objectFit: 'contain' as const }
  return (
    <>
      <img className={ui.logoLight} src="/logo-icon-green.png" alt="Áncora" style={st} />
      <img className={ui.logoDark} src="/logo-icon-cream.png" alt="" aria-hidden="true" style={st} />
    </>
  )
}
