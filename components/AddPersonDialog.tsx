'use client'
/* ════════════════════════════════════════════════════════════════════════
   AddPersonDialog.tsx — pop-up «Agregar persona» (punto 28). Modelo visual:
   docs/mockup-agregar-persona.html.

   Es SOLO el alta: los campos, el payload y el insert son los del formulario
   inline de TeamPanel de siempre (la edición sigue con ese formulario). Acá
   no se guarda nada: onSubmit (TeamPanel.addPerson) hace el insert y
   devuelve el resultado — este componente nunca ignora un error: si falla,
   el pop-up sigue abierto con lo escrito y el mensaje.

   Punto 38: el mismo pop-up sirve para EDITAR (mode='edit', con `initial`):
   mismos campos, mismo update que hacía TeamPanel.save(); sin el campo
   Equipos (se gestiona desde Equipos) y sin «Agregar otra». El error de
   correo de la migración 027 (solo un admin con sesión puede cambiarlo) sale
   en el campo del correo.

   Punto 37: la persona nace dirigida a EQUIPOS (chips con los equipos
   reales de la base); las posiciones se asignan después, dentro de cada
   equipo. Los instrumentos NO se borran —alimentan lib/equipos.ts
   (esConvocableAEnsayo)— y pasan a «Más datos».

   Reglas de validación: las de siempre (nombre y correo obligatorios, sin
   trim) MÁS dos aditivas — formato permisivo de correo y correo repetido
   (contra la lista local, en minúsculas y sin espacios; la fuente de verdad
   sigue siendo el 23505 del insert). El correo se guarda tal cual se escribió.
   ════════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Instrument, Genero, EstadoCivil, Member } from '@/lib/types'
import { ALL_INSTRUMENTOS, INSTRUMENTO_CORTO, GENERO_OPTIONS, ESTADO_CIVIL_OPTIONS } from '@/lib/personForm'
import styles from './add-person-dialog.module.css'

// Mismo payload que armaba TeamPanel.save() para un alta.
export interface NewPersonPayload {
  nombre: string
  apellido: string
  email: string
  telefono: string
  instrumentos: Instrument[]
  fecha_nacimiento: string | null
  direccion: string | null
  genero: Genero | null
  estado_civil: EstadoCivil | null
  fecha_aniversario: string | null
}
export interface SubmitError { code?: string; message: string }

// La persona se creó pero no se pudo agregar a (algunos de) los equipos
// elegidos: no es un éxito ni un error de formulario.
export interface PartialTeamFailure {
  teams: { id: string; name: string }[]
}
// Lo que TeamPanel le cuenta al padre en onMembersChanged cuando hay algo que
// mostrar además de recargar (hoy: el fallo parcial del alta).
export interface MembersChangedInfo { partialTeamFailure?: PartialTeamFailure }
export type SubmitResult =
  | { status: 'ok' }
  | { status: 'error'; error: SubmitError }
  | { status: 'partial'; teams: { id: string; name: string }[] }

interface Props {
  mode?: 'add' | 'edit'
  initial?: Partial<Member>          // solo en modo edición: los datos a cargar
  existingEmails: string[]
  // Equipos reales de la organización (ya sin archivados) y si se pudieron
  // cargar — nunca una lista fija en el código. Solo en modo alta.
  teams?: { id: string; name: string }[]
  teamsStatus?: 'loading' | 'ready' | 'error'
  onSubmit: (payload: NewPersonPayload, teamIds: string[]) => Promise<SubmitResult>
  onSaved: (fullName: string) => void
  onPartial?: (info: PartialTeamFailure) => void
  onClose: () => void
}

type Draft = {
  nombre: string; apellido: string; email: string; telefono: string
  fecha_nacimiento: string; direccion: string; genero: '' | Genero; estado_civil: '' | EstadoCivil
  fecha_aniversario: string; instrumentos: Instrument[]
  teamIds: string[]
}
const EMPTY: Draft = {
  nombre: '', apellido: '', email: '', telefono: '', fecha_nacimiento: '', direccion: '',
  genero: '', estado_civil: '', fecha_aniversario: '', instrumentos: [], teamIds: [],
}

// Permisiva a propósito: solo frena lo evidentemente mal escrito.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const GENERIC_ERROR = 'No se pudo guardar. Revisá tu conexión e intentá de nuevo.'

function draftFrom(m: Partial<Member>): Draft {
  return {
    nombre: m.nombre || '', apellido: m.apellido || '', email: m.email || '', telefono: m.telefono || '',
    fecha_nacimiento: m.fecha_nacimiento || '', direccion: m.direccion || '',
    genero: (m.genero || '') as '' | Genero, estado_civil: (m.estado_civil || '') as '' | EstadoCivil,
    fecha_aniversario: m.fecha_aniversario || '', instrumentos: [...(m.instrumentos || [])], teamIds: [],
  }
}
const hasMoreData = (d: Draft) => !!(d.fecha_nacimiento || d.direccion || d.genero || d.estado_civil || d.fecha_aniversario || d.instrumentos.length)

// «Formulario con datos»: ¿cambió algo respecto de cómo se abrió? (en el
// alta, la base es vacía: cualquier dato cuenta.) Mira TODOS los campos,
// también los de «Más datos», los chips de instrumentos y los equipos.
function normalized(d: Draft) {
  return JSON.stringify([d.nombre.trim(), d.apellido.trim(), d.email.trim(), d.telefono.trim(), d.fecha_nacimiento,
    d.direccion.trim(), d.genero, d.estado_civil, d.fecha_aniversario, [...d.instrumentos].sort(), [...d.teamIds].sort()])
}
const isDirty = (d: Draft, base: Draft) => normalized(d) !== normalized(base)

export default function AddPersonDialog({ mode = 'add', initial, existingEmails, teams = [], teamsStatus = 'ready', onSubmit, onSaved, onPartial, onClose }: Props) {
  const edit = mode === 'edit'
  const base = useRef<Draft>(edit && initial ? draftFrom(initial) : EMPTY)
  const [draft, setDraft] = useState<Draft>(base.current)
  const [nombreErr, setNombreErr] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [formErr, setFormErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [keep, setKeep] = useState(false)
  const [moreOpen, setMoreOpen] = useState(edit && hasMoreData(base.current))

  const modalRef = useRef<HTMLDivElement>(null)
  const nombreRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const downOnScrim = useRef(false)

  // Foco inicial en el primer campo; al cerrar, vuelve al botón que lo abrió.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    nombreRef.current?.focus()
    return () => { opener?.focus?.() }
  }, [])

  // Escape cierra (salvo mientras se guarda: no se abandona una petición en
  // vuelo). stopPropagation: el panel de la persona (PersonDrawer), que queda
  // DEBAJO al editar, también cierra con Escape en window — esto no debe
  // cerrar los dos de una vez.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (!saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [saving, onClose])

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft(d => ({ ...d, [k]: v }))
    if (k === 'nombre') setNombreErr('')
    if (k === 'email') setEmailErr('')
    setFormErr('')
  }
  function toggleTeam(id: string) {
    setDraft(d => ({ ...d, teamIds: d.teamIds.includes(id) ? d.teamIds.filter(x => x !== id) : [...d.teamIds, id] }))
    setFormErr('')
  }
  function toggleInstr(i: Instrument) {
    setDraft(d => ({ ...d, instrumentos: d.instrumentos.includes(i) ? d.instrumentos.filter(x => x !== i) : [...d.instrumentos, i] }))
    setFormErr('')
  }

  async function submit() {
    if (saving) return
    const nombreMsg = !draft.nombre ? 'Falta el nombre' : ''
    const typed = draft.email.trim()
    let emailMsg = ''
    if (!draft.email) emailMsg = 'Falta el correo'
    else if (!EMAIL_RE.test(typed)) emailMsg = 'El correo no parece válido'
    else if (existingEmails.some(e => {
      const n = e.trim().toLowerCase()
      return n === typed.toLowerCase() && n !== (edit ? (initial?.email || '').trim().toLowerCase() : '')
    })) emailMsg = 'Ya existe una persona con ese correo'
    setNombreErr(nombreMsg); setEmailErr(emailMsg)
    if (nombreMsg || emailMsg) { (nombreMsg ? nombreRef : emailRef).current?.focus(); return }

    const payload: NewPersonPayload = {
      nombre: draft.nombre,
      apellido: draft.apellido || '',
      email: draft.email,
      telefono: draft.telefono || '',
      instrumentos: draft.instrumentos,
      fecha_nacimiento: draft.fecha_nacimiento || null,
      direccion: draft.direccion || null,
      genero: draft.genero || null,
      estado_civil: draft.estado_civil || null,
      fecha_aniversario: draft.fecha_aniversario || null,
    }
    setSaving(true); setFormErr('')
    let res: SubmitResult
    try { res = await onSubmit(payload, edit ? [] : draft.teamIds) } catch { res = { status: 'error', error: { message: GENERIC_ERROR } } }
    setSaving(false)
    if (res.status === 'error') {
      // Todo lo escrito se conserva: solo se muestra el motivo.
      if (res.error.code === '23505') { setEmailErr('Ya existe una persona con ese correo'); emailRef.current?.focus() }
      else if (edit && res.error.code === '42501' && payload.email !== (initial?.email || '')) {
        // Trigger de la 027: solo un admin con sesión puede cambiar el correo.
        setEmailErr(res.error.message || GENERIC_ERROR); emailRef.current?.focus()
      }
      else setFormErr(res.error.message || GENERIC_ERROR)
      return
    }
    const fullName = `${draft.nombre} ${draft.apellido}`.trim()
    if (res.status === 'partial') {
      // La persona SÍ se creó: no se dice "Se agregó", se corta el ciclo de
      // "Agregar otra" y el aviso (persistente) lo muestra quien aloja esto.
      onPartial?.({ teams: res.teams })
      onClose()
      return
    }
    onSaved(fullName)
    // «Agregar otra»: se vacía el formulario pero se CONSERVAN los equipos
    // elegidos (suele cargarse un equipo entero seguido).
    if (keep && !edit) { setDraft(d => ({ ...EMPTY, teamIds: d.teamIds })); setNombreErr(''); setEmailErr(''); nombreRef.current?.focus() }
    else onClose()
  }

  // Tab no se escapa del pop-up (aria-modal no lo garantiza solo).
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !modalRef.current) return
    const nodes = Array.from(modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])'))
      .filter(n => getComputedStyle(n).visibility !== 'hidden')
    if (!nodes.length) return
    const first = nodes[0], last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  const casado = draft.estado_civil === 'casado'

  return createPortal(
    <div className={styles.scrim}
      onMouseDown={e => { downOnScrim.current = e.target === e.currentTarget }}
      onClick={e => {
        // Tocar el fondo cierra SOLO si el formulario está vacío: un clic de
        // más no puede borrar lo que la persona ya escribió.
        if (e.target === e.currentTarget && downOnScrim.current && !saving && !isDirty(draft, base.current)) onClose()
      }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="apd-title" ref={modalRef} onKeyDown={trapTab}>
        <div className={styles.head}>
          <h2 id="apd-title">{edit ? 'Editar persona' : 'Agregar persona'}</h2>
          <button type="button" className={styles.x} onClick={() => { if (!saving) onClose() }} aria-label="Cerrar">
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} noValidate onSubmit={e => { e.preventDefault(); submit() }}>
          <div className={styles.body}>
            <div className={styles.g2}>
              <div className={styles.field}>
                <label htmlFor="apd-nombre">Nombre</label>
                <input id="apd-nombre" ref={nombreRef} autoComplete="off" placeholder="Ana" value={draft.nombre}
                  aria-invalid={!!nombreErr} aria-describedby={nombreErr ? 'apd-nombre-err' : undefined}
                  onChange={e => set('nombre', e.target.value)} />
                {nombreErr && <span id="apd-nombre-err" className={styles.msg}>{nombreErr}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="apd-apellido">Apellido</label>
                <input id="apd-apellido" autoComplete="off" placeholder="Pérez" value={draft.apellido}
                  onChange={e => set('apellido', e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="apd-email">Correo</label>
              <input id="apd-email" ref={emailRef} type="email" autoComplete="off" placeholder="ana@ejemplo.com" value={draft.email}
                aria-invalid={!!emailErr} aria-describedby={emailErr ? 'apd-email-err' : undefined}
                onChange={e => set('email', e.target.value)} />
              {emailErr && <span id="apd-email-err" className={styles.msg}>{emailErr}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="apd-tel">Teléfono</label>
              <input id="apd-tel" autoComplete="off" placeholder="9 1234 5678" value={draft.telefono}
                onChange={e => set('telefono', e.target.value)} />
            </div>

            {!edit && (
            <div className={styles.field} role="group" aria-labelledby="apd-equipos">
              <span id="apd-equipos" className={styles.label}>Equipos</span>
              {teamsStatus === 'loading' && <span className={styles.hint}>Cargando equipos…</span>}
              {teamsStatus === 'error' && <span className={styles.hint}>No se pudieron cargar los equipos. Agrégala a uno después, desde Equipos.</span>}
              {teamsStatus === 'ready' && teams.length === 0 && (
                <span className={styles.hint}>Todavía no hay equipos. Créalos en Equipos</span>
              )}
              {teamsStatus === 'ready' && teams.length > 0 && (
                <>
                  <div className={styles.chips}>
                    {teams.map(t => (
                      <button key={t.id} type="button" className={styles.chip} aria-pressed={draft.teamIds.includes(t.id)}
                        onClick={() => toggleTeam(t.id)}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                  <span className={styles.hint}>Después le asignas posiciones desde Equipos</span>
                </>
              )}
            </div>
            )}

            <button type="button" className={styles.more} aria-expanded={moreOpen} aria-controls="apd-extra"
              onClick={() => setMoreOpen(o => !o)}>
              <i aria-hidden="true">›</i> Más datos
            </button>
            <div id="apd-extra" className={`${styles.extra}${moreOpen ? ` ${styles.on}` : ''}`}>
              <div>
                <div className={styles.g2}>
                  <div className={styles.field}>
                    <label htmlFor="apd-nac">Fecha de nacimiento</label>
                    <input id="apd-nac" type="date" value={draft.fecha_nacimiento}
                      onChange={e => set('fecha_nacimiento', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="apd-gen">Género</label>
                    <select id="apd-gen" value={draft.genero}
                      onChange={e => set('genero', e.target.value as '' | Genero)}>
                      <option value="">— Sin especificar —</option>
                      {GENERO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="apd-dir">Dirección</label>
                  <input id="apd-dir" autoComplete="off" value={draft.direccion}
                    onChange={e => set('direccion', e.target.value)} />
                </div>
                <div className={styles.g2}>
                  <div className={styles.field}>
                    <label htmlFor="apd-ec">Estado civil</label>
                    <select id="apd-ec" value={draft.estado_civil}
                      onChange={e => set('estado_civil', e.target.value as '' | EstadoCivil)}>
                      <option value="">— Sin especificar —</option>
                      {ESTADO_CIVIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {casado && (
                    <div className={styles.field}>
                      <label htmlFor="apd-aniv">Fecha de aniversario</label>
                      <input id="apd-aniv" type="date" value={draft.fecha_aniversario}
                        onChange={e => set('fecha_aniversario', e.target.value)} />
                    </div>
                  )}
                </div>
                <div className={styles.field} role="group" aria-labelledby="apd-instr">
                  <span id="apd-instr" className={styles.label}>Instrumentos (para convocatorias a ensayo)</span>
                  <div className={styles.chips}>
                    {ALL_INSTRUMENTOS.map(i => (
                      <button key={i} type="button" className={styles.chip} title={i} aria-label={i}
                        aria-pressed={draft.instrumentos.includes(i)} onClick={() => toggleInstr(i)}>
                        {INSTRUMENTO_CORTO[i] || i}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {formErr && <p className={styles.formErr} role="alert">{formErr}</p>}

          <div className={styles.foot}>
            {edit ? <span style={{ flex: 1 }} /> : (
              <button type="button" className={styles.keep} role="switch" aria-checked={keep} onClick={() => setKeep(k => !k)}>
                <span className={styles.sw} aria-hidden="true" />Agregar otra al guardar
              </button>
            )}
            <button type="button" className={styles.cancel} onClick={() => { if (!saving) onClose() }}>Cancelar</button>
            <button type="submit" className={styles.save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

// Aviso breve tras un alta exitosa. Vive aparte del pop-up porque con
// «Agregar otra» apagado el pop-up ya se cerró cuando hay que mostrarlo.
export function PersonToast({ message }: { message: string }) {
  if (!message) return null
  return createPortal(<div className={styles.toast} role="status">{message}</div>, document.body)
}

// Aviso PERSISTENTE (no se va solo): la persona se creó pero no se pudo
// agregar a algún equipo. Se queda hasta que se actúe o se cierre.
export function PersonNotice({ message, actionLabel, onAction, onDismiss }: {
  message: string; actionLabel: string; onAction: () => void; onDismiss: () => void
}) {
  return createPortal(
    <div className={styles.notice} role="alert">
      <p>{message}</p>
      <button type="button" className={styles.noticeAct} onClick={onAction}>{actionLabel}</button>
      <button type="button" className={styles.noticeX} onClick={onDismiss} aria-label="Cerrar aviso">✕</button>
    </div>,
    document.body,
  )
}
