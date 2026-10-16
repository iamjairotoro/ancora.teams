'use client'
// «Mis datos» (punto 54, commit 1): nombre, apellido, teléfono y fecha de nacimiento, editables en la misma tarjeta. El correo no se cambia desde aquí. Se guarda por
// /api/portal/me (sesión) o /api/member-portal (enlace del correo); ya NO se manda `instrumentos` (la columna no se toca) y un fallo se dice: antes siempre decía «¡Guardado!».
import { useEffect, useRef, useState } from 'react'
import type { DatosPersona } from './tipos'
import ui from './perfil.module.css'

const vista = (v?: string | null) => (v && v.trim() ? v : '—')
const fechaLarga = (f?: string | null) => (f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')

export default function MisDatos({ persona, esSesion, token, onGuardado }: {
  persona: DatosPersona
  esSesion: boolean
  token: string | null
  onGuardado: (cambios: { nombre: string; apellido: string; telefono: string; fecha_nacimiento: string }) => void
}) {
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [f, setF] = useState({ nombre: '', apellido: '', telefono: '', fecha_nacimiento: '' })
  const primero = useRef<HTMLInputElement>(null), botonEditar = useRef<HTMLButtonElement>(null), devolverFoco = useRef(false)

  function abrir() {
    setF({ nombre: persona.nombre || '', apellido: persona.apellido || '', telefono: persona.telefono || '', fecha_nacimiento: persona.fecha_nacimiento || '' })
    setError(null); setOk(false); setEditando(true)
  }
  useEffect(() => {
    if (editando) primero.current?.focus()
    else if (devolverFoco.current) { devolverFoco.current = false; botonEditar.current?.focus() }      // al cerrar el formulario el foco vuelve a «Editar»
  }, [editando])
  useEffect(() => { if (!ok) return; const t = setTimeout(() => setOk(false), 3500); return () => clearTimeout(t) }, [ok])

  function cerrar() { devolverFoco.current = true; setEditando(false); setError(null) }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!f.nombre.trim()) { setError('El nombre es obligatorio.'); primero.current?.focus(); return }
    setGuardando(true); setError(null)
    try {
      const cuerpo = esSesion ? f : { token, ...f }
      const res = await fetch(esSesion ? '/api/portal/me' : '/api/member-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(res.status === 401 ? 'Tu sesión venció. Recarga la página para entrar de nuevo.' : (res.status < 500 && typeof data?.error === 'string' ? data.error : 'No se pudo guardar. Intenta de nuevo.')); setGuardando(false); return }
      onGuardado({ ...f, nombre: f.nombre.trim() })
      devolverFoco.current = true; setOk(true); setEditando(false)
    } catch { setError('No se pudo guardar. Revisa tu conexión e intenta de nuevo.') }
    setGuardando(false)
  }

  return (
    <section className={ui.tarjeta} aria-labelledby="perfil-datos">
      <div className={ui.tCab}>
        <h2 className={ui.tTit} id="perfil-datos">Mis datos</h2>
        {!editando && <button type="button" ref={botonEditar} className={ui.editar} onClick={abrir}>Editar</button>}
      </div>
      <p className={ui.sr} role="status" aria-live="polite">{ok ? 'Datos guardados.' : ''}</p>
      {ok && <p className={ui.pie} aria-hidden="true">Guardado.</p>}
      {!editando ? (
        <>
          <dl className={ui.datos}>
            <div className={ui.dato}><dt>Nombre</dt><dd>{vista(`${persona.nombre || ''} ${persona.apellido || ''}`.trim())}</dd></div>
            <div className={ui.dato}><dt>Correo</dt><dd>{vista(persona.email)}</dd></div>
            <div className={ui.dato}><dt>Teléfono</dt><dd>{vista(persona.telefono)}</dd></div>
            <div className={ui.dato}><dt>Nacimiento</dt><dd>{fechaLarga(persona.fecha_nacimiento)}</dd></div>
          </dl>
          <p className={ui.pie}>Para cambiar tu correo, contacta al administrador.</p>
        </>
      ) : (
        <form className={ui.form} onSubmit={guardar} noValidate>
          <div className={ui.campo}><label htmlFor="pf-nombre">Nombre</label><input id="pf-nombre" ref={primero} value={f.nombre} maxLength={200} autoComplete="given-name" onChange={e => setF({ ...f, nombre: e.target.value })} /></div>
          <div className={ui.campo}><label htmlFor="pf-apellido">Apellido</label><input id="pf-apellido" value={f.apellido} maxLength={200} autoComplete="family-name" onChange={e => setF({ ...f, apellido: e.target.value })} /></div>
          <div className={ui.campo}><label htmlFor="pf-tel">Teléfono</label><input id="pf-tel" type="tel" inputMode="tel" value={f.telefono} maxLength={200} autoComplete="tel" onChange={e => setF({ ...f, telefono: e.target.value })} /></div>
          <div className={ui.campo}><label htmlFor="pf-nac">Fecha de nacimiento</label><input id="pf-nac" type="date" value={f.fecha_nacimiento} autoComplete="bday" onChange={e => setF({ ...f, fecha_nacimiento: e.target.value })} /></div>
          {error && <p className={ui.err} role="alert" style={{ padding: 0 }}>{error}</p>}
          <div className={ui.acciones}>
            <button type="submit" className={`${ui.btn} ${ui.btnA}`} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            <button type="button" className={`${ui.btn} ${ui.btnQ}`} onClick={cerrar} disabled={guardando}>Cancelar</button>
          </div>
        </form>
      )}
    </section>
  )
}
