/* ════════════════════════════════════════════════════════════════════════
   CancionesPanel.tsx — "la página" que consume SongList.tsx/SongChart.tsx
   (que son el diseño en sí, sin modificar) contra el esquema real de esta
   app. Ver migrations/017-canciones.sql e INSTRUCCIONES-canciones.md.

   El esquema real de `songs` usa nombres en español y ya tiene datos en
   producción (nombre, artista, tono_original, compas, caratula_url, …) —
   no se renombra nada, todo el mapeo español↔inglés vive acá.
   ════════════════════════════════════════════════════════════════════════ */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Song, Service, TeamTool } from '@/lib/types'
import { SongList, type SongRow, type SongFilter } from './SongList'
import { SongChart, type Section, type ArrangementItem } from './SongChart'
import { parseChart, type ParseResult, type ParsedSection } from '@/lib/parseChart'

const NOTAS    = ['A','A#','Bb','B','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab']
const COMPASES = ['4/4','3/4','6/8','12/8','2/4','5/4','7/8']
const MESES    = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DIAS     = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
function fechaLabel(fecha: string) {
  const d = new Date(fecha + 'T12:00:00')
  return `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${cap(MESES[d.getMonth()])}`
}
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

type Draft = Partial<Song>
const newEmpty = (): Draft => ({ nombre:'', artista:'', tono_original:'', compas:'', bpm:undefined,
  link_spotify:'', link_letras:'', link_recursos:'', spotify_url:'', apple_music_url:'', caratula_url:'',
  notas:'', duracion_min:undefined, original_title:'', ccli:'', copyright:'' })

interface Props {
  songs: Song[]
  onRefreshSongs: () => void
  memberId: string | null
  services: Service[]
  teamTools: TeamTool[]
  teamMembersFlat: { id:string; member_id:string; team_id:string; is_leader:boolean }[]
}

