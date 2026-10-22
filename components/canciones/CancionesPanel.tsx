/* ════════════════════════════════════════════════════════════════════════
   CancionesPanel.tsx — "la página" que consume SongList.tsx (el diseño en
   sí, sin modificar) contra el esquema real de esta app. Ver
   migrations/017-canciones.sql, 020-canciones-solo-letra.sql e
   INSTRUCCIONES-canciones.md.

   El esquema real de `songs` usa nombres en español y ya tiene datos en
   producción (nombre, artista, tono_original, compas, caratula_url, …) —
   no se renombra nada, todo el mapeo español↔inglés vive acá.

   Fase 20 — cambio de rumbo a "solo letra": se abandonó el editor manual
   de acordes. La vista de canción usa LyricSheet.tsx (docs/mockup-letra.html),
   no SongChart.tsx. SongChart.tsx, chords.ts, parseChart.ts y
   ChordEditor.tsx quedan intactos y sin usar — igual que song_sections/
   song_section_variants/default_arrangement/service_song_arrangements en
   la base. Si se retoma el modo acordes, no hay que reconstruir nada.
   ════════════════════════════════════════════════════════════════════════ */
'use client'

import MenuFlotante from '@/components/MenuFlotante'
import ErrorDeCarga from '../ErrorDeCarga'
import { TEXTOS } from '@/lib/textos/comun'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MoreHorizontal, FileText, Music, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { portalFetch } from '@/lib/portal/portalFetch'
import type { Song, Service, TeamTool, ChartPrefs } from '@/lib/types'
import { SongList, type SongRow, type SongFilter } from './SongList'
import { parseLyrics } from '@/lib/parseLyrics'
import { LyricSheet } from './LyricSheet'
import { DEFAULT_LYRIC_FONT, FONT_OPTIONS, SIZE_STEPS } from '@/lib/lyricPrefs'
import { extraerIdYoutube } from '@/lib/youtube'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { ACCEPT_SUBIDA } from '@/lib/subidaArchivos'
import { PanelSubida, useSubidaAdjuntos } from './SubidaAdjuntos'
import { BUCKET_ADJUNTOS, BUCKETS_FIRMABLES, TTL_FIRMA_AUDIO_SEG, TTL_FIRMA_PDF_SEG } from '@/lib/portal/adjuntos'
// SongChart.tsx / chords.ts / parseChart.ts / ChordEditor.tsx quedan
// intactos y SIN USAR (fase 20 — se abandonó el editor de acordes). Si se
// retoma el modo acordes, no hay que reconstruirlos.

