'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Song } from '@/lib/types'


function toMMSS(totalSeconds: number): string {
  if (!totalSeconds) return ''
  const m = Math.floor(totalSeconds / 60)
  const s = Math.round(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fromMMSS(val: string): number {
  if (!val) return 0
  if (val.includes(':')) {
    const [m, s] = val.split(':').map(Number)
    return (m || 0) * 60 + (s || 0)
  }
  return parseFloat(val) * 60 // fallback: plain number treated as minutes
}

const NOTAS   = ['A','A#','Bb','B','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab']
const COMPASES = ['4/4','3/4','6/8','12/8','2/4','5/4','7/8']

interface Props { songs: Song[]; onRefresh: () => void }
const newEmpty = (): Partial<Song> => ({ nombre:'',artista:'',tono_original:'',bpm:undefined,compas:'',link_spotify:'',link_letras:'',link_recursos:'',spotify_url:'',apple_music_url:'',caratula_url:'',notas:'', duracion_min:undefined })

export default function SongsPanel({ songs, onRefresh }: Props) {
  const [editing, setEditing] = useState<Partial<Song>|null>(null)
  const [saving, setSaving]   = useState(false)
  const [search, setSearch]   = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editing) return
    if (file.size > 3 * 1024 * 1024) { alert('La imagen debe ser menor a 3MB'); return }
    setUploadingCover(true)
    const ext = file.name.split('.').pop()
    const path = `${editing.id || 'nueva-' + Date.now()}.${ext}`
    const { error } = await supabase.storage.from('song-covers').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { alert('Error subiendo la carátula'); setUploadingCover(false); return }
    const { data } = supabase.storage.from('song-covers').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()
    setEditing(prev => prev ? {...prev, caratula_url: url} : prev)
    setUploadingCover(false)
  }

  async function save() {
    if (!editing?.nombre) return
    setSaving(true)
    const payload = {
      nombre: editing.nombre, artista: editing.artista||'',
      tono_original: editing.tono_original||null, bpm: editing.bpm||null,
      compas: editing.compas||null, link_spotify: editing.link_spotify||null,
      link_letras: editing.link_letras||null, link_recursos: editing.link_recursos||null,
      spotify_url: editing.spotify_url||null, apple_music_url: editing.apple_music_url||null,
      caratula_url: editing.caratula_url||null,
      notas: editing.notas||null, duracion_min: editing.duracion_min||null,
    }
    if (editing.id) await supabase.from('songs').update(payload).eq('id', editing.id)
    else            await supabase.from('songs').insert(payload)
    setSaving(false); setEditing(null); onRefresh()
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar esta canción?')) return
    await supabase.from('songs').delete().eq('id', id)
    onRefresh()
  }

  const filtered = songs.filter(s =>
    s.nombre.toLowerCase().includes(search.toLowerCase()) ||
    s.artista.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <input className="input flex-1" placeholder="🔍 Buscar canción o artista..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={() => setEditing(newEmpty())} className="btn-primary text-sm whitespace-nowrap">+ Agregar</button>
      </div>

      {editing && (
        <div className="card p-5 border-2 border-navy dark:border-white/10">
          <h3 className="font-bold text-navy dark:text-[#F5F0E6] mb-4 text-base">{editing.id ? 'Editar' : 'Nueva'} canción</h3>

          {/* Carátula */}
          <div className="flex items-center gap-3 mb-4">
            <label className="relative cursor-pointer group flex-shrink-0">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-navy/10 dark:bg-white/10 flex items-center justify-center">
                {editing.caratula_url
                  ? <img src={editing.caratula_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-2xl">🎵</span>}
              </div>
              <div className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingCover
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <span className="text-white text-xs">📷</span>}
              </div>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleCoverUpload} />
            </label>
            <p className="text-xs text-gray-400 dark:text-white/30">Toca la imagen para subir una carátula<br/>(máx. 3MB)</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">Nombre *</label>
              <input className="input" placeholder="Nombre de la canción" value={editing.nombre||''} onChange={e => setEditing({...editing,nombre:e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">Artista / Autor</label>
              <input className="input" value={editing.artista||''} onChange={e => setEditing({...editing,artista:e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">Tono original</label>
              <select className="input" value={editing.tono_original||''} onChange={e => setEditing({...editing,tono_original:e.target.value})}>
                <option value="">—</option>
                {NOTAS.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">BPM / Tempo</label>
              <input className="input" type="number" placeholder="ej: 72.5" step="0.1" min="0" value={editing.bpm||''} onChange={e => setEditing({...editing,bpm:parseFloat(e.target.value)||undefined})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">Compás</label>
              <select className="input" value={editing.compas||''} onChange={e => setEditing({...editing,compas:e.target.value})}>
                <option value="">—</option>
                {COMPASES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">Duración (min)</label>
              <input className="input" type="text" placeholder="ej: 6:59" 
                value={editing.duracion_min ? toMMSS(editing.duracion_min) : ''}
                onChange={e => setEditing({...editing, duracion_min: fromMMSS(e.target.value) || undefined})}
                onBlur={e => {
                  const secs = fromMMSS(e.target.value)
                  if (secs) setEditing(prev => prev ? {...prev, duracion_min: secs} : prev)
                }} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">Link YouTube</label>
              <input className="input" placeholder="https://www.youtube.com/..." value={editing.link_spotify||''} onChange={e => setEditing({...editing,link_spotify:e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">🟢 Spotify</label>
              <input className="input" placeholder="https://open.spotify.com/track/..." value={editing.spotify_url||''} onChange={e => setEditing({...editing,spotify_url:e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">🎵 Apple Music</label>
              <input className="input" placeholder="https://music.apple.com/..." value={editing.apple_music_url||''} onChange={e => setEditing({...editing,apple_music_url:e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">Letras / Acordes</label>
              <input className="input" placeholder="https://drive.google.com/..." value={editing.link_letras||''} onChange={e => setEditing({...editing,link_letras:e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">📁 Recursos (Drive, MultiTracks, etc.)</label>
              <input className="input" placeholder="https://drive.google.com/... o cualquier link de archivos" value={editing.link_recursos||''} onChange={e => setEditing({...editing,link_recursos:e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-500 dark:text-white/40 mb-1 block font-medium">Notas internas</label>
              <input className="input" placeholder="ej: intro con solo de guitarra, coda larga..." value={editing.notas||''} onChange={e => setEditing({...editing,notas:e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving?'Guardando...':'Guardar'}</button>
            <button onClick={() => setEditing(null)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-gray-50 dark:divide-white/5">
        {filtered.length===0 && <p className="p-4 text-sm text-gray-400 dark:text-white/30">{search?'Sin resultados.':'Sin canciones. Agrega la primera.'}</p>}
        {filtered.map(s => (
          <div key={s.id} className="flex items-start gap-2 p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-navy/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0 text-sm overflow-hidden">
              {s.caratula_url ? <img src={s.caratula_url} alt="" className="w-full h-full object-cover" /> : '🎵'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-sm text-navy dark:text-[#F5F0E6] truncate">{s.nombre}</p>
                {s.link_spotify   && <a href={s.link_spotify}   target="_blank" title="YouTube" className="w-5 h-5 flex items-center justify-center bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 rounded text-xs flex-shrink-0">▶️</a>}
                {s.spotify_url    && <a href={s.spotify_url}    target="_blank" title="Spotify" className="w-5 h-5 flex items-center justify-center bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 rounded text-xs flex-shrink-0">🟢</a>}
                {s.apple_music_url && <a href={s.apple_music_url} target="_blank" title="Apple Music" className="w-5 h-5 flex items-center justify-center bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-400 rounded text-xs flex-shrink-0">🎵</a>}
                {s.link_letras    && <a href={s.link_letras}    target="_blank" title="Letras" className="w-5 h-5 flex items-center justify-center bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded text-xs flex-shrink-0">📄</a>}
                {s.link_recursos  && <a href={s.link_recursos}  target="_blank" title="Recursos" className="w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 rounded text-xs flex-shrink-0">📁</a>}
              </div>
              <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5 truncate">{s.artista}</p>
              <div className="flex gap-1 flex-wrap mt-1.5">
                {s.tono_original && <span className="bg-navy/10 dark:bg-white/10 text-navy dark:text-[#F5F0E6] px-1.5 py-0.5 rounded text-xs font-medium">{s.tono_original}</span>}
                {s.bpm && <span className="bg-gold/20 dark:bg-gold/25 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded text-xs">{s.bpm} BPM</span>}
                {s.duracion_min && <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50 px-1.5 py-0.5 rounded text-xs">{toMMSS(s.duracion_min)}</span>}
                {s.compas && <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50 px-1.5 py-0.5 rounded text-xs">{s.compas}</span>}
              </div>
              {s.notas && <p className="text-xs text-gray-400 dark:text-white/30 mt-1 italic truncate">{s.notas}</p>}
            </div>
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button onClick={() => setEditing({...s})} className="text-xs text-gray-400 dark:text-white/40 hover:text-navy dark:hover:text-[#F5F0E6] px-1.5 py-0.5">Editar</button>
              <button onClick={() => del(s.id)} className="text-xs text-gray-400 dark:text-white/40 hover:text-red-500 px-1.5 py-0.5">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-400 dark:text-white/30 text-center">{filtered.length} canción{filtered.length!==1?'es':''}</p>
    </div>
  )
}
