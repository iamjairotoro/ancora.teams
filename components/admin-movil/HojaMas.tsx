'use client'
// Hoja «Más» (Menú · A): lo que no cabe en los ítems del menú inferior — Calendario, Chats, Admins (solo el owner) —, la Apariencia y Cerrar sesión. Al cerrar, el foco vuelve al botón «Más» del menú
// (lo hace MenuAdminMovil). El comportamiento de la hoja (Escape, atrás, fondo, foco, zona segura) está en HojaBase.
import { CalendarDays, ChevronRight, LogOut, MessageCircle, ShieldCheck } from 'lucide-react'
import type { ThemePref } from '@/lib/useDarkMode'
import { filasDeMas } from '@/lib/admin/menuMovil'
import AparienciaControl from '@/app/portal/_components/AparienciaControl'
import HojaBase from './HojaBase'
import ui from './mas.module.css'

const ICONO = { disponibilidad: CalendarDays, chats: MessageCircle, admins: ShieldCheck } as const

export default function HojaMas({ nombreOrg, iniciales, esOwner, themePref, onThemePref, onTab, onSignOut, onCerrar }: {
  nombreOrg: string; iniciales: string; esOwner: boolean
  themePref: ThemePref; onThemePref: (p: ThemePref) => void
  onTab: (tab: 'disponibilidad' | 'chats' | 'admins') => void
  onSignOut: () => void
  onCerrar: () => void
}) {
  return (
    <HojaBase idTitulo="mas-titulo" onCerrar={onCerrar}
      cabeza={
        <div className={ui.quien}>
          <span className={ui.ini} aria-hidden="true">{iniciales}</span>
          <div><h2 className={ui.org} id="mas-titulo">{nombreOrg}</h2><p className={ui.sub}>Administración</p></div>
        </div>
      }>
      {cerrar => (
        <>
          <div className={ui.lista}>
            {filasDeMas({ esOwner }).map(f => {
              const Icono = ICONO[f.key]
              return (
                <button key={f.key} type="button" className={ui.fila} onClick={() => cerrar(() => onTab(f.tab))}>
                  <span className={ui.ficono} aria-hidden="true"><Icono size={18} strokeWidth={1.75} /></span>
                  <span className={ui.ftxt}><span className={ui.ft}>{f.label}</span>{f.detalle && <span className={ui.fd}>{f.detalle}</span>}</span>
                  <ChevronRight size={16} className={ui.chev} aria-hidden="true" />
                </button>
              )
            })}
          </div>

          <AparienciaControl pref={themePref} onChange={onThemePref} />

          <div className={ui.lista}>
            <button type="button" className={`${ui.fila} ${ui.salir}`} onClick={() => cerrar(onSignOut)}>
              <LogOut size={20} strokeWidth={1.75} aria-hidden="true" /><span>Cerrar sesión</span>
            </button>
          </div>
        </>
      )}
    </HojaBase>
  )
}
