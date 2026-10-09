'use client'
import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service } from '@/lib/types'
import type { PositionGroup } from '@/lib/personPositions'
import { dayBlocks, blocksWindow, type TeamBlockRow, type Viewer } from '@/lib/teamBlocks'
import { useRefreshOnVisible } from '@/lib/useRefreshOnVisible'
import DayBlocksPanel from './DayBlocksPanel'
import TeamBlocksCalendar from './TeamBlocksCalendar'

interface Props {
  services: Service[]
  darkMode?: boolean
  // Posiciones por persona (agrupadas por equipo), armadas en /admin con las
  // listas que ya carga: acá no se consulta nada por persona.
  positionsByMember?: Map<string, PositionGroup[]>
  // Punto 60: el panel del día es el MISMO que el del Home (components/DayBlocksPanel.tsx). Esta pestaña es solo
  // de administración, así que quien mira ve todos los equipos.
  members: { id: string; nombre: string; apellido?: string | null }[]
  teams: { id: string; name: string; color?: string | null }[]
  teamMembers: { member_id: string; team_id: string }[]
}

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }

export default function AvailabilityPanel({ services, darkMode, positionsByMember, members, teams, teamMembers }: Props) {
  const C = darkMode ? DARK_C : LIGHT_C
  const [calMonth, setCalMonth] = useState(() => { const d=new Date(); return {year:d.getFullYear(),month:d.getMonth()} })
  const [selectedDate, setSelectedDate] = useState<string|null>(null)
  // Filas POR EQUIPO de toda la ventana (team_blocks_in_range); se conserva el team_id (punto 60). Las usan los
  // puntos del calendario y el panel del día abierto.
  const [rows, setRows] = useState<TeamBlockRow[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)
  // Esta pestaña es solo de administración: quien mira ve todos los equipos.
  const viewer: Viewer = { kind: 'admin' }

  const now = new Date()
  const futureServices = services.filter(s => {
    const endTime = (s as any).hora_fin ? s.fecha+'T'+(s as any).hora_fin : s.fecha+'T14:00:00'
    return new Date(endTime) > now
  })

  const { year, month } = calMonth
  const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const todayISO = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const serviceDates = new Set(futureServices.map(sv => sv.fecha))

  // Una sola función para cargar toda la ventana: al abrir un día, al volver a la pestaña y al montar.
  const loadWindow = useCallback(async () => {
    const r = blocksWindow()
    const { data, error } = await supabase.rpc('team_blocks_in_range', { p_from: r.from, p_to: r.to })
    if (!error) setRows((data || []) as TeamBlockRow[])
  }, [])

  useEffect(() => { loadWindow() }, [loadWindow])

  async function loadBlockedMembers(fecha: string) {
    setSelectedDate(fecha)
    setLoadingBlocked(true)
    await loadWindow()
    markFresh()
    setLoadingBlocked(false)
  }

  // Al volver a la pestaña (máximo una recarga cada 30 s) se refrescan puntos y panel del día abierto.
  const { markFresh } = useRefreshOnVisible(loadWindow)

  // Datos para el panel compartido.
  const teamSizes = new Map<string, number>()
  teamMembers.forEach(tm => teamSizes.set(tm.team_id, (teamSizes.get(tm.team_id) || 0) + 1))
  const blockedCount = selectedDate ? dayBlocks(rows, selectedDate, viewer).people.length : 0

  function fmtFecha(fecha:string) {
    const d = new Date(fecha+'T12:00:00')
    const dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div style={{maxWidth:900,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div className="admin-layout-grid" style={{display:'grid',gridTemplateColumns:'minmax(0,360px) 1fr',gap:16,alignItems:'flex-start'}}>

        {/* Calendario */}
        <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:14}}>
          {/* Nav mes */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month-1);return{year:d.getFullYear(),month:d.getMonth()}})}
              style={{width:26,height:26,borderRadius:7,background:C.crema,border:`0.5px solid ${C.cremaDark}`,cursor:'pointer',fontSize:13,color:C.muted}}>‹</button>
            <span style={{fontSize:13,fontWeight:500,color:C.txt}}>
              {monthNames[month].charAt(0).toUpperCase()+monthNames[month].slice(1)} {year}
            </span>
            <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month+1);return{year:d.getFullYear(),month:d.getMonth()}})}
              style={{width:26,height:26,borderRadius:7,background:C.crema,border:`0.5px solid ${C.cremaDark}`,cursor:'pointer',fontSize:13,color:C.muted}}>›</button>
          </div>

          {/* Calendario compartido con el Home (punto 60): puntos por equipo + personas distintas */}
          <TeamBlocksCalendar
            year={year} month={month} rows={rows} viewer={viewer} size="roomy"
            teams={teams} serviceDates={serviceDates} today={todayISO} selectedDate={selectedDate}
            onDayClick={d => { if (d === selectedDate) { setSelectedDate(null) } else { loadBlockedMembers(d) } }}
          />

          {/* Leyenda */}
          <p style={{fontSize:10,fontWeight:300,color:C.muted,marginTop:10,lineHeight:1.5}}>
            Cada punto es un equipo; el número, las personas que bloquearon para él. La marca arriba a la izquierda es un servicio programado.
          </p>
        </div>

        {/* Panel de bloqueados */}
        {selectedDate&&(
          <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
              <p style={{fontSize:11,fontWeight:700,color:C.txt,letterSpacing:0.3}}>{fmtFecha(selectedDate)}</p>
              <p style={{fontSize:10,fontWeight:300,color:C.muted,marginTop:2}}>
                {loadingBlocked?'Cargando...':blockedCount===0?'Nadie ha bloqueado esta fecha':
                `${blockedCount} persona${blockedCount!==1?'s':''} no disponible${blockedCount!==1?'s':''}`}
              </p>
            </div>
            {!loadingBlocked&&blockedCount===0&&(
              <div style={{padding:'24px 16px',textAlign:'center'}}>
                <p style={{fontSize:28,marginBottom:8}}>✓</p>
                <p style={{fontSize:13,fontWeight:400,color:C.muted}}>Todos están disponibles este día</p>
              </div>
            )}
            {!loadingBlocked&&blockedCount>0&&selectedDate&&(
              <div style={{padding:'10px 16px 12px'}}>
                <DayBlocksPanel
                  rows={rows} date={selectedDate} viewer={viewer}
                  teams={teams} teamSizes={teamSizes} people={members}
                  personTeamIds={(m: string) => teamMembers.filter(tm => tm.member_id === m).map(tm => tm.team_id)}
                  positionsOf={(m: string, t: string) => positionsByMember?.get(m)?.find(g => g.teamId === t)?.positions || []}
                />
              </div>
            )}
          </div>
        )}

        {!selectedDate&&(
          <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:'24px 16px',textAlign:'center'}}>
            <p style={{fontSize:13,fontWeight:300,color:C.muted}}>Toca un día para ver quién no está disponible</p>
          </div>
        )}
      </div>
    </div>
  )
}
