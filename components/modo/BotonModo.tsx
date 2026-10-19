'use client'
// Botón de modo (fase 1, Modo · A): píldora de 44 px con ícono, texto y chevron. Es un ENLACE (cambia de pantalla). Lo usan el portal («Modo Admin» / «Modo Líder») y la barra de /admin y /home
// («Modo Usuario»). Solo dibuja lo que recibe: qué botón corresponde lo decide lib/modo.ts, y quién tiene rol lo decide el servidor.
import { ChevronRight, Shield, User, Users } from 'lucide-react'
import type { BotonDeModo } from '@/lib/modo'
import ui from './modo.module.css'

const ICONOS = { admin: Shield, lider: Users, usuario: User } as const

export function BotonModo({ modo, className }: { modo: BotonDeModo | null; className?: string }) {
  if (!modo) return null
  const Icono = ICONOS[modo.icono]
  return (
    <a href={modo.href} className={`${ui.boton}${className ? ` ${className}` : ''}`}>
      <Icono className={ui.icono} size="1.25rem" strokeWidth={1.75} aria-hidden="true" />
      <span>{modo.texto}</span>
      <ChevronRight className={ui.chev} size="1rem" strokeWidth={2} aria-hidden="true" />
    </a>
  )
}

/** «MODO ADMIN» / «MODO LÍDER»: dice dónde estás. Es texto, no un control. */
export function EtiquetaModo({ texto }: { texto: string }) {
  return <span className={ui.etiqueta}>{texto}</span>
}
