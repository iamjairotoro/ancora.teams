'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import TeamPanel from '@/components/TeamPanel'
import TeamsAdminPanel from '@/components/TeamsAdminPanel'
import type { Member } from '@/lib/types'

interface Props { members: Member[]; onRefreshMembers: () => void; darkMode?: boolean }

type SubTab = 'personas' | 'equipos'

export default function PersonasEquiposPanel({ members, onRefreshMembers, darkMode }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sub: SubTab = searchParams.get('sub') === 'equipos' ? 'equipos' : 'personas'

  function setSub(next: SubTab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sub', next)
    if (next === 'personas') { params.delete('team'); params.delete('filter') }
    router.replace(`/admin?${params.toString()}`, { scroll: false })
  }

  const tabBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 20,
    background: active ? '#1A1A1A' : 'transparent', color: active ? '#F5F0E6' : (darkMode ? 'rgba(245,240,230,0.6)' : '#666'),
    border: `0.5px solid ${active ? '#1A1A1A' : (darkMode ? 'rgba(255,255,255,0.12)' : '#D6D5D1')}`,
    cursor: 'pointer', fontFamily: 'inherit',
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={tabBtn(sub === 'personas')} onClick={() => setSub('personas')}>Personas</button>
        <button style={tabBtn(sub === 'equipos')} onClick={() => setSub('equipos')}>Equipos</button>
      </div>
      {sub === 'personas'
        ? <TeamPanel members={members} onRefresh={onRefreshMembers} />
        : <TeamsAdminPanel darkMode={darkMode} />}
    </div>
  )
}
