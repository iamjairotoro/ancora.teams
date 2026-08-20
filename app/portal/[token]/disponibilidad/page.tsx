'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import DisponibilidadCalendar, { disponibilidadTheme } from '@/components/DisponibilidadCalendar'

export default function DisponibilidadPage(){
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [darkMode, setDarkMode] = useState(false)

  useEffect(()=>{
    const saved = localStorage.getItem('ancora-dark-mode')
    if(saved==='true') setDarkMode(true)
  },[])

  const {BG, BORDER, TXT, MUTED, NAV_BG} = disponibilidadTheme(darkMode)

  return (
    <div style={{minHeight:'100vh',background:BG,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif',paddingBottom:40}}>
      <div style={{background:NAV_BG,borderBottom:`0.5px solid ${BORDER}`,padding:'14px 16px',position:'sticky',top:0,zIndex:10}}>
        <div style={{maxWidth:500,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.back()} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,display:'flex',alignItems:'center',padding:0}}>
            <ChevronLeft size={22}/>
          </button>
          <span style={{fontSize:15,fontWeight:500,color:TXT}}>Mi disponibilidad</span>
        </div>
      </div>

      <div style={{maxWidth:500,margin:'0 auto',padding:'14px 16px'}}>
        <DisponibilidadCalendar token={token} darkMode={darkMode}/>
      </div>
    </div>
  )
}
