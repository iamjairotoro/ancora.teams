'use client'
// La hoja de un elemento del Orden del servicio en TELÉFONO (Orden-Hoja-A y -B): reemplaza al panel antiguo (que en teléfono seguía con campos de 13 px, selector nativo de canciones y «Eliminar» arriba). Es contenido
// largo, así que es una hoja desde abajo (HojaBase), no una ventana centrada. Campos con borde, radio 12 y 16 px reales; «Guardar» arriba y «Quitar del orden» abajo, en rojo, con la confirmación en ventana centrada que
// ya tenemos. «Canción» abre una lista con buscador (título/artista) y un check en la elegida, en la misma hoja. Los botones quedan pegados abajo y se ven por encima del teclado (HojaBase sigue al visualViewport).
// Solo presenta y avisa: lo que se guarda y cómo (PATCH/DELETE de service_blocks) lo hace OrdenDelServicio, igual que con el panel de escritorio.
import { useId, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import HojaBase from '../admin-movil/HojaBase'
import { confirmar } from '@/lib/ventanas/ventanas'
import { TEXTOS_ORDEN_ADMIN as T } from '@/lib/textos/ordenAdmin'
import { filtrarCanciones } from '@/lib/orden/elegirCancion'
import { fromMMSS, toMMSS } from '@/lib/orden/duracion'
import type { ServiceBlock, Song } from '@/lib/types'
import CampoBusqueda from '../campos/CampoBusqueda'
import ui from './hoja-bloque-orden.module.css'

export default function HojaBloqueOrden({ block, songs, vocalistas, tonos, onGuardar, onQuitar, onCerrar }: {
  block: ServiceBlock
  songs: Song[]
  /** Quienes pueden liderar: las personas asignadas a este servicio en Voces. */
  vocalistas: { id: string; nombre: string }[]
  tonos: readonly string[]
  onGuardar: (cambios: Partial<ServiceBlock>) => Promise<void>
  onQuitar: () => Promise<void>
  onCerrar: () => void
}) {
  const id = useId()
  const esCancion = block.tipo === 'cancion'
  const [vista, setVista] = useState<'form' | 'elegir'>('form')
  const [songId, setSongId] = useState(block.song_id || '')
  const [tono, setTono] = useState(block.tono || '')
  const [leadId, setLeadId] = useState(block.lead_id || '')
  const [titulo, setTitulo] = useState(block.titulo || '')
  const [obs, setObs] = useState((block as ServiceBlock & { notas?: string | null }).notas || '')
  const [dur, setDur] = useState(block.duracion_min ? toMMSS(block.duracion_min) : '')
  const [guardando, setGuardando] = useState(false)
  const [consulta, setConsulta] = useState('')
  const elegida = songs.find(s => s.id === songId)
  const visibles = useMemo(() => filtrarCanciones(songs.map(s => ({ ...s, artista: (s as Song & { artista?: string | null }).artista })), consulta), [songs, consulta])

  async function guardar(cerrar: (d?: () => void) => void) {
    setGuardando(true)
    if (esCancion) await onGuardar({ song_id: songId || undefined, titulo: elegida?.nombre || titulo, tono: tono || undefined, lead_id: leadId || undefined, notas: obs } as Partial<ServiceBlock>)
    else await onGuardar({ titulo, duracion_min: fromMMSS(dur) || 0, notas: obs } as Partial<ServiceBlock>)
    setGuardando(false)
    cerrar()
  }
  async function quitar(cerrar: (d?: () => void) => void) {
    if (!(await confirmar(T.quitarPregunta, { accion: T.quitarAccion, peligro: true }))) return
    await onQuitar()
    cerrar()
  }

  const cabeza = vista === 'elegir'
    ? <div className={ui.cabezaElegir}><button type="button" className={ui.volver} onClick={() => { setVista('form'); setConsulta('') }} aria-label={T.volver}><ChevronLeft size={20} aria-hidden="true" /></button><h2 id={id} className={hoja.titulo}>{T.tituloElegir}</h2></div>
    : <h2 id={id} className={hoja.titulo}>{esCancion ? T.tituloCancion : T.tituloBloque}</h2>

  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={cabeza}>
      {cerrar => vista === 'elegir' ? (
        <div className={ui.elegir}>
          <CampoBusqueda valor={consulta} onCambio={setConsulta} placeholder={T.buscar} etiqueta={T.buscar} />
          {visibles.length === 0
            ? <p className={ui.vacio}>{T.sinResultados}</p>
            : <ul className={ui.lista} role="listbox" aria-label={T.tituloElegir}>
                {visibles.map(c => (
                  <li key={c.id} role="presentation">
                    <button type="button" role="option" aria-selected={c.id === songId} className={ui.cancion} onClick={() => { setSongId(c.id); setVista('form'); setConsulta('') }}>
                      <span className={ui.txt}><span className={ui.nombre}>{c.nombre}</span>{c.artista && <span className={ui.artista}>{c.artista}</span>}</span>
                      {c.id === songId && <Check size={20} className={ui.check} aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>}
        </div>
      ) : (
        <form className={ui.form} onSubmit={e => { e.preventDefault(); void guardar(cerrar) }}>
          {esCancion ? (
            <>
              <div className={ui.campo}>
                <span className={ui.etiqueta} id={`${id}-c`}>{T.cancion}</span>
                <button type="button" className={`${ui.entrada} ${ui.elegirBtn}`} aria-labelledby={`${id}-c`} aria-haspopup="listbox" onClick={() => setVista('elegir')}>
                  <span className={elegida ? undefined : ui.placeholder}>{elegida?.nombre || T.elegirCancion}</span><ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
              <div className={ui.par}>
                <label className={ui.campo}><span className={ui.etiqueta}>{T.tono}</span>
                  <span className={ui.selectCaja}><select className={ui.entrada} value={tono} onChange={e => setTono(e.target.value)}><option value="">{T.sinTono}</option>{tonos.map(n => <option key={n} value={n}>{n}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></span></label>
                <label className={ui.campo}><span className={ui.etiqueta}>{T.lidera}</span>
                  <span className={ui.selectCaja}><select className={ui.entrada} value={leadId} onChange={e => setLeadId(e.target.value)}><option value="">{T.sinLider}</option>{vocalistas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></span></label>
              </div>
            </>
          ) : (
            <>
              <label className={ui.campo}><span className={ui.etiqueta}>{T.titulo}</span><input className={ui.entrada} value={titulo} onChange={e => setTitulo(e.target.value)} /></label>
              <label className={ui.campo}><span className={ui.etiqueta}>{T.duracion}</span><input className={ui.entrada} value={dur} onChange={e => setDur(e.target.value)} placeholder={T.duracionEjemplo} inputMode="text" /></label>
            </>
          )}
          <label className={ui.campo}><span className={ui.etiqueta}>{T.observacion}</span><textarea className={`${ui.entrada} ${ui.area}`} rows={3} value={obs} onChange={e => setObs(e.target.value)} placeholder={T.observacionEjemplo} /></label>
          <div className={ui.pie}>
            <button type="submit" className={ui.guardar} disabled={guardando}>{guardando ? T.guardando : T.guardar}</button>
            <button type="button" className={ui.quitar} disabled={guardando} onClick={() => void quitar(cerrar)}>{T.quitar}</button>
          </div>
        </form>
      )}
    </HojaBase>
  )
}
