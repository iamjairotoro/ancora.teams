// El esqueleto del servicio (y de la pantalla de un equipo) en teléfono mientras llegan los datos: la usan el administrador y el líder, así ninguno ve otra pantalla antes de la definitiva.
import { TEXTOS_SERVICIO as T } from '@/lib/textos/servicio'

export default function EsqueletoServicio() {
  return (
    <div className="anc" role="status" aria-label={T.cargando}>
      <div className="anc-skel" style={{ height: 44, width: '70%', marginBottom: 14 }} />
      <div className="anc-skel" style={{ height: 150, marginBottom: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[0, 1, 2, 3].map(i => <div key={i} className="anc-skel" style={{ height: 150 }} />)}</div>
    </div>
  )
}
