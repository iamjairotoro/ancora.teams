// Señal discreta de «se está actualizando»: un punto pequeño junto al título, con la etiqueta solo para lectores de pantalla (ningún texto visible). Quieto con «reducir movimiento».
import { TEXTOS_SERVICIO as T } from '@/lib/textos/servicio'
import sk from './esqueleto.module.css'

export default function PuntoActualizando() {
  return <i className={sk.punto} role="status" aria-label={T.actualizando} />
}
