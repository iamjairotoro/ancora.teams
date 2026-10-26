'use client'
// «Mis datos» (punto 54, commit 1, rediseño): el formulario de edición que se abre desde la fila «Mis datos» de «Cuenta». Nombre, apellido, teléfono y fecha de nacimiento; el correo no se cambia desde
// aquí. Se guarda por /api/portal/me (sesión) o /api/member-portal (enlace del correo); NO manda `instrumentos` (la columna no se toca) y un fallo se dice: nunca un «¡Guardado!» falso.
import { TEXTOS } from '@/lib/textos/comun'
import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { fechaNacimientoParaGuardar, textoFechaNacimiento } from '@/lib/portal/fechaNacimiento'
import { TEXTOS_PERFIL_PORTAL } from '@/lib/textos/perfilPortal'
import { useTelefonoYa } from '@/lib/useTelefonoYa'
import type { DatosPersona } from './tipos'
import ui from './perfil.module.css'

export default function MisDatos({ id, persona, esSesion, token, onGuardado, onCerrar }: {
  id: string
  persona: DatosPersona
  esSesion: boolean
  token: string | null
  onGuardado: (cambios: { nombre: string; apellido: string; telefono: string; fecha_nacimiento: string }) => void
  /** Cierra el formulario; `guardado` = se cerró porque se guardó. */
  onCerrar: (guardado: boolean) => void
}) {
  const telefono = useTelefonoYa()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({ nombre: persona.nombre || '', apellido: persona.apellido || '', telefono: persona.telefono || '', fecha_nacimiento: persona.fecha_nacimiento || '' })
  const primero = useRef<HTMLInputElement>(null)
  useEffect(() => { primero.current?.focus() }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!f.nombre.trim()) { setError('El nombre es obligatorio.'); primero.current?.focus(); return }
    setGuardando(true); setError(null)
    try {
      const datos = { ...f, fecha_nacimiento: fechaNacimientoParaGuardar(f.fecha_nacimiento) }      // sin fecha elegida: vacía, nunca «hoy»
      const cuerpo = esSesion ? datos : { token, ...datos }
      const res = await fetch(esSesion ? '/api/portal/me' : '/api/member-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(res.status === 401 ? 'Tu sesión venció. Recarga la página para entrar de nuevo.' : (res.status < 500 && typeof data?.error === 'string' ? data.error : TEXTOS.noSePudoGuardar)); setGuardando(false); return }
      onGuardado({ ...datos, nombre: f.nombre.trim() })
      onCerrar(true); return
    } catch { setError(TEXTOS.noSePudoGuardarConexion) }
    setGuardando(false)
  }

  return (
    <form className={`${ui.form}${telefono ? ` ${ui.formTel}` : ''}`} id={id} onSubmit={guardar} noValidate aria-label="Editar mis datos">
      <div className={ui.campo}><label htmlFor="pf-nombre">Nombre</label><input id="pf-nombre" ref={primero} value={f.nombre} maxLength={200} autoComplete="given-name" onChange={e => setF({ ...f, nombre: e.target.value })} /></div>
      <div className={ui.campo}><label htmlFor="pf-apellido">Apellido</label><input id="pf-apellido" value={f.apellido} maxLength={200} autoComplete="family-name" onChange={e => setF({ ...f, apellido: e.target.value })} /></div>
      <div className={ui.campo}><label htmlFor="pf-tel">Teléfono</label><input id="pf-tel" type="tel" inputMode="tel" value={f.telefono} maxLength={200} autoComplete="tel" onChange={e => setF({ ...f, telefono: e.target.value })} /></div>
      <div className={ui.campo}><label htmlFor="pf-nac">Fecha de nacimiento</label>{telefono ? (
        // teléfono: un campo con borde que dice la fecha o «Elegir fecha»; el selector nativo va encima, invisible (vacío = vacío, nunca hoy)
        <div className={ui.fechaCaja}>
          <span className={`${ui.fechaTxt}${f.fecha_nacimiento ? '' : ` ${ui.fechaVacia}`}`} aria-hidden="true">{textoFechaNacimiento(f.fecha_nacimiento)}</span><CalendarDays size={20} aria-hidden="true" className={ui.fechaIcono} />
          <input id="pf-nac" className={ui.fechaInput} type="date" value={f.fecha_nacimiento} autoComplete="bday" aria-describedby="pf-nac-nota" onChange={e => setF({ ...f, fecha_nacimiento: e.target.value })} />
        </div>
      ) : <input id="pf-nac" type="date" value={f.fecha_nacimiento} autoComplete="bday" aria-describedby="pf-nac-nota" onChange={e => setF({ ...f, fecha_nacimiento: e.target.value })} />}
        {telefono && f.fecha_nacimiento && <button type="button" className={ui.quitarFecha} onClick={() => setF({ ...f, fecha_nacimiento: '' })}>{TEXTOS_PERFIL_PORTAL.quitarFecha}</button>}</div>
      <p id="pf-nac-nota" className={ui.notaCampo}>Tus compañeros de equipo ven el día y el mes.</p>
      <p className={ui.pie} style={{ padding: 0 }}>Para cambiar tu correo, contacta al administrador.</p>
      {error && <p className={ui.err} role="alert" style={{ padding: 0 }}>{error}</p>}
      <div className={ui.acciones}>
        <button type="submit" className={`${ui.btn} ${ui.btnA}`} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" className={`${ui.btn} ${ui.btnQ}`} onClick={() => onCerrar(false)} disabled={guardando}>Cancelar</button>
      </div>
    </form>
  )
}
