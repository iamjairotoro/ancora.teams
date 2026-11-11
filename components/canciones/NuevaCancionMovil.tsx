'use client'
// «Nueva canción» en teléfono (paso A): la ventana «Datos» (título, artista, tono, BPM, compás, duración) y la pantalla «Más datos». Al pulsar «Crear…» se inserta la canción como BORRADOR (publicada = false) y se avisa al panel:
// «Crear y escribir la letra» sigue al editor de la canción; «Solo crear» vuelve a la lista. Sin adjuntos aquí: se suben después, desde la ficha. La lógica (validar, armar lo que se inserta) vive en lib/nuevaCancion.ts.
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Song } from '@/lib/types'
import { TONOS } from '@/lib/tonos'
import { datosVacios, payloadNueva, validarNueva, TEXTOS_NUEVA as T, type AccionCrear, type DatosNueva, type ErroresNueva } from '@/lib/nuevaCancion'
import ui from './nueva-cancion-movil.module.css'

const COMPASES = ['4/4', '3/4', '6/8', '12/8', '2/4', '5/4', '7/8']

export default function NuevaCancionMovil({ onCerrar, onCreada }: { onCerrar: () => void; onCreada: (cancion: Song, accion: AccionCrear) => void }) {
  const [d, setD] = useState<DatosNueva>(datosVacios)
  const [pantalla, setPantalla] = useState<'datos' | 'mas'>('datos')
  const [errores, setErrores] = useState<ErroresNueva>({})
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState<AccionCrear | null>(null)
  const [subiendo, setSubiendo] = useState(false), [errCaratula, setErrCaratula] = useState<string | null>(null)
  const tituloRef = useRef<HTMLInputElement>(null), tonoRef = useRef<HTMLSelectElement>(null), bpmRef = useRef<HTMLInputElement>(null), durRef = useRef<HTMLInputElement>(null)
  const set = (k: keyof DatosNueva) => (v: string) => { setD(x => ({ ...x, [k]: v })); setErrores(e => ({ ...e, [k]: undefined })); setError(null) }

  useEffect(() => { tituloRef.current?.focus() }, [])

  const crear = async (accion: AccionCrear) => {
    if (creando) return
    const e = validarNueva(d, accion)
    if (Object.keys(e).length) {
      setErrores(e); setPantalla('datos')
      setTimeout(() => (e.nombre ? tituloRef : e.tono ? tonoRef : e.bpm ? bpmRef : durRef).current?.focus(), 0)
      return
    }
    setCreando(accion); setError(null)
    const { data, error: err } = await supabase.from('songs').insert(payloadNueva(d)).select('*').single()
    if (err || !data) { setError(/tono_original_formato/.test(err?.message || '') ? T.tonoNoValido : T.errorCrear); setCreando(null); return }
    onCreada(data as Song, accion)
  }

  async function subirCaratula(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0]; if (!f) return
    if (f.size > 3 * 1024 * 1024) { setErrCaratula('La imagen debe ser menor a 3 MB.'); return }
    setSubiendo(true); setErrCaratula(null)
    const path = `nueva-${Date.now()}.${f.name.split('.').pop()}`
    const { error: up } = await supabase.storage.from('song-covers').upload(path, f, { upsert: true, contentType: f.type })
    if (up) { setErrCaratula(T.errorCaratula); setSubiendo(false); return }
    set('caratula_url')(supabase.storage.from('song-covers').getPublicUrl(path).data.publicUrl)
    setSubiendo(false)
  }

  const campo = (clave: keyof DatosNueva, etiqueta: string, extra: { ph?: string; tipo?: string; ref?: React.Ref<HTMLInputElement>; modo?: 'decimal' | 'numeric' } = {}) => (
    <label className={ui.campo}>{etiqueta}
      <input ref={extra.ref} className={ui.input} type={extra.tipo ?? 'text'} inputMode={extra.modo} placeholder={extra.ph} value={d[clave]} onChange={e => set(clave)(e.target.value)} aria-invalid={!!(errores as Record<string, string | undefined>)[clave]} />
    </label>
  )

  return (
    <div className={ui.velo} role="dialog" aria-modal="true" aria-label={T.titulo}>
      <div className={ui.hoja}>
        {pantalla === 'datos' ? (
          <>
            <div className={ui.cab}>
              <button type="button" className={ui.icono} onClick={onCerrar} aria-label={T.cerrar}><X size={20} aria-hidden /></button>
              <h2>{T.titulo}</h2><span className={ui.icono} aria-hidden />
            </div>
            <div className={ui.cuerpo}>
              <label className={ui.campo}><span>{T.campoNombre} <b className={ui.req} aria-hidden>*</b></span>
                <input ref={tituloRef} className={ui.input} value={d.nombre} onChange={e => set('nombre')(e.target.value)} aria-invalid={!!errores.nombre} aria-required />
              </label>
              {errores.nombre && <p className={ui.error} role="alert">{errores.nombre}</p>}
              {campo('artista', T.campoArtista, { ph: T.ayudaArtista })}
              <div className={ui.par}>
                <label className={ui.campo}>{T.campoTono}
                  <select ref={tonoRef} className={ui.input} value={d.tono} onChange={e => set('tono')(e.target.value)} aria-invalid={!!errores.tono}>
                    <option value="">{T.sinElegir}</option>
                    {TONOS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                {campo('bpm', T.campoBpm, { tipo: 'text', modo: 'decimal', ref: bpmRef })}
              </div>
              {errores.tono && <p className={ui.error} role="alert">{errores.tono}</p>}
              {errores.bpm && <p className={ui.error} role="alert">{errores.bpm}</p>}
              <div className={ui.par}>
                <label className={ui.campo}>{T.campoCompas}
                  <select className={ui.input} value={d.compas} onChange={e => set('compas')(e.target.value)}>
                    <option value="">{T.sinElegir}</option>
                    {COMPASES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                {campo('duracion', T.campoDuracion, { ph: T.ayudaDuracion, ref: durRef })}
              </div>
              {errores.duracion && <p className={ui.error} role="alert">{errores.duracion}</p>}
              <button type="button" className={ui.mas} onClick={() => setPantalla('mas')}>
                <span><b>{T.masDatos}</b><small>{T.masDatosAyuda}</small></span><ChevronRight size={20} aria-hidden />
              </button>
              {error && <p className={ui.error} role="alert">{error}</p>}
            </div>
            <div className={ui.pie}>
              <button type="button" className={ui.principal} onClick={() => crear('escribir')} disabled={!!creando}>{creando === 'escribir' ? T.creando : T.crearEscribir}</button>
              <button type="button" className={ui.secundario} onClick={() => crear('solo')} disabled={!!creando}>{creando === 'solo' ? T.creando : T.soloCrear}</button>
            </div>
          </>
        ) : (
          <>
            <div className={ui.cab}>
              <button type="button" className={ui.icono} onClick={() => setPantalla('datos')} aria-label={T.volver}><ChevronLeft size={22} aria-hidden /></button>
              <h2>{T.masDatos}</h2>
              <button type="button" className={ui.texto} onClick={() => setPantalla('datos')}>{T.listo}</button>
            </div>
            <div className={ui.cuerpo}>
              {campo('original_title', T.campoOriginal)}
              {campo('autor', T.campoAutor)}
              {campo('traductor', T.campoTraductor)}
              <div className={ui.par}>{campo('ccli', T.campoCcli)}{campo('copyright', T.campoCopyright)}</div>
              {campo('link_spotify', T.campoYoutube, { tipo: 'url' })}
              {campo('link_letras', T.campoLetras, { tipo: 'url' })}
              {campo('link_recursos', T.campoRecursos)}
              {campo('notas', T.campoNotas)}
              <div className={ui.campo}>{T.campoCaratula}
                <div className={ui.caratula}>
                  <span className={ui.mini} aria-hidden>{d.caratula_url ? <img src={d.caratula_url} alt="" /> : '🎵'}</span>
                  <label className={ui.archivo}>{subiendo ? T.subiendoCaratula : d.caratula_url ? T.cambiarCaratula : T.elegirCaratula}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={subirCaratula} disabled={subiendo} />
                  </label>
                </div>
                {errCaratula && <p className={ui.error} role="alert">{errCaratula}</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