export default function CancionesPanel({ songs, onRefreshSongs, memberId, services, teamTools, teamMembersFlat }: Props) {
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
  const [uploadingCover, setUploadingCover] = useState(false)
  const [menuForId, setMenuForId] = useState<string|null>(null)
  const [attachmentsFor, setAttachmentsFor] = useState<Song|null>(null)
  const [showPrefs, setShowPrefs] = useState(false)

  // ── alta de canción: pasos 1 (origen) y 2 (interpretación) del flujo de
  // docs/mockup-crear-cancion.html. El paso 3 (corrección haciendo clic
  // entre letras) todavía no se construye — INSTRUCCIONES-canciones-2.md. ──
  const [creating, setCreating] = useState<'origin'|'paste'|'interpret'|null>(null)
  const [pasteText, setPasteText] = useState('')
  const [parseResult, setParseResult] = useState<ParseResult|null>(null)

  function resetCreateWizard() {
    setCreating(null); setPasteText(''); setParseResult(null)
  }

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

  // ══════════ vista de detalle (chart) ══════════
  const [sections, setSections] = useState<Section[]>([])
  const [arrangement, setArrangement] = useState<ArrangementItem[]>([])
  const [isArrangementModified, setIsArrangementModified] = useState(false)
  const [serviceCtx, setServiceCtx] = useState<{ id:string; label:string; key?:string; blockId:string }|null>(null)
  const [attachmentsCount, setAttachmentsCount] = useState(0)
  const [loadingChart, setLoadingChart] = useState(false)

  const selectedSong = songs.find(s => s.id === selectedId) || null

  useEffect(() => {
    if (view!=='chart' || !selectedId) return
    let cancelled = false
    setLoadingChart(true)
    ;(async () => {
      const [secRes, attRes] = await Promise.all([
        supabase.from('song_sections')
          .select('id,code,name,performance_note,sort_order,variants:song_section_variants(id,label,lines,is_default)')
          .eq('song_id', selectedId).order('sort_order'),
        supabase.from('song_attachments').select('id',{count:'exact',head:true}).eq('song_id', selectedId),
      ])
      const now = new Date()
      const upcoming = services.filter(s=>s.tipo!=='ensayo' && s.fecha >= now.toISOString().slice(0,10)).sort((a,b)=>a.fecha.localeCompare(b.fecha))[0]
      let ctx: typeof serviceCtx = null
      let arr: any[] = selectedSong?.default_arrangement || []
      let modified = false
      if (upcoming) {
        const { data: block } = await supabase.from('service_blocks').select('id,tono')
          .eq('service_id', upcoming.id).eq('song_id', selectedId).eq('tipo','cancion').maybeSingle()
        if (block) {
          ctx = { id: upcoming.id, label: fechaLabel(upcoming.fecha), key: block.tono||undefined, blockId: block.id }
          const { data: ov } = await supabase.from('service_song_arrangements').select('arrangement').eq('service_item_id', block.id).maybeSingle()
          if (ov?.arrangement) { arr = ov.arrangement; modified = true }
        }
      }
      if (cancelled) return
      setSections((secRes.data||[]).map((s:any) => ({
        id: s.id, code: s.code, name: s.name, performanceNote: s.performance_note||undefined,
        variants: (s.variants||[]).length ? s.variants.map((v:any)=>({id:v.id,label:v.label,lines:v.lines||[]})) : [{id:s.id+'-default',label:'Principal',lines:[]}],
      })))
      setArrangement((arr||[]).map((a:any,i:number)=>({ uid:`${a.sectionId}-${i}`, sectionId:a.sectionId, label:a.label, repeat:a.repeat||1 })))
      setIsArrangementModified(modified)
      setServiceCtx(ctx)
      setAttachmentsCount(attRes.count||0)
      setLoadingChart(false)
    })()
    return () => { cancelled = true }
  }, [view, selectedId, services, selectedSong])

  const canEditArrangement = useMemo(() => {
    if (!serviceCtx || !memberId) return false
    const setlistTeamId = teamTools.find(tt=>tt.tool_type==='setlist')?.team_id
    if (!setlistTeamId) return false
    return teamMembersFlat.some(tm => tm.team_id===setlistTeamId && tm.member_id===memberId && tm.is_leader)
  }, [serviceCtx, memberId, teamTools, teamMembersFlat])

  async function persistArrangement(next: ArrangementItem[]) {
    if (!serviceCtx) return
    const payload = next.map(({sectionId,label,repeat}) => ({sectionId,label,repeat}))
    await supabase.from('service_song_arrangements').upsert(
      { service_item_id: serviceCtx.blockId, arrangement: payload, updated_at: new Date().toISOString() },
      { onConflict: 'service_item_id' }
    )
    setIsArrangementModified(true)
  }

  function onArrangementChange(next: ArrangementItem[]) { setArrangement(next); void persistArrangement(next) }
  async function onArrangementRevert() {
    if (!serviceCtx) return
    await supabase.from('service_song_arrangements').delete().eq('service_item_id', serviceCtx.blockId)
    setArrangement((selectedSong?.default_arrangement||[]).map((a:any,i:number)=>({uid:`${a.sectionId}-${i}`,sectionId:a.sectionId,label:a.label,repeat:a.repeat||1})))
    setIsArrangementModified(false)
  }

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

  // Agrupa por `code`: una fila song_sections por código (VERSE/CHORUS/…),
  // con una variante por variantLabel distinto ("BRIDGE (Alternate Chords 1)"
  // es una variante de la sección "P", no otra sección). Las ocurrencias
  // isReferenceOnly no crean variante (repiten una ya definida), pero sí
  // cuentan como su propio ítem en el arreglo por defecto.
  async function persistParsedContent(songId: string, parsed: ParsedSection[]) {
    type Group = { code:string; name:string; performanceNote?:string; firstIndex:number; variants: Map<string, ParsedSection['lines']> }
    const groups = new Map<string, Group>()
    parsed.forEach((sec, i) => {
      let g = groups.get(sec.code)
      if (!g) { g = { code: sec.code, name: sec.name, performanceNote: sec.performanceNote, firstIndex: i, variants: new Map() }; groups.set(sec.code, g) }
      if (!sec.isReferenceOnly) {
        g.variants.set(sec.variantLabel || 'Principal', sec.lines)
        if (sec.performanceNote && !g.performanceNote) g.performanceNote = sec.performanceNote
      }
    })

    const codeToSectionId: Record<string,string> = {}
    let sortOrder = 0
    for (const g of Array.from(groups.values()).sort((a,b)=>a.firstIndex-b.firstIndex)) {
      const { data: secRow } = await supabase.from('song_sections').insert({
        song_id: songId, code: g.code, name: g.name, performance_note: g.performanceNote||null, sort_order: sortOrder++,
      }).select().single()
      if (!secRow) continue
      codeToSectionId[g.code] = secRow.id
      const entries = g.variants.size ? Array.from(g.variants.entries()) : [['Principal', [] as ParsedSection['lines']] as const]
      for (const [label, lines] of entries) {
        await supabase.from('song_section_variants').insert({ section_id: secRow.id, label, lines, is_default: label==='Principal' })
      }
    }

    const arrangement = parsed
      .map(sec => ({ sectionId: codeToSectionId[sec.code], label: sec.name + (sec.variantLabel ? ` · ${sec.variantLabel}` : ''), repeat: sec.repeat||1 }))
      .filter(a => a.sectionId)
    await supabase.from('songs').update({ default_arrangement: arrangement }).eq('id', songId)
  }

  async function saveSong() {
    if (!editing?.nombre) return
    setSaving(true)
    const payload = {
      nombre: editing.nombre, artista: editing.artista||'', tono_original: editing.tono_original||null,
      bpm: editing.bpm||null, compas: editing.compas||null, caratula_url: editing.caratula_url||null,
      link_spotify: editing.link_spotify||null, link_letras: editing.link_letras||null, link_recursos: editing.link_recursos||null,
      spotify_url: editing.spotify_url||null, apple_music_url: editing.apple_music_url||null,
      notas: editing.notas||null, duracion_min: editing.duracion_min||null,
      original_title: editing.original_title||null, ccli: editing.ccli||null, copyright: editing.copyright||null,
    }
    const isNew = !editing.id
    let songId = editing.id
    if (isNew) {
      const { data } = await supabase.from('songs').insert(payload).select().single()
      songId = data?.id
    } else {
      await supabase.from('songs').update(payload).eq('id', editing.id)
    }
    if (isNew && songId && parseResult?.sections.length) await persistParsedContent(songId, parseResult.sections)
    setSaving(false); setEditing(null); resetCreateWizard(); onRefreshSongs()
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

  return (
    <div className="anc">
      {view==='list' && (
        <>
          <SongList
            songs={filtered} totalCount={rows.length}
            query={query} onQuery={setQuery}
            filter={filter} onFilter={setFilter}
            sortLabel={sortMode==='alpha' ? 'Alfabético' : 'Recientes'}
            onSort={() => setSortMode(m => m==='alpha' ? 'recent' : 'alpha')}
            onOpen={id => { setSelectedId(id); setView('chart') }}
            onToggleFavorite={onToggleFavorite}
            onMenu={id => setMenuForId(cur => cur===id ? null : id)}
            onAdd={() => setCreating('origin')}
          />
          {menuForId && (() => {
            const s = songs.find(x=>x.id===menuForId); if (!s) return null
            return (
              <div style={{position:'fixed',inset:0,zIndex:50}} onClick={()=>setMenuForId(null)}>
                <div className="anc-panel" onClick={e=>e.stopPropagation()}
                  style={{position:'fixed',right:24,top:120,width:200,padding:4,zIndex:51}}>
                  <button className="anc-btn anc-btn--quiet" style={{width:'100%',justifyContent:'flex-start'}} onClick={()=>{setEditing({...s});setParseResult(null);setMenuForId(null)}}>Editar</button>
                  <button className="anc-btn anc-btn--quiet" style={{width:'100%',justifyContent:'flex-start'}} onClick={()=>archiveSong(s.id)}>Archivar</button>
                  <button className="anc-btn anc-btn--quiet" style={{width:'100%',justifyContent:'flex-start',color:'var(--anc-no)'}} onClick={()=>deleteSong(s.id)}>Eliminar</button>
                </div>
              </div>
            )
          })()}
        </>
      )}

      {view==='chart' && selectedSong && (
        <>
          <button className="anc-btn anc-btn--quiet" style={{marginBottom:14}} onClick={()=>setView('list')}>← Canciones</button>
          {loadingChart ? (
            <p style={{color:'var(--anc-ink-3)',fontSize:13}}>Cargando…</p>
          ) : (
            <SongChart
              title={selectedSong.nombre} originalTitle={selectedSong.original_title} artist={selectedSong.artista||''}
              songKey={selectedSong.tono_original||'C'} bpm={selectedSong.bpm||0} meter={selectedSong.compas||'4/4'}
              serviceLabel={serviceCtx?.label} serviceKey={serviceCtx?.key}
              attachmentsCount={attachmentsCount} ccli={selectedSong.ccli} copyright={selectedSong.copyright}
              sections={sections} arrangement={arrangement} isArrangementModified={isArrangementModified}
              canEditArrangement={canEditArrangement}
              onArrangementChange={onArrangementChange} onArrangementRevert={onArrangementRevert}
              onAttachments={() => setAttachmentsFor(selectedSong)}
              onPreferences={() => setShowPrefs(true)}
            />
          )}
        </>
      )}

      {/* Preferencias — placeholder mínimo: el idioma de letra (en/es/both)
          vive como estado interno de SongChart, sin prop para controlarlo
          desde afuera. No modificamos SongChart.tsx, así que por ahora esto
          no tiene ningún efecto — avisado al usuario aparte. */}
      {showPrefs && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'grid',placeItems:'center',background:'rgba(0,0,0,.3)'}} onClick={()=>setShowPrefs(false)}>
          <div className="anc-panel" onClick={e=>e.stopPropagation()} style={{width:280,padding:18}}>
            <p style={{fontSize:13,fontWeight:700,marginBottom:6,color:'var(--anc-ink)'}}>Preferencias</p>
            <p style={{fontSize:12,color:'var(--anc-ink-3)'}}>Todavía no hay preferencias configurables acá.</p>
            <button className="anc-btn anc-btn--quiet" style={{marginTop:10}} onClick={()=>setShowPrefs(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {attachmentsFor && (
        <AttachmentsModal song={attachmentsFor} memberId={memberId}
          onClose={() => { setAttachmentsFor(null); if(selectedId) supabase.from('song_attachments').select('id',{count:'exact',head:true}).eq('song_id',selectedId).then(({count})=>setAttachmentsCount(count||0)) }} />
      )}

      {/* Paso 1 — Origen del contenido */}
      {creating==='origin' && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'grid',placeItems:'center',background:'rgba(0,0,0,.3)'}} onClick={resetCreateWizard}>
          <div className="anc-panel" onClick={e=>e.stopPropagation()} style={{width:'min(440px,92vw)',padding:20}}>
            <p style={{fontSize:14,fontWeight:700,marginBottom:4,color:'var(--anc-ink)'}}>Nueva canción</p>
            <p style={{fontSize:12,color:'var(--anc-ink-3)',marginBottom:16}}>¿De dónde sale el contenido?</p>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <button className="anc-btn anc-btn--accent" style={{justifyContent:'space-between'}} onClick={()=>setCreating('paste')}>
                Pegar texto <span style={{opacity:.75,fontWeight:500}}>recomendado</span>
              </button>
              <button className="anc-btn anc-btn--quiet" style={{justifyContent:'flex-start',opacity:.5,cursor:'default'}} title="Próximamente" onClick={e=>e.preventDefault()}>Buscar en catálogo</button>
              <button className="anc-btn anc-btn--quiet" style={{justifyContent:'flex-start',opacity:.5,cursor:'default'}} title="Próximamente" onClick={e=>e.preventDefault()}>Subir archivo</button>
              <button className="anc-btn anc-btn--quiet" style={{justifyContent:'flex-start'}} onClick={()=>{ setCreating(null); setEditing(newEmpty()) }}>Empezar en blanco</button>
            </div>
            <button className="anc-btn anc-btn--quiet" style={{marginTop:14}} onClick={resetCreateWizard}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Paso 1 (continuación) — pegar el texto */}
      {creating==='paste' && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'grid',placeItems:'center',background:'rgba(0,0,0,.3)'}} onClick={resetCreateWizard}>
          <div className="anc-panel" onClick={e=>e.stopPropagation()} style={{width:'min(640px,92vw)',padding:20}}>
            <p style={{fontSize:14,fontWeight:700,marginBottom:10,color:'var(--anc-ink)'}}>Pegar texto</p>
            <textarea className="anc-input" style={{minHeight:280,fontFamily:'var(--anc-mono)',fontSize:12,lineHeight:1.5,resize:'vertical'}}
              placeholder={'VERSE 1\nG              D\nAsí como el ciervo busca las corrientes...'}
              value={pasteText} onChange={e=>setPasteText(e.target.value)} />
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button className="anc-btn anc-btn--accent" disabled={!pasteText.trim()}
                onClick={()=>{ setParseResult(parseChart(pasteText)); setCreating('interpret') }}>Interpretar</button>
              <button className="anc-btn anc-btn--quiet" onClick={()=>setCreating('origin')}>Atrás</button>
            </div>
          </div>
        </div>
      )}

      {/* Paso 2 — Interpretación: original y resultado lado a lado, avisos visibles */}
      {creating==='interpret' && parseResult && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'grid',placeItems:'center',background:'rgba(0,0,0,.3)'}} onClick={resetCreateWizard}>
          <div className="anc-panel" onClick={e=>e.stopPropagation()} style={{width:'min(860px,94vw)',maxHeight:'86vh',overflowY:'auto',padding:20}}>
            <p style={{fontSize:14,fontWeight:700,marginBottom:10,color:'var(--anc-ink)'}}>Interpretación</p>
            {parseResult.warnings.length>0 && (
              <div style={{background:'color-mix(in srgb, var(--anc-warn) 14%, transparent)',boxShadow:'inset 0 0 0 1px color-mix(in srgb, var(--anc-warn) 35%, transparent)',borderRadius:'var(--anc-r)',padding:'10px 12px',marginBottom:14}}>
                <p style={{fontSize:11,fontWeight:700,color:'var(--anc-warn)',marginBottom:4}}>Para revisar</p>
                {parseResult.warnings.map((w,i) => <p key={i} style={{fontSize:12,color:'var(--anc-ink-2)',margin:'2px 0'}}>{w}</p>)}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div>
                <p style={{fontSize:11,fontWeight:700,color:'var(--anc-ink-3)',marginBottom:6}}>ORIGINAL</p>
                <pre style={{whiteSpace:'pre-wrap',fontFamily:'var(--anc-mono)',fontSize:11,color:'var(--anc-ink-2)',background:'var(--anc-sunk)',borderRadius:'var(--anc-r)',padding:10,maxHeight:360,overflowY:'auto',margin:0}}>{pasteText}</pre>
              </div>
              <div>
                <p style={{fontSize:11,fontWeight:700,color:'var(--anc-ink-3)',marginBottom:6}}>SECCIONES INTERPRETADAS</p>
                <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:360,overflowY:'auto'}}>
                  {parseResult.sections.map((s,i) => (
                    <div key={i} style={{padding:'8px 10px',borderRadius:'var(--anc-r-s)',background:'var(--anc-sunk)',fontSize:12}}>
                      <b style={{color:'var(--anc-ink)'}}>{s.code} {s.name}</b>
                      {s.variantLabel && <span style={{color:'var(--anc-ink-3)'}}> · {s.variantLabel}</span>}
                      {s.performanceNote && <span style={{color:'var(--anc-warn)'}}> · {s.performanceNote}</span>}
                      <div style={{color:'var(--anc-ink-3)',fontSize:11,marginTop:2}}>
                        {s.isReferenceOnly ? 'Referencia — repite una sección ya definida' : `${s.lines.length} línea${s.lines.length!==1?'s':''}`}
                        {s.repeat ? ` · ×${s.repeat}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button className="anc-btn anc-btn--accent" onClick={()=>{ setCreating(null); setEditing(newEmpty()) }}>Continuar</button>
              <button className="anc-btn anc-btn--quiet" onClick={()=>setCreating('paste')}>Volver a pegar</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'grid',placeItems:'center',background:'rgba(0,0,0,.3)'}} onClick={()=>{setEditing(null);resetCreateWizard()}}>
          <div className="anc-panel" onClick={e=>e.stopPropagation()} style={{width:'min(560px,92vw)',maxHeight:'86vh',overflowY:'auto',padding:20}}>
            <p style={{fontSize:14,fontWeight:700,marginBottom:4,color:'var(--anc-ink)'}}>{editing.id ? 'Editar canción' : 'Nueva canción'}</p>
            {parseResult && !editing.id && (
              <p style={{fontSize:11,color:'var(--anc-ink-3)',marginBottom:10}}>
                {parseResult.sections.filter(s=>!s.isReferenceOnly).length} secciones interpretadas del texto pegado
                {parseResult.warnings.length>0 && ` · ${parseResult.warnings.length} para revisar`}.
              </p>
            )}

            <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:14}}>
              <label style={{cursor:'pointer',flexShrink:0}}>
                <div style={{width:56,height:56,borderRadius:8,overflow:'hidden',background:'var(--anc-sunk)',display:'grid',placeItems:'center'}}>
                  {editing.caratula_url ? <img src={editing.caratula_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span>🎵</span>}
                </div>
                <input type="file" accept="image/png,image/jpeg,image/webp" style={{display:'none'}} onChange={handleCoverUpload}/>
              </label>
              <p style={{fontSize:11,color:'var(--anc-ink-3)'}}>{uploadingCover?'Subiendo…':'Toca para subir carátula (máx. 3MB)'}</p>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="Título *" span2><input className="anc-input" value={editing.nombre||''} onChange={e=>setEditing({...editing,nombre:e.target.value})}/></Field>
              <Field label="Título original"><input className="anc-input" value={editing.original_title||''} onChange={e=>setEditing({...editing,original_title:e.target.value})}/></Field>
              <Field label="Artista"><input className="anc-input" value={editing.artista||''} onChange={e=>setEditing({...editing,artista:e.target.value})}/></Field>
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
              <Field label="Link YouTube"><input className="anc-input" value={editing.link_spotify||''} onChange={e=>setEditing({...editing,link_spotify:e.target.value})}/></Field>
              <Field label="Spotify"><input className="anc-input" value={editing.spotify_url||''} onChange={e=>setEditing({...editing,spotify_url:e.target.value})}/></Field>
              <Field label="Apple Music"><input className="anc-input" value={editing.apple_music_url||''} onChange={e=>setEditing({...editing,apple_music_url:e.target.value})}/></Field>
              <Field label="Letras / Acordes"><input className="anc-input" value={editing.link_letras||''} onChange={e=>setEditing({...editing,link_letras:e.target.value})}/></Field>
              <Field label="Recursos" span2><input className="anc-input" value={editing.link_recursos||''} onChange={e=>setEditing({...editing,link_recursos:e.target.value})}/></Field>
              <Field label="Notas internas" span2><input className="anc-input" value={editing.notas||''} onChange={e=>setEditing({...editing,notas:e.target.value})}/></Field>
            </div>

            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button className="anc-btn anc-btn--accent" onClick={saveSong} disabled={saving}>{saving?'Guardando…':'Guardar'}</button>
              <button className="anc-btn anc-btn--quiet" onClick={()=>{setEditing(null);resetCreateWizard()}}>Cancelar</button>
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

function AttachmentsModal({song, memberId, onClose}:{song:Song; memberId:string|null; onClose:()=>void}) {
  const [items, setItems] = useState<{id:string; filename:string|null; url:string; size:number|null}[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    supabase.from('song_attachments').select('id,filename,url,size').eq('song_id', song.id).order('created_at')
      .then(({data}) => setItems(data||[]))
  }, [song.id])

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const path = `${song.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('song-attachments').upload(path, file, { upsert:true, contentType:file.type })
    if (error) { alert('Error subiendo el archivo — ¿existe el bucket "song-attachments" en Supabase Storage?'); setUploading(false); return }
    const { data } = supabase.storage.from('song-attachments').getPublicUrl(path)
    const { data: row } = await supabase.from('song_attachments').insert({
      song_id: song.id, kind: file.type.startsWith('audio')?'audio':file.type==='application/pdf'?'pdf':'file',
      url: data.publicUrl, filename: file.name, size: file.size, uploaded_by: memberId,
    }).select().single()
    if (row) setItems(prev => [...prev, row])
    setUploading(false)
  }

  async function remove(id: string) {
    await supabase.from('song_attachments').delete().eq('id', id)
    setItems(prev => prev.filter(i=>i.id!==id))
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:52,display:'grid',placeItems:'center',background:'rgba(0,0,0,.3)'}} onClick={onClose}>
      <div className="anc-panel" onClick={e=>e.stopPropagation()} style={{width:'min(420px,92vw)',padding:18}}>
        <p style={{fontSize:14,fontWeight:700,marginBottom:12,color:'var(--anc-ink)'}}>Adjuntos — {song.nombre}</p>
        {items.length===0 && <p style={{fontSize:12,color:'var(--anc-ink-3)',marginBottom:10}}>Sin adjuntos todavía.</p>}
        {items.map(it => (
          <div key={it.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--anc-rule)'}}>
            <a href={it.url} target="_blank" rel="noreferrer" style={{flex:1,minWidth:0,fontSize:12,color:'var(--anc-ink-2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.filename||'archivo'}</a>
            <button className="anc-btn anc-btn--quiet" style={{color:'var(--anc-no)'}} onClick={()=>remove(it.id)}>Quitar</button>
          </div>
        ))}
        <label className="anc-btn anc-btn--quiet" style={{marginTop:12,display:'inline-flex',cursor:'pointer'}}>
          {uploading?'Subiendo…':'+ Subir archivo'}
          <input type="file" style={{display:'none'}} onChange={upload} disabled={uploading}/>
        </label>
        <div><button className="anc-btn anc-btn--quiet" style={{marginTop:12}} onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  )
}
