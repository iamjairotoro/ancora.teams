'use client'
import { useState } from 'react'
import type { Service, Member, Song, SetlistItem, BandaAssignment, Invitation } from '@/lib/types'

const NOTAS = ['A','A#','Bb','B','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab']

interface Props {
  services: Service[]
  selectedService: Service | null
  setSelectedService: (s: Service) => void
  createService: (fecha: string) => void
  editServiceTitle: (id: string, titulo: string) => void
  deleteService: (id: string) => void
  duplicateService: (id: string, newFecha: string) => void
  members: Member[]
  songs: Song[]
  setlistItems: SetlistItem[]
  bandaItems: BandaAssignment[]
  invitations: Invitation[]
  membersFor: (pos: string) => Member[]
  getBanda: (pos: string) => BandaAssignment | undefined
  assignBanda: (pos: string, memberId: string) => void
  addSetlistRow: () => void
  updateSetlistItem: (id: string, field: string, value: string) => void
  removeSetlistRow: (id: string) => void
  sendInvites: () => void
  sending: boolean
  msg: string
  statusColor: (s: string) => string
  POSICIONES_BANDA: readonly string[]
  POSICIONES_VX: readonly string[]
}

export default function ServicePanel({
  services, selectedService, setSelectedService, createService,
  editServiceTitle, deleteService, duplicateService,
  members, songs, setlistItems, bandaItems, invitations,
  membersFor, getBanda, assignBanda, addSetlistRow,
  updateSetlistItem, removeSetlistRow,
  sendInvites, sending, msg, statusColor,
  POSICIONES_BANDA, POSICIONES_VX
}: Props) {
  const [newFecha, setNewFecha]     = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [showDup, setShowDup]       = useState(false)
  const [dupFecha, setDupFecha]     = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal]     = useState('')

  function fmt(fecha: string) {
    const d = new Date(fecha + 'T12:00:00')
    const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
  }

  const confirmed = invitations.filter(i => i.status === 'confirmado').length
  const declined  = invitations.filter(i => i.status === 'declinado').length
  const pending   = invitations.filter(i => i.status === 'pendiente').length

  return (
    <div className="space-y-4">
      {/* Service selector */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <select className="input w-auto flex-1 min-w-48"
          value={selectedService?.id || ''}
          onChange={e => { const s = services.find(sv => sv.id === e.target.value); if (s) setSelectedService(s) }}>
          {services.map(s => <option key={s.id} value={s.id}>{fmt(s.fecha)} — {s.titulo}</option>)}
          {!services.length && <option>Sin servicios aún</option>}
        </select>
        <button onClick={() => setShowNew(v => !v)} className="btn-secondary text-sm">+ Nuevo</button>
        {selectedService && (
          <>
            <button onClick={() => setShowDup(v => !v)} className="btn-secondary text-sm" title="Duplicar servicio">⧉ Duplicar</button>
            <button onClick={() => { setEditingTitle(true); setTitleVal(selectedService.titulo) }}
              className="btn-secondary text-sm" title="Editar nombre">✏️ Editar</button>
            <button onClick={() => deleteService(selectedService.id)}
              className="text-sm text-red-400 hover:text-red-600 px-2 py-2" title="Eliminar">🗑</button>
          </>
        )}
      </div>

      {/* New service form */}
      {showNew && (
        <div className="card p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Fecha del servicio</label>
            <input type="date" className="input" value={newFecha} onChange={e => setNewFecha(e.target.value)} />
          </div>
          <button onClick={() => { if (newFecha) { createService(newFecha); setNewFecha(''); setShowNew(false) } }}
            className="btn-primary">Crear</button>
        </div>
      )}

      {/* Duplicate form */}
      {showDup && selectedService && (
        <div className="card p-4 flex gap-3 items-end border-gold border">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Duplicar "{selectedService.titulo}" a esta fecha:</label>
            <input type="date" className="input" value={dupFecha} onChange={e => setDupFecha(e.target.value)} />
          </div>
          <button onClick={() => { if (dupFecha) { duplicateService(selectedService.id, dupFecha); setDupFecha(''); setShowDup(false) } }}
            className="btn-gold">Duplicar</button>
        </div>
      )}

      {/* Edit title */}
      {editingTitle && selectedService && (
        <div className="card p-4 flex gap-3 items-end border-navy border">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Nombre del servicio</label>
            <input className="input" value={titleVal} onChange={e => setTitleVal(e.target.value)} />
          </div>
          <button onClick={() => { editServiceTitle(selectedService.id, titleVal); setEditingTitle(false) }}
            className="btn-primary">Guardar</button>
          <button onClick={() => setEditingTitle(false)} className="btn-secondary">Cancelar</button>
        </div>
      )}

      {selectedService && (<>
        {/* BANDA */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-navy mb-3 uppercase tracking-wide">🎸 Banda</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {POSICIONES_BANDA.map(pos => {
              const asig = getBanda(pos)
              const opts = membersFor(pos)
              return (
                <div key={pos}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{pos}</label>
                  <select className="input text-sm" value={asig?.member_id || ''}
                    onChange={e => assignBanda(pos, e.target.value)}>
                    <option value="">—</option>
                    {opts.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        {/* VOCES */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-navy mb-3 uppercase tracking-wide">🎤 Voces</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {POSICIONES_VX.map(pos => {
              const asig = getBanda(pos)
              const opts = membersFor(pos)
              return (
                <div key={pos}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{pos}</label>
                  <select className="input text-sm" value={asig?.member_id || ''}
                    onChange={e => assignBanda(pos, e.target.value)}>
                    <option value="">—</option>
                    {opts.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        {/* SETLIST */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-navy mb-3 uppercase tracking-wide">📋 Setlist</h2>
          <div className="space-y-2">
            {setlistItems.map((item, idx) => (
              <div key={item.id} className="flex gap-2 items-center">
                <span className="text-xs text-gray-400 w-5 text-right">{idx+1}</span>
                <select className="input text-sm flex-1" value={item.song_id || ''}
                  onChange={e => updateSetlistItem(item.id, 'song_id', e.target.value)}>
                  <option value="">— Canción —</option>
                  {songs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                <select className="input text-sm w-20" value={item.tono || ''}
                  onChange={e => updateSetlistItem(item.id, 'tono', e.target.value)}>
                  <option value="">Tono</option>
                  {NOTAS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select className="input text-sm w-36" value={item.lead_id || ''}
                  onChange={e => updateSetlistItem(item.id, 'lead_id', e.target.value)}>
                  <option value="">— Lead —</option>
                  {members.filter(m => m.instrumentos.includes('Voz')).map(m =>
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  )}
                </select>
                <button onClick={() => removeSetlistRow(item.id)}
                  className="text-gray-300 hover:text-red-400 text-lg leading-none px-1">×</button>
              </div>
            ))}
          </div>
          <button onClick={addSetlistRow} className="mt-3 text-sm text-navy hover:underline">+ Agregar canción</button>
        </div>

        {/* INVITACIONES */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-navy uppercase tracking-wide">✉️ Invitaciones</h2>
            <div className="flex gap-2 items-center">
              {invitations.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ {confirmed}</span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">✗ {declined}</span>
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⏳ {pending}</span>
                </div>
              )}
              <button onClick={sendInvites} disabled={sending} className="btn-primary text-sm">
                {sending ? 'Enviando...' : invitations.length ? 'Reenviar' : 'Enviar invitaciones'}
              </button>
            </div>
          </div>
          {msg && <p className="text-sm text-green-600 mb-3">{msg}</p>}
          {invitations.length > 0 ? (
            <div className="space-y-2">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{inv.member?.nombre} {inv.member?.apellido}</p>
                    {inv.comentario && <p className="text-xs text-gray-500 mt-0.5">"{inv.comentario}"</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(inv.status)}`}>
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Al presionar "Enviar invitaciones" se enviará un correo a cada músico asignado.</p>
          )}
        </div>
      </>)}
    </div>
  )
}
