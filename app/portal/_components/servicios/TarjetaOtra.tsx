'use client'
// La tarjeta común de Servicios para lo que NO es una convocatoria de equipo (punto 54, commit 3): un ensayo (con su estado) o un servicio donde la persona no tiene convocatoria
// («Nominación pendiente» si el admin aún no envió la nómina, «No convocado» si ya la envió). Mismo aspecto que las tarjetas de equipo, sin franja de color; toda ella abre el detalle.
import { ChevronRight } from 'lucide-react'
import { IndicadorEstado, textoEstado, vistaDeEntrada } from '../convocatorias/estado'
import { horarioTexto } from '@/lib/portal/agruparServicios'
import type { EntradaServicioPortal } from './Servicios'
import ui from './servicios.module.css'

export default function TarjetaOtra({ entrada, conHora, onAbrir }: { entrada: EntradaServicioPortal; conHora: boolean; onAbrir: () => void }) {
  const s = entrada.service
  const esEnsayo = s.tipo === 'ensayo'
  const vista = vistaDeEntrada(entrada)
  const nombre = esEnsayo ? 'Ensayo' : (s.titulo || 'Servicio')
  const detalle = [conHora ? horarioTexto(s.hora_inicio, s.hora_fin) : null, esEnsayo && s.titulo && s.titulo !== 'Ensayo' ? s.titulo : null, s.lugar || null].filter(Boolean).join(' · ')
  const estado = vista ? textoEstado(entrada) : esEnsayo ? 'No convocado' : entrada.nominaSent ? 'No convocado' : 'Nominación pendiente'
  return (
    <article className={ui.otra}>
      <button type="button" className={ui.otraAbrir} onClick={onAbrir} aria-label={`${nombre}: ${estado}. Ver detalle`}>
        {vista ? <IndicadorEstado vista={vista} /> : <span className={ui.sinEstado} aria-hidden="true" />}
        <span className={ui.otraTxt}>
          <b>{nombre}</b>
          {detalle && <span>{detalle}</span>}
          <span className={vista ? ui.otraEstado : ui.otraMuda}>{estado}</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" className={ui.chevron} />
      </button>
    </article>
  )
}
