'use client'
/* Pantalla de canción del portal (punto 55, commit 1: la letra). Referencia: docs/mockup-musico-v2.html.
   - La letra y los créditos se piden de UNA canción a la vez a /api/portal/cancion (exige acceso a la biblioteca, punto 59);
     NO viajan en el catálogo. La hoja es components/canciones/LyricSheet.tsx (parseLyrics.ts no se toca).
   - «Aa»: fuente y tamaño, guardados en el perfil (members.chart_prefs) por /api/portal/preferencias; valen para todas las canciones.
   - Al desplazar la letra hacia abajo el menú se esconde (onOcultarMenu); al subir, o al salir, vuelve.
   Debajo de la letra van los Adjuntos PDF (AdjuntosCancion.tsx → VisorPdf.tsx) y el Audio (AudioCancion.tsx: el video de YouTube y los archivos propios, que suenan en el reproductor flotante); los demás enlaces se mantienen aquí y se ordenan en el commit 6. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { LyricSheet } from '@/components/canciones/LyricSheet'
import { portalFetch } from '@/lib/portal/portalFetch'
import { DEFAULT_LYRIC_PREFS, FONT_OPTIONS, SIZE_STEPS, type LyricPrefs } from '@/lib/lyricPrefs'
import AudioCancion from './AudioCancion'
import type { EstadoAudio, PistaAudio } from './ReproductorFlotante'
import AdjuntosCancion from './AdjuntosCancion'
import type { AdjuntoPublico } from '@/lib/portal/adjuntos'
import ui from './cancion-portal.module.css'

export interface CancionDeLista {
  id: string; nombre: string; artista: string
  tono_original?: string; bpm?: number; compas?: string; duracion_min?: number; notas?: string
  link_spotify?: string; link_letras?: string; link_recursos?: string
}
interface Hoja { id: string; nombre: string; original_title: string | null; autor: string | null; traductor: string | null
  letra: string | null; ccli: string | null; copyright: string | null }

const NOMBRES_TAMANO = ['Pequeño', 'Normal', 'Grande', 'Muy grande']
function toMMSS(min: number) { const m = Math.floor(min), s = Math.round((min - m) * 60); return `${m}:${s.toString().padStart(2, '0')}` }

// Las preferencias se recuerdan mientras la página siga abierta: al volver a una canción no hay parpadeo de la fuente.
let prefsEnMemoria: LyricPrefs | null = null

export default function CancionPortal({ token, song, onVolver, onOcultarMenu, audioActivo, onReproducirAudio }: {
  token: string | null
  song: CancionDeLista
  onVolver: () => void
  onOcultarMenu: (ocultar: boolean) => void
  audioActivo: EstadoAudio | null       // qué archivo de audio está en el reproductor flotante (y si suena)
  onReproducirAudio: (p: PistaAudio) => void
}) {
  const [hoja, setHoja] = useState<Hoja | null>(null)
  const [adjuntos, setAdjuntos] = useState<AdjuntoPublico[]>([])
  const [audios, setAudios] = useState<AdjuntoPublico[]>([])
  const [errorAdjuntos, setErrorAdjuntos] = useState(false)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [prefs, setPrefs] = useState<LyricPrefs>(prefsEnMemoria ?? DEFAULT_LYRIC_PREFS)
  const [aaAbierto, setAaAbierto] = useState(false)
  const [errPrefs, setErrPrefs] = useState(false)
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
      setHoja(data.song); setAdjuntos(Array.isArray(data.adjuntos) ? data.adjuntos : []); setAudios(Array.isArray(data.audios) ? data.audios : []); setErrorAdjuntos(!!data.adjuntosError); setEstado('listo')
    } catch { if (idActual.current === id) setEstado('error') }
  }, [token, song.id])

  useEffect(() => { setHoja(null); setAdjuntos([]); setAudios([]); setErrorAdjuntos(false); cargarHoja(); window.scrollTo(0, 0) }, [cargarHoja])

  // Tipografía guardada en el perfil (una vez por visita; si falla, se usa la de siempre).
  useEffect(() => {
    if (prefsEnMemoria) return
    portalFetch(token, '/api/portal/preferencias').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.letra) { prefsEnMemoria = d.letra; setPrefs(d.letra) }
    }).catch(() => {})
  }, [token])

  function elegir(patch: Partial<Pick<LyricPrefs, 'fontFamily' | 'textScale'>>) {
    const next = { ...prefs, ...patch }
    setPrefs(next); prefsEnMemoria = next; setErrPrefs(false)
    portalFetch(token, '/api/portal/preferencias', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ letra: patch }) })
      .then(r => { if (!r.ok) setErrPrefs(true) }).catch(() => setErrPrefs(true))
  }

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
  const vars = { '--anc-letra-font': prefs.fontFamily, '--anc-letra-size': `${prefs.textScale}rem`, '--anc-letra-lh': prefs.lineHeightWide ? 1.9 : 1.55 } as React.CSSProperties
  // El enlace de YouTube (songs.link_spotify) ya no es un botón: vive en la tarjeta de Audio. Si no es de YouTube, no se muestra.
  const enlaces = [
    song.link_letras && { href: song.link_letras, texto: 'Letra / acordes' },
    song.link_recursos && { href: song.link_recursos, texto: 'Recursos' },
  ].filter(Boolean) as { href: string; texto: string }[]

  return (
    <div className="anc">
      <div className={ui.wrap}>
        <button type="button" className={ui.back} onClick={onVolver}><ChevronLeft size={18} aria-hidden="true" />Canciones</button>

        <div className={ui.head}>
          <h2 className={ui.title}>Letra</h2>
          <button type="button" className={ui.aaBtn} aria-expanded={aaAbierto} aria-controls="aa-panel" onClick={() => setAaAbierto(v => !v)}>
            <b>Aa</b>Tipografía
          </button>
        </div>

        {aaAbierto && (
          <div className={ui.aa} id="aa-panel">
            <p className={ui.aaLabel}>FUENTE</p>
            <div className={ui.fonts} role="group" aria-label="Fuente">
              {FONT_OPTIONS.map(o => (
                <button key={o.f} type="button" className={ui.opt} aria-pressed={prefs.fontFamily === o.f} onClick={() => elegir({ fontFamily: o.f })}>
                  <b style={{ fontFamily: o.f }}>{o.label}</b><span>{o.sub}</span>
                </button>
              ))}
            </div>
            <p className={ui.aaLabel}>TAMAÑO</p>
            <div className={ui.sizes} role="group" aria-label="Tamaño">
              {SIZE_STEPS.map((z, i) => (
                <button key={z} type="button" className={ui.size} aria-pressed={prefs.textScale === z} aria-label={NOMBRES_TAMANO[i] ?? `Tamaño ${i + 1}`}
                  style={{ fontSize: `${0.6875 + i * 0.1}rem` }} onClick={() => elegir({ textScale: z })}>A</button>
              ))}
            </div>
            <p className={ui.aaNote}>Tú eliges fuente y tamaño; se guarda en tu perfil y vale para todas las canciones.</p>
            {errPrefs && <p className={ui.aaErr} role="alert">No se pudo guardar tu elección; vale solo mientras tengas esta pantalla abierta.</p>}
          </div>
        )}

        <div className={ui.sheet}>
          {estado === 'cargando' && <p className={ui.state} role="status">Cargando letra…</p>}
          {estado === 'error' && (
            <div role="alert">
              <p className={`${ui.state} ${ui.stateErr}`}>No se pudo cargar la letra. Revisá tu conexión.</p>
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

        {/* Orden de la pantalla: LETRA → ADJUNTOS → AUDIO */}
        {estado === 'listo' && <AdjuntosCancion key={`adj-${song.id}`} token={token} songId={song.id} adjuntos={adjuntos} errorLista={errorAdjuntos} />}

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
