'use client'
// «Personas» del LÍDER en teléfono (etapa 3): SU equipo, que puede administrar (agregar a una persona que ya existe, quitarla, cambiar sus posiciones), y los demás equipos plegados en «Solo lectura» con nombre y posiciones.
// Los datos vienen de /api/lider/personas, que recorta en el servidor (teléfono y correo solo de su equipo; nunca foto). El filtro del buscador es solo de pantalla sobre lo que ya llegó. Un equipo ajeno se dibuja con
// PersonasEquipoAjeno, que no recibe ni importa nada que escriba; el único bloque que escribe es PersonasEquipoPropio.
import { useState } from 'react'
import { Search } from 'lucide-react'
import ErrorDeCarga from '../ErrorDeCarga'
import PersonasEquipoAjeno from './PersonasEquipoAjeno'
import PersonasEquipoPropio from './PersonasEquipoPropio'
import { useCarga } from './useCarga'
import type { EquipoPersonas } from '@/lib/lider/personasLider'
import { TEXTOS_LIDER as T, TEXTOS_PERSONAS_LIDER as TP } from '@/lib/textos/servicioLider'
import ui from './lider-movil.module.css'

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function PersonasLider() {
  const [c, recargar] = useCarga<{ equipos: EquipoPersonas[] }>('/api/lider/personas')
  const [q, setQ] = useState('')
  const filtro = sinTildes(q.trim())
  const coincide = (nombre: string, apellido: string, posiciones: string[]) => !filtro || sinTildes(`${nombre} ${apellido} ${posiciones.join(' ')}`).includes(filtro)
  return (
    <div className={ui.pagina}>
      <h1 className={ui.titulo}>{TP.titulo}</h1>
      <p className={ui.ayuda}>{TP.ayuda}</p>
      <label className={ui.buscador}><Search size={18} aria-hidden="true" /><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={TP.buscarEnPantalla} aria-label={TP.buscarEnPantalla} autoComplete="off" /></label>
      {c.estado === 'cargando' ? <p className={ui.mensaje} role="status">{T.cargando}</p>
        : c.estado === 'prohibido' ? <p className={ui.mensaje}>{T.sinAcceso}</p>
        : c.estado === 'error' ? <ErrorDeCarga compacto titulo={T.noSePudoCargar} cuerpo={T.noSePudoCargarCuerpo} onReintentar={recargar} />
        : c.datos.equipos.map(e => e.tuEquipo
          ? <PersonasEquipoPropio key={e.id} equipo={e} onCambio={recargar} personasVisibles={e.personas.filter(p => coincide(p.nombre, p.apellido, p.posiciones.map(x => x.nombre)))} />
          : (!filtro || e.personas.some(p => coincide(p.nombre, p.apellido, p.posiciones))) && <PersonasEquipoAjeno key={e.id} abierto={!!filtro} equipo={filtro ? { ...e, personas: e.personas.filter(p => coincide(p.nombre, p.apellido, p.posiciones)) } : e} />)}
    </div>
  )
}
