'use client'
/* Pantalla de canción del portal (punto 55, commit 1: la letra). Referencia: docs/mockup-musico-v2.html.
   - La letra y los créditos se piden de UNA canción a la vez a /api/portal/cancion (exige acceso a la biblioteca, punto 59);
     NO viajan en el catálogo. La hoja es components/canciones/LyricSheet.tsx (parseLyrics.ts no se toca).
   - «Aa»: fuente y tamaño, guardados en el perfil (members.chart_prefs) por /api/portal/preferencias; valen para todas las canciones.
   - Al desplazar la letra hacia abajo el menú se esconde (onOcultarMenu); al subir, o al salir, vuelve.
   Los Adjuntos PDF tienen su propia pantalla («Adjuntos – <canción>», PantallaAdjuntos + AdjuntosCancion.tsx → VisorPdf.tsx): se abre con el clip de la lectura con acordes o con «Adjuntos · N» de la pantalla de letra. Debajo de la letra va el Audio (AudioCancion.tsx: el video de YouTube y los archivos propios, que suenan en el reproductor flotante); los demás enlaces se mantienen aquí y se ordenan en el commit 6. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Paperclip } from 'lucide-react'
import { LyricSheet } from '@/components/canciones/LyricSheet'
import LecturaCancion from './lectura/LecturaCancion'
import type { HojaAcordesDatos } from '@/lib/lecturaAcordes'
import { portalFetch } from '@/lib/portal/portalFetch'
import { useTipografiaLetra } from './tipografia/useTipografiaLetra'
import PanelTipografia from './tipografia/PanelTipografia'
import VentanaTipografia from './tipografia/VentanaTipografia'
import { useTelefonoYa } from '@/lib/useTelefonoYa'
import { TEXTOS_TIPOGRAFIA } from '@/lib/textos/tipografia'
import AudioCancion from './AudioCancion'
import type { EstadoAudio, PistaAudio } from './ReproductorFlotante'
import AdjuntosCancion from './AdjuntosCancion'
import PantallaAdjuntos from '@/components/adjuntos/PantallaAdjuntos'
import { TEXTOS_ADJUNTOS } from '@/lib/textos/pantallaAdjuntos'
import type { AdjuntoPublico } from '@/lib/portal/adjuntos'
import ui from './cancion-portal.module.css'

export interface CancionDeLista {
  id: string; nombre: string; artista: string
  tono_original?: string; bpm?: number; compas?: string; duracion_min?: number; notas?: string
  link_spotify?: string; link_letras?: string; link_recursos?: string
}
interface Hoja { id: string; nombre: string; original_title: string | null; autor: string | null; traductor: string | null
  letra: string | null; ccli: string | null; copyright: string | null }
// La hoja con acordes (solo si la canción tiene tono y todas sus variantes están en formato 2): `acordes` viene null en las demás.

function toMMSS(min: number) { const m = Math.floor(min), s = Math.round((min - m) * 60); return `${m}:${s.toString().padStart(2, '0')}` }

export default function CancionPortal({ token, song, onVolver, etiquetaVolver = 'Canciones', onOcultarMenu, audioActivo, onReproducirAudio, tonoServicio }: {
  token: string | null
  song: CancionDeLista
  onVolver: () => void
  /** El texto del botón de volver: «Canciones» desde la lista; «Volver» cuando se abrió desde el Orden de un servicio. */
  etiquetaVolver?: string
  onOcultarMenu: (ocultar: boolean) => void
  audioActivo: EstadoAudio | null       // qué archivo de audio está en el reproductor flotante (y si suena)
  onReproducirAudio: (p: PistaAudio) => void
  /** El tono de ESTA canción en el servicio desde el que se abrió (service_blocks.tono); sin él (o desde la lista de Canciones) se lee en el original. */
  tonoServicio?: string | null
}) {
  const [hoja, setHoja] = useState<Hoja | null>(null)
  const [acordes, setAcordes] = useState<HojaAcordesDatos | null>(null)
  const [adjuntos, setAdjuntos] = useState<AdjuntoPublico[]>([])
  const [audios, setAudios] = useState<AdjuntoPublico[]>([])
  const [errorAdjuntos, setErrorAdjuntos] = useState(false)
  const [adjAbiertos, setAdjAbiertos] = useState(false)      // la pantalla «Adjuntos – <canción>»
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const { prefs, elegir, errPrefs } = useTipografiaLetra(token)      // fuente y tamaño del perfil (los comparte el Perfil)
  const [aaAbierto, setAaAbierto] = useState(false)
  const telefono = useTelefonoYa()
  const idActual = useRef(song.id)

  const cargarHoja = useCallback(async () => {
    const id = song.id
    idActual.current = id
    setEstado('cargando')
    try {
      const res = await portalFetch(token, `/api/portal/cancion?id=${encodeURIComponent(id)}`)
      const data = res.ok ? await res.json() : null
      if (idActual.current !== id) return              // respuesta tardía de otra canción
      if (!data?.song) { setEstado('error'); return }
      setHoja(data.song); setAcordes(data.acordes ?? null); setAdjuntos(Array.isArray(data.adjuntos) ? data.adjuntos : []); setAudios(Array.isArray(data.audios) ? data.audios : []); setErrorAdjuntos(!!data.adjuntosError); setEstado('listo')
    } catch { if (idActual.current === id) setEstado('error') }
  }, [token, song.id])

  useEffect(() => { setHoja(null); setAcordes(null); setAdjuntos([]); setAudios([]); setErrorAdjuntos(false); setAdjAbiertos(false); cargarHoja(); window.scrollTo(0, 0) }, [cargarHoja])

  // El menú se esconde al leer hacia abajo y vuelve al subir (o al llegar arriba). Siempre vuelve al salir.
  useEffect(() => {
    let ultimo = window.scrollY, oculto = false
    const alDesplazar = () => {
      const y = window.scrollY, d = y - ultimo
      if (Math.abs(d) < 8) return
      const quiere = y > 80 && d > 0
      if (quiere !== oculto) { oculto = quiere; onOcultarMenu(quiere) }
      ultimo = y
    }
    window.addEventListener('scroll', alDesplazar, { passive: true })
    return () => { window.removeEventListener('scroll', alDesplazar); onOcultarMenu(false) }
  }, [onOcultarMenu])

  const tieneLetra = !!hoja?.letra?.trim()
  // La hoja con acordes es solo de teléfono (≤ 768 px): escritorio y tableta siguen con la hoja de letra de siempre, aunque la canción ya esté en formato 2 (el escritorio va en la etapa D).
  const verAcordes = !!acordes && telefono
  const nueva = estado === 'listo' && !!hoja && verAcordes
  const vars = { '--anc-letra-font': prefs.fontFamily, '--anc-letra-size': `calc(${prefs.textScale}rem / var(--esc, 1))`, '--anc-letra-lh': prefs.lineHeightWide ? 1.9 : 1.55 } as React.CSSProperties
  // El enlace de YouTube (songs.link_spotify) ya no es un botón: vive en la tarjeta de Audio. Si no es de YouTube, no se muestra.
  const enlaces = [
    song.link_letras && { href: song.link_letras, texto: 'Letra / acordes' },
    song.link_recursos && { href: song.link_recursos, texto: 'Recursos' },
  ].filter(Boolean) as { href: string; texto: string }[]

  return (
    <div className="anc">
      <div className={ui.wrap}>
        {nueva && acordes && hoja ? (
          // Lectura con acordes (C3): barra, cabecera, tira de partes y la hoja de siempre. Cualquier otra canción conserva la pantalla de letra de abajo, sin cambios.
          <LecturaCancion token={token} hoja={hoja} artista={song.artista} bpm={song.bpm} acordes={acordes} tonoServicio={tonoServicio} tipografia={{ prefs, elegir, errPrefs }}
            etiquetaVolver={etiquetaVolver} onVolver={onVolver} onAdjuntos={() => setAdjAbiertos(true)} />
        ) : (<>
        <button type="button" className={ui.back} onClick={onVolver}><ChevronLeft size={18} aria-hidden="true" />{etiquetaVolver}</button>

        <div className={ui.head}>
          <h2 className={ui.title}>Letra</h2>
          <button type="button" className={ui.aaBtn} onClick={() => setAdjAbiertos(true)} aria-haspopup="dialog">
            <Paperclip size={16} aria-hidden="true" />{adjuntos.length > 0 ? TEXTOS_ADJUNTOS.botonConConteo(adjuntos.length) : TEXTOS_ADJUNTOS.boton}
          </button>
          {telefono ? (
            // Teléfono: la ventanita junto al botón (la letra queda a la vista); la ancla es este envoltorio
            <div style={{ position: 'relative' }}>
              <button type="button" className={ui.aaBtn} aria-expanded={aaAbierto} aria-haspopup="dialog" aria-controls="aa-panel" onClick={() => setAaAbierto(v => !v)}>
                <b>{TEXTOS_TIPOGRAFIA.aa}</b>{TEXTOS_TIPOGRAFIA.boton}
              </button>
              {aaAbierto && <VentanaTipografia id="aa-panel" prefs={prefs} elegir={elegir} errPrefs={errPrefs} onCerrar={() => setAaAbierto(false)} />}
            </div>
          ) : (
            <button type="button" className={ui.aaBtn} aria-expanded={aaAbierto} aria-controls="aa-panel" onClick={() => setAaAbierto(v => !v)}>
              <b>Aa</b>Tipografía
            </button>
          )}
        </div>

        {!telefono && aaAbierto && <PanelTipografia id="aa-panel" prefs={prefs} elegir={elegir} errPrefs={errPrefs} />}

        <div className={ui.sheet}>
          {estado === 'cargando' && <p className={ui.state} role="status">Cargando letra…</p>}
          {estado === 'error' && (
            <div role="alert">
              <p className={`${ui.state} ${ui.stateErr}`}>No se pudo cargar la letra. Revisa tu conexión.</p>
              <button type="button" className={ui.retry} onClick={cargarHoja}>Reintentar</button>
            </div>
          )}
          {estado === 'listo' && hoja && (tieneLetra ? (
            <LyricSheet title={hoja.nombre} originalTitle={hoja.original_title || undefined} autor={hoja.autor || undefined} traductor={hoja.traductor || undefined}
              letra={hoja.letra || ''} ccli={hoja.ccli || undefined} copyright={hoja.copyright || undefined}
              typography={{ fontFamily: prefs.fontFamily, textScale: prefs.textScale, lineHeightWide: prefs.lineHeightWide, stageMode: false }}
              attachmentsCount={0} attachmentsLoaded={false} />
          ) : (
            <div className="anc-sheet" style={vars}>
              <h1 className="anc-sTitle">{hoja.nombre}</h1>
              <p className={ui.state}>Esta canción todavía no tiene letra.</p>
            </div>
          ))}
        </div>
        </>)}

        {/* Orden de la pantalla: LETRA → AUDIO. Los adjuntos tienen su propia pantalla (abajo). */}
        {estado === 'listo' && adjAbiertos && (
          <PantallaAdjuntos nombre={song.nombre} onVolver={() => setAdjAbiertos(false)}>
            <AdjuntosCancion key={`adj-${song.id}`} token={token} songId={song.id} adjuntos={adjuntos} errorLista={errorAdjuntos} />
          </PantallaAdjuntos>
        )}

        <AudioCancion key={`aud-${song.id}`} songId={song.id} nombre={song.nombre} enlaceYoutube={song.link_spotify} audios={audios}
          audioActivo={audioActivo} onReproducir={onReproducirAudio} />

        {(song.tono_original || song.bpm || song.compas || song.duracion_min || song.notas || enlaces.length > 0) && (
          <div className={ui.info}>
            <div className={ui.chips}>
              {song.tono_original && <span className={ui.chip}>Tono {song.tono_original}</span>}
              {song.bpm && <span className={ui.chip}>♩ {song.bpm} BPM</span>}
              {song.compas && <span className={ui.chip}>{song.compas}</span>}
              {song.duracion_min && <span className={ui.chip}>{toMMSS(song.duracion_min)}</span>}
            </div>
            {song.notas && <p className={ui.notas}>{song.notas}</p>}
            {enlaces.length > 0 && (
              <div className={ui.links}>
                {enlaces.map(l => <a key={l.href} className={ui.lk} href={l.href} target="_blank" rel="noopener noreferrer">{l.texto}</a>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
