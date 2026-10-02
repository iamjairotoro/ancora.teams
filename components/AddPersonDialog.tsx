'use client'
/* ════════════════════════════════════════════════════════════════════════
   AddPersonDialog.tsx — pop-up «Agregar persona» (punto 28). Modelo visual:
   docs/mockup-agregar-persona.html.

   Es SOLO el alta: los campos, el payload y el insert son los del formulario
   inline de TeamPanel de siempre (la edición sigue con ese formulario). Acá
   no se guarda nada: onSubmit (TeamPanel.addPerson) hace el insert y
   devuelve el error de la base si lo hubo — este componente nunca lo
   ignora: si falla, el pop-up sigue abierto con lo escrito y el mensaje.

   Reglas de validación: las de siempre (nombre y correo obligatorios, sin
   trim) MÁS dos aditivas — formato permisivo de correo y correo repetido
   (contra la lista local, en minúsculas y sin espacios; la fuente de verdad
   sigue siendo el 23505 del insert). El correo se guarda tal cual se escribió.
   ════════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Instrument, Genero, EstadoCivil } from '@/lib/types'
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

interface Props {
  existingEmails: string[]
  onSubmit: (payload: NewPersonPayload) => Promise<SubmitError | null>
  onSaved: (fullName: string) => void
  onClose: () => void
}

type Draft = {
  nombre: string; apellido: string; email: string; telefono: string
  fecha_nacimiento: string; direccion: string; genero: '' | Genero; estado_civil: '' | EstadoCivil
  fecha_aniversario: string; instrumentos: Instrument[]
}
const EMPTY: Draft = {
  nombre: '', apellido: '', email: '', telefono: '', fecha_nacimiento: '', direccion: '',
  genero: '', estado_civil: '', fecha_aniversario: '', instrumentos: [],
}

// Permisiva a propósito: solo frena lo evidentemente mal escrito.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const GENERIC_ERROR = 'No se pudo guardar. Revisá tu conexión e intentá de nuevo.'

// «Formulario con datos»: TODOS los campos, también los de «Más datos» y los chips.
function isDirty(d: Draft) {
  return !!(d.nombre.trim() || d.apellido.trim() || d.email.trim() || d.telefono.trim()
    || d.fecha_nacimiento || d.direccion.trim() || d.genero || d.estado_civil
    || d.fecha_aniversario || d.instrumentos.length > 0)
}

export default function AddPersonDialog({ existingEmails, onSubmit, onSaved, onClose }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [nombreErr, setNombreErr] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [formErr, setFormErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [keep, setKeep] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

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

  // Escape cierra (salvo mientras se guarda: no se abandona una petición en vuelo).
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [saving, onClose])

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft(d => ({ ...d, [k]: v }))
    if (k === 'nombre') setNombreErr('')
    if (k === 'email') setEmailErr('')
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
    else if (existingEmails.some(e => e.trim().toLowerCase() === typed.toLowerCase())) emailMsg = 'Ya existe una persona con ese correo'
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
    let err: SubmitError | null
    try { err = await onSubmit(payload) } catch { err = { message: GENERIC_ERROR } }
    setSaving(false)
    if (err) {
      // Todo lo escrito se conserva: solo se muestra el motivo.
      if (err.code === '23505') { setEmailErr('Ya existe una persona con ese correo'); emailRef.current?.focus() }
      else setFormErr(err.message || GENERIC_ERROR)
      return
    }
    onSaved(`${draft.nombre} ${draft.apellido}`.trim())
    if (keep) { setDraft(EMPTY); setNombreErr(''); setEmailErr(''); nombreRef.current?.focus() }
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
        if (e.target === e.currentTarget && downOnScrim.current && !saving && !isDirty(draft)) onClose()
      }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="apd-title" ref={modalRef} onKeyDown={trapTab}>
        <div className={styles.head}>
          <h2 id="apd-title">Agregar persona</h2>
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

            <div className={styles.field} role="group" aria-labelledby="apd-instr">
              <span id="apd-instr" className={styles.label}>Instrumentos</span>
              <div className={styles.chips}>
                {ALL_INSTRUMENTOS.map(i => (
                  <button key={i} type="button" className={styles.chip} title={i} aria-label={i}
                    aria-pressed={draft.instrumentos.includes(i)} onClick={() => toggleInstr(i)}>
                    {INSTRUMENTO_CORTO[i] || i}
                  </button>
                ))}
              </div>
            </div>

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
              </div>
            </div>
          </div>

          {formErr && <p className={styles.formErr} role="alert">{formErr}</p>}

          <div className={styles.foot}>
            <button type="button" className={styles.keep} role="switch" aria-checked={keep} onClick={() => setKeep(k => !k)}>
              <span className={styles.sw} aria-hidden="true" />Agregar otra al guardar
            </button>
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