const NOTAS    = ['A','A#','Bb','B','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab']
const COMPASES = ['4/4','3/4','6/8','12/8','2/4','5/4','7/8']
const MESES    = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function lastPlayedLabel(fecha: string) {
  const d = new Date(fecha + 'T12:00:00')
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}`
}
function toMMSS(totalSeconds: number): string {
  if (!totalSeconds) return ''
  const m = Math.floor(totalSeconds / 60), s = Math.round(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
function fromMMSS(val: string): number {
  if (!val) return 0
  if (val.includes(':')) { const [m,s] = val.split(':').map(Number); return (m||0)*60 + (s||0) }
  return parseFloat(val) * 60
}

// Fase 20: la extracción de metadatos desde texto pegado (título/tono/bpm/
// "escrito por") era del flujo de acordes — parseChart interpretaba
// encabezados de sección para saber dónde terminaba el preámbulo. Sin
// acordes no hay ese preámbulo que separar: la letra se escribe directo
// en el formato "NOMBRE:\n<letra>" (lib/parseLyrics.ts). Se sacó esa
// lógica de acá; parseChart.ts sigue intacto y sin usar.

// Punto 55: AL GUARDAR, el enlace de YouTube se comprueba (¿es de YouTube?, ¿existe?, ¿se puede incrustar?) por el servidor (oEmbed).
// Solo AVISA: quien administra decide si guarda igual. No guarda nada nuevo ni bloquea si YouTube no responde.
async function avisoDelEnlaceYoutube(enlace: string): Promise<string | null> {
  if (!extraerIdYoutube(enlace)) return 'Este enlace no parece ser de YouTube. En el portal solo se muestran videos de YouTube: este no se va a ver.'
  try {
    const res = await fetch('/api/admin/youtube-oembed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: enlace }) })
    const r = res.ok ? await res.json() : null
    if (r?.estado === 'no_existe') return 'YouTube dice que este video no existe o es privado.'
    if (r?.estado === 'no_incrustable') return 'El dueño del video no permite incrustarlo: en el portal se verá la miniatura y «Abrir en YouTube», pero no se reproducirá dentro de la app.'
  } catch { /* sin conexión con la comprobación: no se bloquea nada */ }
  return null
}

const DEFAULT_CHART_PREFS: Required<ChartPrefs> = {
  view: 'both', textScale: 1, notation: 'american', twoColumns: false, stageMode: false,
  fontFamily: DEFAULT_LYRIC_FONT, lineHeightWide: false,
}
// FONT_OPTIONS y SIZE_STEPS viven en lib/lyricPrefs.ts (las comparte el portal, punto 55).

type Draft = Partial<Song>
const newEmpty = (): Draft => ({ nombre:'', artista:'', autor:'', traductor:'', tono_original:'', compas:'', bpm:undefined,
  link_spotify:'', link_letras:'', link_recursos:'', caratula_url:'', letra:'',
  notas:'', duracion_min:undefined, original_title:'', ccli:'', copyright:'' })

interface Props {
  songs: Song[]
  onRefreshSongs: () => void
  memberId: string | null
  services: Service[]
  teamTools: TeamTool[]
  teamMembersFlat: { id:string; member_id:string; team_id:string; is_leader:boolean }[]
  // Hoy este panel solo se monta desde /admin, detrás del propio gate de
  // isOrgAdmin — pero se pasa explícito (no se asume por dónde se montó)
  // para que el botón "Agregar letra" de LyricSheet nunca aparezca si
  // algún día este panel se reusa en una vista de solo lectura.
  isAdmin?: boolean
  // La carga de /admin falló: en vez de «0 canciones», el aviso con «Reintentar».
  errorCarga?: string | null
  onReintentarCarga?: () => void
}

export default function CancionesPanel({ songs, onRefreshSongs, memberId, services, teamTools, teamMembersFlat, isAdmin, errorCarga = null, onReintentarCarga }: Props) {
  const [view, setView] = useState<'list'|'chart'>('list')
  const [selectedId, setSelectedId] = useState<string|null>(null)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SongFilter>('all')
  const [sortMode, setSortMode] = useState<'alpha'|'recent'>('alpha')

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [lastPlayed, setLastPlayed] = useState<Record<string,string>>({}) // song_id -> fecha (ISO)
  const [chordSongIds, setChordSongIds] = useState<Set<string>>(new Set())

  const [editing, setEditing] = useState<Draft|null>(null)
  const [saving, setSaving] = useState(false)
  const [ytAviso, setYtAviso] = useState<string|null>(null)   // aviso de la comprobación del enlace de YouTube (punto 55)
  useEffect(() => { if (!editing) setYtAviso(null) }, [editing])   // un aviso es de UN formulario: al cerrarlo, se va
  const [uploadingCover, setUploadingCover] = useState(false)
  const [menuForId, setMenuForId] = useState<string|null>(null)
  // SongList.tsx (tal cual) no expone el evento del clic al "⋯", solo el id
  // — se captura la posición en la fase de captura para anclar el menú
  // junto al botón que se apretó, sin tocar el componente.
  const [menuPos, setMenuPos] = useState<{x:number;y:number}>({x:0,y:0})
  const [attachmentsFor, setAttachmentsFor] = useState<Song|null>(null)
  const [showPrefs, setShowPrefs] = useState(false)
  const [showDetailMenu, setShowDetailMenu] = useState(false)

  // Fase 20: no hay más wizard de creación (pegar→interpretar→corregir
  // acordes) — ese flujo era enteramente para interpretar charts con
  // acordes. Ahora "Nueva canción"/"Editar" abren directo el mismo
  // formulario, que incluye el textarea de letra (ver el editor más abajo).

  // ── preferencias de lectura de la canción, por persona (punto 8) ──
  const [prefs, setPrefs] = useState<Required<ChartPrefs>>(DEFAULT_CHART_PREFS)
  useEffect(() => {
    if (!memberId) return
    // Punto 50 (paso 0a): por /api/portal/preferencias con la sesión de Google; `members` ya no se lee ni se escribe desde el navegador con la llave pública.
    portalFetch(null, '/api/portal/preferencias').then(r => r.ok ? r.json() : null).then(d => { if (d?.chart) setPrefs(prev => ({ ...prev, ...d.chart })) }).catch(() => {})
  }, [memberId])
  function updatePrefs(patch: Partial<ChartPrefs>) {
    setPrefs(prev => {
      const next = { ...prev, ...patch }
      // solo viaja lo que cambió (fuente, tamaño, interlineado, modo escenario): el servidor lo mezcla con lo guardado
      if (memberId) portalFetch(null, '/api/portal/preferencias', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chart: patch }) }).catch(() => {})
      return next
    })
  }

  // modo escenario: pantalla despierta mientras se usa. Sin drama si el
  // navegador no soporta Wake Lock — sigue funcionando, solo sin eso.
  const wakeLock = useRef<any>(null)
  useEffect(() => {
    if (!prefs.stageMode || !('wakeLock' in navigator)) return
    let released = false
    ;(navigator as any).wakeLock.request('screen').then((wl: any) => { if (!released) wakeLock.current = wl; else wl.release() }).catch(() => {})
    return () => { released = true; wakeLock.current?.release?.(); wakeLock.current = null }
  }, [prefs.stageMode])

  // ── datos de soporte para la lista: favoritas, "tocada el...", con/sin chart ──
  useEffect(() => {
    if (!memberId) return
    supabase.from('song_favorites').select('song_id').eq('member_id', memberId)
      .then(({data}) => setFavoriteIds(new Set((data||[]).map((r:any)=>r.song_id))))
  }, [memberId])

  useEffect(() => {
    supabase.from('service_blocks').select('song_id, service:services(fecha)')
      .eq('tipo','cancion').not('song_id','is',null)
      .then(({data}) => {
        const map: Record<string,string> = {}
        for (const row of (data||[]) as any[]) {
          const fecha = row.service?.fecha
          if (!fecha || !row.song_id) continue
          if (!map[row.song_id] || fecha > map[row.song_id]) map[row.song_id] = fecha
        }
        setLastPlayed(map)
      })
    supabase.from('song_sections').select('song_id')
      .then(({data}) => setChordSongIds(new Set((data||[]).map((r:any)=>r.song_id))))
  }, [songs.length])

  // ── mapeo Song (español, DB real) → SongRow (inglés, el diseño) ──
  const rows: SongRow[] = useMemo(() => songs
    .filter(s => !s.archived_at)
    .map(s => ({
      id: s.id, title: s.nombre, artist: s.artista||'', key: s.tono_original||'', bpm: s.bpm||0,
      lastPlayedLabel: lastPlayed[s.id] ? lastPlayedLabel(lastPlayed[s.id]) : null,
      isFavorite: favoriteIds.has(s.id),
    })), [songs, lastPlayed, favoriteIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = rows.filter(r => !q || r.title.toLowerCase().includes(q) || r.artist.toLowerCase().includes(q))
    if (filter==='favorites') out = out.filter(r=>r.isFavorite)
    else if (filter==='withChords') out = out.filter(r=>chordSongIds.has(r.id))
    else if (filter==='withoutChords') out = out.filter(r=>!chordSongIds.has(r.id))
    else if (filter==='playedThisMonth') {
      const now = new Date()
      out = out.filter(r => { const f=lastPlayed[r.id]; if(!f) return false; const d=new Date(f+'T12:00:00'); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear() })
    }
    out = [...out].sort((a,b) => sortMode==='alpha'
      ? a.title.localeCompare(b.title)
      : (lastPlayed[b.id]||'').localeCompare(lastPlayed[a.id]||''))
    return out
  }, [rows, query, filter, sortMode, chordSongIds, lastPlayed])

  async function onToggleFavorite(id: string) {
    if (!memberId) return
    const isFav = favoriteIds.has(id)
    setFavoriteIds(prev => { const next = new Set(prev); isFav ? next.delete(id) : next.add(id); return next })
    if (isFav) await supabase.from('song_favorites').delete().eq('member_id', memberId).eq('song_id', id)
    else await supabase.from('song_favorites').upsert({ member_id: memberId, song_id: id }, { onConflict: 'member_id,song_id' })
  }

  // ══════════ vista de detalle (letra) ══════════
  // El arreglo por servicio (service_song_arrangements) y las secciones
  // con acordes (song_sections) eran del modo acordes — quedan intactos en
  // la base, sin leerse acá. La hoja de letra es la misma para todos los
  // servicios, no tiene override por fecha.
  const [attachmentsCount, setAttachmentsCount] = useState(0)
  // LyricSheet decide qué texto mostrar en "sin letra" según si hay
  // adjuntos o no — mientras este número no se conoce de verdad (recién
  // cambiaste de canción, la consulta todavía no volvió), no alcanza con
  // "0": sería afirmar "sin adjuntos" antes de tiempo. Se resetea a false
  // apenas cambia selectedId, nunca se infiere de attachmentsCount===0.
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false)
  function onAttachmentsCount(n: number) { setAttachmentsCount(n); setAttachmentsLoaded(true) }
  // El bloque fijo (abajo de LyricSheet) y el modal (abierto desde el botón
  // "Adjuntos · N") son dos instancias de AttachmentsList, cada una con su
  // propia lista en memoria — subir o borrar un archivo desde el modal no
  // se enteraba de que el bloque fijo también necesitaba recargar. Un
  // número compartido que sube cada vez que CUALQUIERA de las dos termina
  // una subida/borrado hace que ambas vuelvan a correr su propio load()
  // (la misma función, con la misma guarda por song_id de antes) en vez de
  // inventar una recarga nueva.
  const [attachmentsRefreshToken, setAttachmentsRefreshToken] = useState(0)
  function bumpAttachmentsRefresh() { setAttachmentsRefreshToken(t => t + 1) }

  const selectedSong = songs.find(s => s.id === selectedId) || null

  // Antes había acá una consulta propia (head-count) que competía con la
  // de AttachmentsList.load() más abajo — dos consultas por la misma
  // cuenta, cuyo resultado podía llegar en cualquier orden y pisarse una
  // a la otra con un número distinto. AttachmentsList ya se monta siempre
  // en esta vista (punto 4), así que su load() es la única fuente de
  // verdad; acá solo se resetea el flag al cambiar de canción, sin lanzar
  // ninguna consulta propia.
  useEffect(() => { setAttachmentsLoaded(false) }, [selectedId])

  // ══════════ alta / edición de metadatos (reemplaza a SongsPanel) ══════════
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editing) return
    if (file.size > 3*1024*1024) { alert('La imagen debe ser menor a 3MB'); return }
    setUploadingCover(true)
    const ext = file.name.split('.').pop()
    const path = `${editing.id || 'nueva-'+Date.now()}.${ext}`
    const { error } = await supabase.storage.from('song-covers').upload(path, file, { upsert:true, contentType:file.type })
    if (error) { alert('Error subiendo la carátula'); setUploadingCover(false); return }
    const { data } = supabase.storage.from('song-covers').getPublicUrl(path)
    setEditing(prev => prev ? {...prev, caratula_url: data.publicUrl + '?t=' + Date.now()} : prev)
    setUploadingCover(false)
  }

  async function saveSong(guardarIgual = false) {
    if (!editing?.nombre) return
    setSaving(true)
    // Solo si el enlace es nuevo o cambió: editar otro campo no vuelve a consultar a YouTube.
    const enlace = (editing.link_spotify||'').trim()
    const enlaceAnterior = editing.id ? (songs.find(x => x.id === editing.id)?.link_spotify||'').trim() : ''
    if (!guardarIgual && enlace && enlace !== enlaceAnterior) {
      const aviso = await avisoDelEnlaceYoutube(enlace)
      if (aviso) { setYtAviso(aviso); setSaving(false); return }
    }
    setYtAviso(null)
    // OJO: `spotify_url` y `apple_music_url` (columnas heredadas) NO se envían: ya no se editan, y mandarlas vacías pisaría lo guardado.
    // `link_spotify` es el enlace de YOUTUBE (nombre heredado): esa columna sigue siendo la que se guarda.
    const payload = {
      nombre: editing.nombre, artista: editing.artista||'', autor: editing.autor||null, traductor: editing.traductor||null,
      tono_original: editing.tono_original||null,
      bpm: editing.bpm||null, compas: editing.compas||null, caratula_url: editing.caratula_url||null,
      link_spotify: editing.link_spotify||null, link_letras: editing.link_letras||null, link_recursos: editing.link_recursos||null,
      notas: editing.notas||null, duracion_min: editing.duracion_min||null,
      original_title: editing.original_title||null, ccli: editing.ccli||null, copyright: editing.copyright||null,
      letra: editing.letra||null,
    }
    if (editing.id) await supabase.from('songs').update(payload).eq('id', editing.id)
    else await supabase.from('songs').insert(payload)
    setSaving(false); setEditing(null); onRefreshSongs()
  }

  async function archiveSong(id: string) {
    await supabase.from('songs').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setMenuForId(null); onRefreshSongs()
  }
  async function deleteSong(id: string) {
    if (!confirm('¿Eliminar esta canción? Esta acción no se puede deshacer.')) return
    await supabase.from('songs').delete().eq('id', id)
    setMenuForId(null); onRefreshSongs()
  }

  if (errorCarga) return <ErrorDeCarga titulo="No se pudieron cargar las canciones" cuerpo={errorCarga} onReintentar={onReintentarCarga} />

  return (
    <div className="anc">
      {view==='list' && (
        <div onClickCapture={e => setMenuPos({x:(e as React.MouseEvent).clientX, y:(e as React.MouseEvent).clientY})}>
          <SongList
            songs={filtered} totalCount={rows.length}
            query={query} onQuery={setQuery}
            filter={filter} onFilter={setFilter}
            sortLabel={sortMode==='alpha' ? 'Alfabético' : 'Recientes'}
            onSort={() => setSortMode(m => m==='alpha' ? 'recent' : 'alpha')}
            onOpen={id => { setSelectedId(id); setView('chart') }}
            onToggleFavorite={onToggleFavorite}
            onMenu={id => setMenuForId(cur => cur===id ? null : id)}
            onAdd={() => setEditing(newEmpty())}
          />
          {menuForId && (() => {
            const s = songs.find(x=>x.id===menuForId); if (!s) return null
            return (
              <MenuFlotante titulo={`Acciones para ${s.nombre}`} onCerrar={()=>setMenuForId(null)} capa={50} puntoDeClic={menuPos}>
                <button onClick={()=>{setEditing({...s});setMenuForId(null)}}>Editar</button>
                <div className="anc-rowMenuSep"/>
                <button className="anc-rowMenuDanger" onClick={()=>archiveSong(s.id)}>Archivar</button>
                <button className="anc-rowMenuDanger" onClick={()=>deleteSong(s.id)}>Eliminar</button>
              </MenuFlotante>
            )
          })()}
        </div>
      )}

      {view==='chart' && selectedSong && (
        <>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <button className="anc-btn anc-btn--quiet" onClick={()=>setView('list')}>← Canciones</button>
            {/* Cabecera del detalle — siempre visible, no depende de hover.
                z-index propio: .anc-chartBar es sticky con z-index:40
                (app/songs.css) y si no, el menú queda detrás de la barra
                de notación al hacer scroll. El z-index alto va acá, en el
                contenedor, no en .anc-rowMenu. */}
            <div style={{position:'relative',zIndex:41}}>
              <button className="anc-rowMore" style={{opacity:1}} aria-label="Más acciones de la canción" onClick={()=>setShowDetailMenu(v=>!v)}>
                <MoreHorizontal size={16}/>
              </button>
              {showDetailMenu && (
                <MenuFlotante titulo={`Acciones para ${selectedSong.nombre}`} onCerrar={()=>setShowDetailMenu(false)} capa={41}>
                  <button onClick={()=>{setEditing({...selectedSong});setShowDetailMenu(false)}}>Editar</button>
                  <div className="anc-rowMenuSep"/>
                  <button className="anc-rowMenuDanger" onClick={()=>{archiveSong(selectedSong.id);setShowDetailMenu(false);setView('list')}}>Archivar</button>
                  <button className="anc-rowMenuDanger" onClick={()=>{deleteSong(selectedSong.id);setShowDetailMenu(false);setView('list')}}>Eliminar</button>
                </MenuFlotante>
              )}
            </div>
          </div>
          {/* Barra: Aa (tipografía), Editar, Adjuntos — a un clic, no
              enterrados (punto 5: quien necesita texto más grande lo
              necesita YA, con el teléfono en el atril). */}
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
            <button className="anc-btn anc-btn--quiet" onClick={()=>setShowPrefs(true)}>
              <b>Aa</b>&nbsp;Tipografía
            </button>
            <button className="anc-btn anc-btn--quiet" onClick={()=>{setEditing({...selectedSong})}}>Editar</button>
            <button className="anc-btn anc-btn--quiet" onClick={()=>setAttachmentsFor(selectedSong)}>
              Adjuntos{attachmentsCount>0 ? ` · ${attachmentsCount}` : ''}
            </button>
          </div>

          <div className="anc-panel" style={{marginBottom:16}}>
            <LyricSheet
              title={selectedSong.nombre} originalTitle={selectedSong.original_title}
              autor={selectedSong.autor} traductor={selectedSong.traductor}
              letra={selectedSong.letra||''} ccli={selectedSong.ccli} copyright={selectedSong.copyright}
              typography={{ fontFamily: prefs.fontFamily, textScale: prefs.stageMode ? 1.375 : prefs.textScale, lineHeightWide: prefs.lineHeightWide, stageMode: prefs.stageMode }}
              isAdmin={isAdmin} onAddLyrics={()=>setEditing({...selectedSong})}
              attachmentsCount={attachmentsCount} attachmentsLoaded={attachmentsLoaded}
            />
          </div>

          {/* Adjuntos — bloque fijo (punto 4). Es donde viven los acordes
              ahora, así que es información principal, no un ícono
              escondido. El modal de arriba sigue existiendo además
              (punto 6): en móvil el bloque queda abajo del todo y el
              acceso rápido desde la barra sigue sirviendo. */}
          <div className="anc-panel">
            <div className="anc-cHead">
              <h2>Adjuntos</h2>
              <span className="anc-spacer" />
            </div>
            <AttachmentsList song={selectedSong} memberId={memberId} onCountChange={onAttachmentsCount} isAdmin={isAdmin}
              refreshToken={attachmentsRefreshToken} onMutated={bumpAttachmentsRefresh} />
          </div>
        </>
      )}

      {/* Preferencias de tipografía — por persona, aplican a todas las
          canciones (docs/PENDIENTES-code.md, punto 8 · punto 5 fase 20).
          Se guarda en members.chart_prefs, no en la canción — si cada
          canción tuviera su fuente el repertorio se vería como un collage. */}
      {showPrefs && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'grid',placeItems:'center',background:'rgba(0,0,0,.3)'}} onClick={()=>setShowPrefs(false)}>
          <div className="anc-panel" onClick={e=>e.stopPropagation()} style={{width:'min(320px,92vw)',padding:18}}>
            <p style={{fontSize:13,fontWeight:700,marginBottom:2,color:'var(--anc-ink)'}}>Tipografía</p>
            <p style={{fontSize:11,color:'var(--anc-ink-3)',marginBottom:14}}>Cómo ves tú esta canción</p>

            <p style={{fontSize:10,fontWeight:700,color:'var(--anc-ink-3)',marginBottom:6}}>FUENTE</p>
            <div className="anc-notaGrid" style={{marginBottom:14}}>
              {FONT_OPTIONS.map(({f,label,sub}) => (
                <button key={f} className="anc-nb" aria-pressed={prefs.fontFamily===f} onClick={()=>updatePrefs({fontFamily:f})}>
                  <b style={{fontFamily:f}}>{label}</b><span>{sub}</span>
                </button>
              ))}
            </div>

            <p style={{fontSize:10,fontWeight:700,color:'var(--anc-ink-3)',marginBottom:6}}>TAMAÑO</p>
            <div className="anc-sizeRow">
              {SIZE_STEPS.map(sz => (
                <button key={sz} className="anc-sizeBtn" aria-pressed={prefs.textScale===sz} onClick={()=>updatePrefs({textScale:sz})}>A</button>
              ))}
            </div>

            <PrefRow title="Interlineado amplio" sub="Más aire entre líneas" on={prefs.lineHeightWide} onToggle={()=>updatePrefs({lineHeightWide:!prefs.lineHeightWide})} />
            <PrefRow title="Modo escenario" sub="Texto grande, sin pantalla en reposo" on={prefs.stageMode} onToggle={()=>updatePrefs({stageMode:!prefs.stageMode})} />

            <button className="anc-btn anc-btn--quiet" style={{marginTop:14}} onClick={()=>setShowPrefs(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {attachmentsFor && (
        <AttachmentsModal song={attachmentsFor} memberId={memberId} onCountChange={onAttachmentsCount} isAdmin={isAdmin}
          refreshToken={attachmentsRefreshToken} onMutated={bumpAttachmentsRefresh}
          onClose={() => setAttachmentsFor(null)} />
      )}

      {/* Alta/edición — ya no hay wizard de pegar→interpretar→corregir
          acordes (era enteramente del modo acordes, abandonado). "Nueva
          canción"/"Editar" abren esto directo; la letra se escribe acá
          mismo, en el textarea de más abajo, con vista previa en vivo
          (punto 3). */}
      {editing && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'grid',placeItems:'center',background:'rgba(0,0,0,.3)'}} onClick={()=>setEditing(null)}>
          <div className="anc-panel" onClick={e=>e.stopPropagation()} style={{width:'min(900px,94vw)',maxHeight:'86vh',overflowY:'auto',padding:20}}>
            <p style={{fontSize:14,fontWeight:700,marginBottom:4,color:'var(--anc-ink)'}}>{editing.id ? 'Editar canción' : 'Nueva canción'}</p>

            {/* Punto 2: el aviso de datos legales faltantes vive ACÁ, en
                edición — nunca en la vista de lectura. Es un recordatorio
                para quien administra, no un muro para quien canta. */}
            {!(editing.ccli && editing.copyright) && (
              <p className="anc-legalWarn">⚠ Faltan datos legales: {!editing.ccli && !editing.copyright ? 'CCLI y copyright' : !editing.ccli ? 'CCLI' : 'copyright'}.</p>
            )}

            <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:14}}>
              <label style={{cursor:'pointer',flexShrink:0}}>
                <div style={{width:56,height:56,borderRadius:8,overflow:'hidden',background:'var(--anc-sunk)',display:'grid',placeItems:'center'}}>
                  {editing.caratula_url ? <img src={editing.caratula_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span>🎵</span>}
                </div>
                <input type="file" accept="image/png,image/jpeg,image/webp" style={{display:'none'}} onChange={handleCoverUpload}/>
              </label>
              <p style={{fontSize:11,color:'var(--anc-ink-3)'}}>{uploadingCover?'Subiendo…':'Elige una carátula (máx. 3 MB)'}</p>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              <Field label="Título *" span2><input className="anc-input" value={editing.nombre||''} onChange={e=>setEditing({...editing,nombre:e.target.value})}/></Field>
              <Field label="Título original"><input className="anc-input" value={editing.original_title||''} onChange={e=>setEditing({...editing,original_title:e.target.value})}/></Field>
              <Field label="Artista"><input className="anc-input" value={editing.artista||''} onChange={e=>setEditing({...editing,artista:e.target.value})}/></Field>
              <Field label="Autor (letra y música)"><input className="anc-input" value={editing.autor||''} onChange={e=>setEditing({...editing,autor:e.target.value})}/></Field>
              <Field label="Traductor"><input className="anc-input" value={editing.traductor||''} onChange={e=>setEditing({...editing,traductor:e.target.value})}/></Field>
              <Field label="Tonalidad">
                <select className="anc-input" value={editing.tono_original||''} onChange={e=>setEditing({...editing,tono_original:e.target.value})}>
                  <option value="">—</option>{NOTAS.map(n=><option key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="BPM"><input className="anc-input" type="number" step="0.1" min="0" value={editing.bpm||''} onChange={e=>setEditing({...editing,bpm:parseFloat(e.target.value)||undefined})}/></Field>
              <Field label="Compás">
                <select className="anc-input" value={editing.compas||''} onChange={e=>setEditing({...editing,compas:e.target.value})}>
                  <option value="">—</option>{COMPASES.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Duración">
                <input className="anc-input" placeholder="ej: 6:59" value={editing.duracion_min?toMMSS(editing.duracion_min):''}
                  onChange={e=>setEditing({...editing,duracion_min:fromMMSS(e.target.value)||undefined})}/>
              </Field>
              <Field label="CCLI"><input className="anc-input" value={editing.ccli||''} onChange={e=>setEditing({...editing,ccli:e.target.value})}/></Field>
              <Field label="Copyright" span2><input className="anc-input" value={editing.copyright||''} onChange={e=>setEditing({...editing,copyright:e.target.value})}/></Field>
              <Field label="Link YouTube"><input className="anc-input" value={editing.link_spotify||''} onChange={e=>{setEditing({...editing,link_spotify:e.target.value});setYtAviso(null)}}/></Field>
              {ytAviso && (
                <div className="anc-legalWarn" role="alert" style={{gridColumn:'1 / -1',flexWrap:'wrap',marginBottom:0}}>
                  <span style={{flex:'1 1 240px'}}>⚠ {ytAviso}</span>
                  <button type="button" className="anc-btn anc-btn--quiet" onClick={()=>setYtAviso(null)}>Corregir el enlace</button>
                  <button type="button" className="anc-btn anc-btn--accent" onClick={()=>saveSong(true)} disabled={saving}>Guardar de todos modos</button>
                </div>
              )}
              <Field label="Letras / Acordes (enlace externo)"><input className="anc-input" value={editing.link_letras||''} onChange={e=>setEditing({...editing,link_letras:e.target.value})}/></Field>
              <Field label="Recursos" span2><input className="anc-input" value={editing.link_recursos||''} onChange={e=>setEditing({...editing,link_recursos:e.target.value})}/></Field>
              <Field label="Notas internas" span2><input className="anc-input" value={editing.notas||''} onChange={e=>setEditing({...editing,notas:e.target.value})}/></Field>
            </div>

            {/* Punto 3: un solo textarea, formato "NOMBRE:" + letra debajo,
                línea vacía separa secciones. Vista previa en vivo al
                costado — mismo parser que la hoja de lectura. */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label style={{fontSize:11,color:'var(--anc-ink-3)',marginBottom:4,display:'block',fontWeight:600}}>Letra</label>
                <p style={{fontSize:11,color:'var(--anc-ink-3)',background:'var(--anc-sunk)',borderRadius:'var(--anc-r-s)',padding:'8px 10px',marginBottom:8}}>
                  Escribe el nombre de la sección seguido de dos puntos — <code>VERSO 1:</code>, <code>CORO:</code> — y
                  debajo su letra. Una línea vacía separa una sección de la siguiente. Nada más.
                </p>
                <textarea className="anc-input" style={{minHeight:280,fontSize:13,lineHeight:1.5,resize:'vertical',width:'100%'}}
                  placeholder={'VERSO 1:\nEl Padre reveló\nEl gran misterio de su corazón\n\nCORO:\nMi corazón\nTe adora Dios'}
                  value={editing.letra||''} onChange={e=>setEditing({...editing,letra:e.target.value})} />
              </div>
              <div>
                <label style={{fontSize:11,color:'var(--anc-ink-3)',marginBottom:4,display:'block',fontWeight:600}}>Así se va a ver</label>
                <div className="anc-panel" style={{padding:16,maxHeight:328,overflowY:'auto'}}>
                  {(editing.letra||'').trim() ? parseLyrics(editing.letra||'').map((s,i) => (
                    <div key={i} className="anc-lsec" style={{marginBottom:16}}>
                      {s.name && <p className="anc-secName2" style={{fontSize:'.75rem'}}>{s.name}:</p>}
                      <p className="anc-lyr" style={{fontSize:'.8125rem'}}>{s.lyrics}</p>
                    </div>
                  )) : <p style={{fontSize:12,color:'var(--anc-ink-3)'}}>Empieza a escribir para ver la vista previa.</p>}
                </div>
              </div>
            </div>

            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button className="anc-btn anc-btn--accent" onClick={()=>saveSong()} disabled={saving || !editing.nombre}>{saving?'Guardando…':'Guardar'}</button>
              <button className="anc-btn anc-btn--quiet" onClick={()=>setEditing(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({label, span2, children}:{label:string; span2?:boolean; children:React.ReactNode}) {
  return (
    <div style={span2?{gridColumn:'span 2'}:undefined}>
      <label style={{fontSize:11,color:'var(--anc-ink-3)',marginBottom:4,display:'block',fontWeight:600}}>{label}</label>
      {children}
    </div>
  )
}

function PrefRow({title, sub, on, onToggle}:{title:string; sub:string; on:boolean; onToggle:()=>void}) {
  return (
    <div className="anc-optRow">
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:600,color:'var(--anc-ink)'}}>{title}</div>
        <div style={{fontSize:10,color:'var(--anc-ink-3)'}}>{sub}</div>
      </div>
      <button className={`anc-sw${on?' anc-sw--on':''}`} role="switch" aria-checked={on} aria-label={title} onClick={onToggle} />
    </div>
  )
}

// Punto 4/6 — bloque fijo en la vista Y modal desde la barra, ambos
// conviven (en móvil el bloque queda abajo del todo). Comparten esta
// misma lista: tipo de archivo, quién subió y cuándo, zona de arrastrar.
// Acepta PDF/imagen/audio (subida real) o enlace (solo la URL).
type AttachmentRow = {
  id: string; filename: string|null; url: string; size: number|null; kind: string|null
  created_at: string; uploaded_by_member: { nombre:string; apellido:string } | null
  bucket?: string|null   // migración 036: en qué bucket está el archivo (sin la migración no viene y es song-attachments)
}

function AttachmentsList({song, memberId, onCountChange, isAdmin, refreshToken, onMutated}:{song:Song; memberId:string|null; onCountChange?:(n:number)=>void; isAdmin?:boolean; refreshToken?:number; onMutated?:()=>void}) {
  const [items, setItems] = useState<AttachmentRow[]>([])
  // El bucket "song-attachments" es privado: para todo lo que no sea
  // "link" (subido de verdad a Storage), `url` guarda el PATH, no una URL
  // servible — getPublicUrl no funcionaría contra un bucket privado
  // (403/404). La URL usable se firma acá, con vencimiento corto, y nunca
  // se guarda la firmada en la base.
  // Los enlaces de los archivos se firman AL PULSAR (regla 14), no al cargar la lista: ya no hay un mapa de URLs firmadas.
  const [errorSubida, setErrorSubida] = useState<string|null>(null)
  const [abriendoId, setAbriendoId] = useState<string|null>(null)
  const [openMenuId, setOpenMenuId] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string|null>(null)

  // Si cambiás de canción antes de que vuelva esta consulta (o la de las
  // URLs firmadas, que es un segundo await más abajo), la respuesta tardía
  // de la canción anterior no debe pisar los adjuntos de la nueva — se
  // descarta comparando contra song.id en el momento en que la respuesta
  // llega, no en el que se lanzó. Un ref porque se lee dentro de un
  // callback async, donde un valor capturado por closure quedaría viejo.
  const songIdRef = useRef(song.id)
  songIdRef.current = song.id

  // Reinicia "loaded" al cambiar de canción — si no, mientras la consulta
  // de la nueva canción está en vuelo, se sigue mostrando la lista (y el
  // conteo) de la canción anterior en vez de un esqueleto.
  useEffect(() => { setLoaded(false) }, [song.id])

  const load = useCallback(() => {
    const forSongId = song.id
    setLoadError(null)
    const columnas = 'id,filename,url,size,kind,created_at,uploaded_by_member:members(nombre,apellido)'
    // `bucket` (migración 036) puede no existir todavía: si la consulta con esa columna falla, se repite sin ella.
    const pedir = (cols: string) => supabase.from('song_attachments').select(cols).eq('song_id', song.id).order('created_at')
    pedir(columnas + ',bucket')
      .then(async (r1) => (r1.error ? pedir(columnas) : r1))
      .then(({data, error}) => {
        if (songIdRef.current !== forSongId) return // la canción ya cambió — esta respuesta quedó vieja
        if (error) { setLoadError(error.message || TEXTOS.noSePudoCargar); setLoaded(true); return }
        const rows = (data||[]) as any as AttachmentRow[]
        setItems(rows)
        onCountChange?.(rows.length)
        setLoaded(true)
      })
  }, [song.id, onCountChange])

  // refreshToken en las deps: subir/borrar desde ESTA instancia (el modal)
  // o desde LA OTRA (el bloque fijo) sube el mismo número compartido — las
  // dos vuelven a correr este load() (misma función, misma guarda por
  // song_id de arriba), así que no hace falta una recarga de página ni una
  // segunda forma de traer los adjuntos.
  useEffect(() => { load() }, [load, refreshToken])

  // Si nadie pasó onMutated (no debería pasar en los dos usos actuales,
  // pero el prop es opcional), esta instancia al menos se refresca a sí
  // misma — nunca se queda muda tras su propia subida/borrado.
  const notifyMutated = onMutated || load

  // La subida vive en lib/subirAdjunto.ts (URL firmada + XMLHttpRequest, con progreso real) y la cola en lib/colaSubida.ts: valida tipo, contenido
  // y tamaño ANTES de subir y sube con un tipo canónico (no el que declare el navegador). Audio → bucket song-audio (migración 036); PDF e imágenes
  // → song-attachments. Una sola organización hoy (como el resto de la administración): la organización va por delante en la ruta del audio.
  // El indicador (PanelSubida) va arriba de la lista; cada archivo terminado recarga la lista.
  const subida = useSubidaAdjuntos({
    songId: song.id, memberId, organizationId: DEFAULT_ORGANIZATION_ID, cliente: supabase as any,
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    alTerminarUno: () => { setErrorSubida(null); notifyMutated() },
  })
  const subirArchivos = (lista: FileList | File[] | null | undefined) => {
    const archivos = Array.from(lista ?? [])
    if (!archivos.length) return
    setErrorSubida(null); subida.agregar(archivos)
  }

  // Abrir un adjunto: se firma AL PULSAR. La ventana se abre en el toque (si no, iOS la bloquea tras la espera) y recibe la URL al llegar.
  async function abrir(it: AttachmentRow) {
    if (it.kind === 'link') { window.open(it.url, '_blank', 'noopener,noreferrer'); return }
    setErrorSubida(null); setAbriendoId(it.id)
    const ventana = window.open('', '_blank')
    const bucket = it.bucket && BUCKETS_FIRMABLES.includes(it.bucket) ? it.bucket : BUCKET_ADJUNTOS
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(it.url, it.kind === 'audio' ? TTL_FIRMA_AUDIO_SEG : TTL_FIRMA_PDF_SEG)
    setAbriendoId(null)
    if (error || !data?.signedUrl) { ventana?.close(); setErrorSubida('No se pudo abrir el archivo. Inténtalo de nuevo.'); return }
    if (ventana) { ventana.opener = null; ventana.location.href = data.signedUrl } else window.location.href = data.signedUrl
  }

  async function addLink() {
    const url = prompt('Enlace (YouTube, Google Drive, etc.):')
    if (!url?.trim()) return
    const label = prompt('¿Cómo lo llamamos?', 'Enlace') || 'Enlace'
    await supabase.from('song_attachments').insert({ song_id: song.id, kind:'link', url: url.trim(), filename: label, uploaded_by: memberId })
    notifyMutated()
  }

  async function remove(id: string) {
    const it = items.find(x => x.id === id)
    await supabase.from('song_attachments').delete().eq('id', id)
    // También se borra el archivo del almacenamiento (antes quedaba huérfano). Si no se puede, no se interrumpe nada.
    if (it && it.kind !== 'link') {
      const bucket = it.bucket && BUCKETS_FIRMABLES.includes(it.bucket) ? it.bucket : BUCKET_ADJUNTOS
      await supabase.storage.from(bucket).remove([it.url]).catch(() => {})
    }
    notifyMutated()
  }

  function badgeIcon(kind: string|null) {
    if (kind==='pdf') return <FileText size={16}/>
    if (kind==='audio') return <Music size={16}/>
    if (kind==='image') return <ImageIcon size={16}/>
    if (kind==='link') return <LinkIcon size={16}/>
    return <FileText size={16}/>
  }
  function fmtSize(size: number|null) {
    if (!size) return ''
    return size < 1024*1024 ? `${Math.round(size/1024)} KB` : `${(size/1024/1024).toFixed(1)} MB`
  }
  function fmtDate(iso: string) {
    const d = new Date(iso)
    return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}`
  }

  return (
    <div>
      {loadError ? (
        <div style={{padding:'8px 0'}}>
          <p style={{fontSize:12,color:'var(--anc-ink-3)',marginBottom:8}}>{loadError}</p>
          <button onClick={load} style={{background:'var(--anc-accent)',color:'var(--anc-on-accent)',border:'none',borderRadius:'var(--anc-r)',padding:'6px 12px',fontSize:11.5,fontWeight:600,cursor:'pointer'}}>{TEXTOS.reintentar}</button>
        </div>
      ) : !loaded ? (
        <div className="anc" style={{display:'flex',flexDirection:'column',gap:6,padding:'4px 0 8px'}}>
          <div className="anc-skel" style={{height:36}}/>
          <div className="anc-skel" style={{height:36}}/>
        </div>
      ) : items.length===0 ? (
        // Para admin, la invitación a subir vive en la zona de arrastrar de
        // abajo (más abajo) — no se duplica el mismo mensaje dos veces.
        isAdmin ? null : <p style={{fontSize:12,color:'var(--anc-ink-3)',padding:'8px 0'}}>Sin adjuntos todavía.</p>
      ) : null}
      <PanelSubida items={subida.items} onCancelar={subida.cancelar} onReintentar={subida.reintentar} onDescartar={subida.descartar} />
      {loaded && !loadError && items.map(it => (
        <div key={it.id} className="anc-att" data-anc-row style={{position:'relative'}}>
          <div className="anc-attIc">{badgeIcon(it.kind)}</div>
          <button type="button" onClick={()=>abrir(it)} disabled={abriendoId===it.id} className="anc-attB"
            style={{textDecoration:'none', textAlign:'left', background:'none', border:0, font:'inherit', color:'inherit', cursor:'pointer', ...(abriendoId===it.id ? {opacity:.6} : {})}}>
            <span className="anc-attT">{it.filename||'archivo'}</span>
            <span className="anc-attS">
              {fmtSize(it.size)}{it.size?' · ':''}
              {it.uploaded_by_member ? `subido por ${it.uploaded_by_member.nombre}` : 'subido'} · {fmtDate(it.created_at)}
            </span>
          </button>
          <button className="anc-rowMore" style={{opacity:1}} aria-label={`Acciones para ${it.filename||'archivo'}`}
            onClick={()=>setOpenMenuId(cur=>cur===it.id?null:it.id)}>
            <MoreHorizontal size={16}/>
          </button>
          {openMenuId===it.id && (
            <MenuFlotante titulo={`Acciones para ${it.filename||'archivo'}`} onCerrar={()=>setOpenMenuId(null)} capa={53}>
              <button className="anc-rowMenuDanger" onClick={()=>{remove(it.id);setOpenMenuId(null)}}>Quitar</button>
            </MenuFlotante>
          )}
        </div>
      ))}

      {(() => {
        const invite = loaded && !loadError && items.length===0 && isAdmin
        return (
          <div className={`anc-attDrop${dragOver?' anc-attDrop--over':''}${invite?' anc-attDrop--invite':''}`}
            onDragOver={e=>{e.preventDefault(); setDragOver(true)}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{ e.preventDefault(); setDragOver(false); if (!subida.ocupado) subirArchivos(e.dataTransfer.files) }}
          >
            <b>{invite ? 'Sube el primer adjunto de esta canción' : 'Arrastra archivos aquí'}</b>
            <span>PDF o imagen (hasta 25 MB) · audio MP3, M4A o AAC (hasta 20 MB) · o un enlace</span>
          </div>
        )
      })()}

      {errorSubida && <p className="anc-legalWarn" role="alert" style={{marginTop:10,marginBottom:0}}>⚠ {errorSubida}</p>}

      <div style={{display:'flex',gap:8,marginTop:10}}>
        <label className="anc-btn anc-btn--quiet" aria-disabled={subida.ocupado} style={{display:'inline-flex',cursor:subida.ocupado?'default':'pointer',opacity:subida.ocupado?.6:1}}>
          + Subir archivo
          <input type="file" multiple accept={ACCEPT_SUBIDA} style={{display:'none'}} onChange={e=>{subirArchivos(e.target.files); e.target.value=''}} disabled={subida.ocupado}/>
        </label>
        <button className="anc-btn anc-btn--quiet" onClick={addLink}>+ Agregar enlace</button>
      </div>
    </div>
  )
}

function AttachmentsModal({song, memberId, onClose, onCountChange, isAdmin, refreshToken, onMutated}:{song:Song; memberId:string|null; onClose:()=>void; onCountChange?:(n:number)=>void; isAdmin?:boolean; refreshToken?:number; onMutated?:()=>void}) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:52,display:'grid',placeItems:'center',background:'rgba(0,0,0,.3)'}} onClick={onClose}>
      <div className="anc-panel" onClick={e=>e.stopPropagation()} style={{width:'min(460px,92vw)',padding:18,maxHeight:'80vh',overflowY:'auto'}}>
        <p style={{fontSize:14,fontWeight:700,marginBottom:12,color:'var(--anc-ink)'}}>Adjuntos — {song.nombre}</p>
        <AttachmentsList song={song} memberId={memberId} onCountChange={onCountChange} isAdmin={isAdmin}
          refreshToken={refreshToken} onMutated={onMutated} />
        <button className="anc-btn anc-btn--quiet" style={{marginTop:12}} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  )
}
