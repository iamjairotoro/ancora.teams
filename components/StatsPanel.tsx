'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/lib/types'

interface Stats {
  totalServices: number
  totalConfirmed: number
  totalDeclined: number
  memberStats: { member: Member; confirmed: number; declined: number; pending: number }[]
}

export default function StatsPanel({ members }: { members: Member[] }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: services } = await supabase.from('services').select('id')
      const { data: invitations } = await supabase
        .from('invitations').select('member_id, status')

      if (!invitations) { setLoading(false); return }

      const totalServices = services?.length || 0
      const totalConfirmed = invitations.filter(i => i.status === 'confirmado').length
      const totalDeclined  = invitations.filter(i => i.status === 'declinado').length

      const memberStats = members.map(m => {
        const mine = invitations.filter(i => i.member_id === m.id)
        return {
          member: m,
          confirmed: mine.filter(i => i.status === 'confirmado').length,
          declined:  mine.filter(i => i.status === 'declinado').length,
          pending:   mine.filter(i => i.status === 'pendiente').length,
        }
      }).filter(m => m.confirmed + m.declined + m.pending > 0)
        .sort((a, b) => b.confirmed - a.confirmed)

      setStats({ totalServices, totalConfirmed, totalDeclined, memberStats })
      setLoading(false)
    }
    load()
  }, [members])

  if (loading) return <p className="text-sm text-gray-400 p-4">Cargando estadísticas...</p>
  if (!stats) return null

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Servicios', value: stats.totalServices, color: 'bg-navy text-white' },
          { label: 'Confirmaciones', value: stats.totalConfirmed, color: 'bg-green-50 text-green-700' },
          { label: 'Declinaciones', value: stats.totalDeclined, color: 'bg-red-50 text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`card p-4 text-center ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs mt-1 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Member attendance table */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-navy mb-3 uppercase tracking-wide">📊 Asistencia por músico</h3>
        {stats.memberStats.length === 0 ? (
          <p className="text-sm text-gray-400">Sin datos aún.</p>
        ) : (
          <div className="space-y-2">
            {stats.memberStats.map(({ member, confirmed, declined, pending }) => {
              const total = confirmed + declined + pending
              const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0
              return (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-navy/10 text-navy flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {member.nombre[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium truncate">{member.nombre} {member.apellido}</p>
                      <span className="text-xs text-gray-500 ml-2">{confirmed}/{total} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="bg-green-400 h-full" style={{ width: `${(confirmed/total)*100}%` }} />
                      <div className="bg-red-300 h-full" style={{ width: `${(declined/total)*100}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-1 text-xs flex-shrink-0">
                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{confirmed}</span>
                    <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded">{declined}</span>
                    {pending > 0 && <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">{pending}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Verde = confirmado · Rojo = declinado · Amarillo = pendiente</p>
      </div>
    </div>
  )
}
