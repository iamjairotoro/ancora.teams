'use client'
// El checklist por posición del LÍDER (y el admin) en teléfono (mockup Checklist-Lider-A): una tarjeta por posición de la nómina de este servicio (quién la tiene, «Sin persona este domingo», «Pendiente de confirmar»), con sus secciones (grupos)
// editables, ítems y «General» (lo que no es de ninguna posición: solo lo ve el líder). TODO pasa por /api/admin/checklist (el servidor decide y autoriza; aquí no se escribe nada directo en la base). Cada acción responde con la vista fresca.
// NO hay actualización en vivo: se pide al abrir, al volver a la app y con «Actualizar». Solo teléfono: el escritorio sigue con ChecklistTool.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, MoreHorizontal, Plus, Trash2, TriangleAlert } from 'lucide-react'
import MenuFlotante from '@/components/MenuFlotante'
import EsqueletoLista from './EsqueletoLista'
import { confirmar } from '@/lib/ventanas/ventanas'
import { TEXTOS_CHECKLIST as T, añadeA, confirmarEliminarMarcado, confirmarEliminarSeccion, faltan, listosDe, marcadoPor, loMarcasteTu, pasaraA } from '@/lib/textos/checklist'
import { TEXTOS_SERVICIO as TS } from '@/lib/textos/servicio'
import ui from './checklist-lider.module.css'

interface Marca { yo: boolean; nombre: string | null; hora: string }
interface ItemV { id: string; texto: string; checked: boolean; marca: Marca | null }
interface GrupoV { id: string | null; titulo: string | null; items: ItemV[] }
interface PosV { positionId: string | null; nombre: string; estado: 'confirmada' | 'pendiente' | 'sin-persona' | 'general'; confirmadas: string[]; pendientes: string[]; listos: number; total: number; grupos: GrupoV[] }
interface Vista { checklistId: string | null; sinChecklist: boolean; posiciones: PosV[]; listos: number; total: number }

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' })
const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map(x => x[0]?.toUpperCase()).join('')
const llave = (p: PosV) => p.positionId ?? 'general'

export default function ChecklistLider({ servicioId, herramientaId, nombre, onQuitarHerramienta }: { servicioId: string; herramientaId: string; nombre: string; onQuitarHerramienta?: () => void }) {
  const [vista, setVista] = useState<Vista | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando')
  const [actualizando, setActualizando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [abiertas, setAbiertas] = useState<Set<string> | null>(null)
  const [agregando, setAgregando] = useState<{ clave: string; tipo: 'item' | 'seccion' } | null>(null)
  const [editando, setEditando] = useState<{ tipo: 'item' | 'grupo'; id: string } | null>(null)
  const [texto, setTexto] = useState('')
  const [menu, setMenu] = useState<string | null>(null)       // «item:<id>» · «grupo:<id>» · «mover:<id>» · «herramienta»
  const [ocupado, setOcupado] = useState(false)
  const version = useRef(0)

  const aplicar = (v: Vista) => { setVista(v); setEstado('ok'); setAbiertas(a => a ?? new Set(v.posiciones.filter(p => p.total > 0).slice(0, 1).map(llave))) }

  const cargar = useCallback(async () => {
    const mia = ++version.current
    setActualizando(true); setAviso(null)
    try {
      const r = await fetch(`/api/admin/checklist?servicio=${encodeURIComponent(servicioId)}&herramienta=${encodeURIComponent(herramientaId)}`, { cache: 'no-store' })
      if (mia !== version.current) return
      if (!r.ok) throw new Error('x')
      aplicar(await r.json())
    } catch { if (mia === version.current) { setAviso(T.noSePudoActualizar); setEstado(e => (e === 'cargando' ? 'error' : e)) } }
    finally { if (mia === version.current) setActualizando(false) }
  }, [servicioId, herramientaId])

  useEffect(() => {
    void cargar()
    const alVolver = () => { if (document.visibilityState === 'visible') void cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [cargar])

  async function accion(cuerpo: Record<string, unknown>): Promise<boolean> {
    const mia = ++version.current
    setOcupado(true); setAviso(null)
    try {
      const r = await fetch('/api/admin/checklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
      if (!r.ok) throw new Error('x')
      const v = await r.json(); if (mia === version.current) aplicar(v); return true
    } catch { setAviso(T.noSePudoGuardar); return false }
    finally { setOcupado(false) }
  }

  const cerrarEdicion = () => { setAgregando(null); setEditando(null); setTexto('') }
  const alternar = (clave: string) => setAbiertas(a => { const n = new Set(a ?? []); if (n.has(clave)) n.delete(clave); else n.add(clave); return n })

  if (estado === 'cargando') return <EsqueletoLista filas={2} />
  if (estado === 'error' || !vista) return (
    <div className={ui.tarjeta}>
      <p className={ui.vacio} role="alert">{aviso ?? T.noSePudoActualizar}</p>
      <div className={ui.centro}><button type="button" className={ui.actualizar} onClick={() => void cargar()}>{T.actualizar}</button></div>
    </div>
  )

  const cabecera = (
    <div className={ui.cab}>
      <div><h2 className={ui.titulo}>{nombre}</h2><p className={ui.intro}>{T.liderIntro}</p></div>
      {onQuitarHerramienta && (
        <div className={ui.ancla}>
          <button type="button" className="anc-rowMore" style={{ opacity: 1 }} aria-label={T.accionesDelChecklist} aria-haspopup="menu" onClick={() => setMenu(m => (m === 'herramienta' ? null : 'herramienta'))}><MoreHorizontal size={16} /></button>
          {menu === 'herramienta' && (
            <MenuFlotante titulo={T.accionesDelChecklist} onCerrar={() => setMenu(null)}>
              <button className="anc-rowMenuDanger" onClick={() => { setMenu(null); onQuitarHerramienta() }}><Trash2 size={13} /> {TS.quitarHerramienta}</button>
            </MenuFlotante>
          )}
        </div>
      )}
    </div>
  )

  if (vista.sinChecklist) return (
    <div className={ui.raiz}>
      {cabecera}
      <div className={ui.tarjeta}>
        <p className={ui.vacio}>{T.sinChecklistLider}</p>
        <div className={ui.centro}><button type="button" className={ui.crear} disabled={ocupado} onClick={() => void accion({ accion: 'crear-checklist', servicio: servicioId, herramienta: herramientaId })}><Plus size={16} aria-hidden="true" /> {T.crearChecklist}</button></div>
      </div>
      {aviso && <p role="alert" className={ui.aviso}>{aviso}</p>}
    </div>
  )

  // Todos los destinos posibles para «Mover a otro grupo»: cada sección de cada posición, «Sin sección» de cada posición y «General».
  const destinos = vista.posiciones.flatMap(p => [
    ...p.grupos.filter(g => g.id).map(g => ({ clave: `g:${g.id}`, etiqueta: p.positionId ? `${p.nombre} · ${g.titulo ?? T.sinSeccion}` : `${T.general} · ${g.titulo ?? T.sinSeccion}`, grupoId: g.id, positionId: p.positionId, posNombre: p.nombre })),
    { clave: `p:${p.positionId ?? 'general'}`, etiqueta: p.positionId ? `${p.nombre} · ${T.sinSeccion}` : T.general, grupoId: null as string | null, positionId: p.positionId, posNombre: p.nombre },
  ])
  const pct = vista.total > 0 ? Math.round((vista.listos / vista.total) * 100) : 0

  const marcar = async (i: ItemV) => {
    setVista(v => v && ({ ...v, posiciones: v.posiciones.map(p => ({ ...p, grupos: p.grupos.map(g => ({ ...g, items: g.items.map(x => (x.id === i.id ? { ...x, checked: !x.checked, marca: !x.checked ? { yo: true, nombre: null, hora: new Date().toISOString() } : null } : x)) })) })) }))
    if (!(await accion({ accion: 'marcar', itemId: i.id, checked: !i.checked }))) void cargar()      // no se guardó: se vuelve a lo que dice el servidor
  }
  const eliminarItem = async (i: ItemV) => { if (i.checked && !(await confirmar(confirmarEliminarMarcado, { accion: T.eliminar, peligro: true }))) return; await accion({ accion: 'eliminar-item', itemId: i.id }) }
  const eliminarGrupo = async (g: GrupoV) => { if (g.items.length > 0 && !(await confirmar(confirmarEliminarSeccion(g.titulo ?? '', g.items.length), { accion: T.eliminarSeccion, peligro: true }))) return; await accion({ accion: 'eliminar-grupo', grupoId: g.id }) }
  const guardarEdicion = async () => {
    if (!texto.trim()) return
    const ok = agregando
      ? await accion(agregando.tipo === 'item'
        ? { accion: 'crear-item', checklistId: vista.checklistId, ...destinoDeAlta(agregando.clave), texto }
        : { accion: 'crear-grupo', checklistId: vista.checklistId, positionId: positionDe(agregando.clave), titulo: texto })
      : editando ? await accion(editando.tipo === 'item' ? { accion: 'editar-item', itemId: editando.id, texto } : { accion: 'renombrar-grupo', grupoId: editando.id, titulo: texto }) : false
    if (ok) cerrarEdicion()
  }
  const positionDe = (clave: string) => (clave === 'general' ? null : clave)
  // «Añadir ítem» va a la ÚLTIMA sección de esa posición (si no tiene secciones, queda suelto en la posición); se puede mover después desde el «⋯».
  const destinoDeAlta = (clave: string) => {
    const p = vista.posiciones.find(x => llave(x) === clave); const ultimo = p ? [...p.grupos].reverse().find(g => g.id) : undefined
    return ultimo ? { grupoId: ultimo.id } : { grupoId: null, positionId: positionDe(clave) }
  }
  const formulario = (placeholder: string, nota?: string) => (
    <form className={ui.form} onSubmit={e => { e.preventDefault(); void guardarEdicion() }}>
      <input className={ui.entrada} value={texto} onChange={e => setTexto(e.target.value)} placeholder={placeholder} aria-label={placeholder} maxLength={200} autoFocus />
      {nota && <p className={ui.notaForm}>{nota}</p>}
      <div className={ui.formBtns}><button type="submit" className={ui.guardar} disabled={ocupado || !texto.trim()}>{T.guardar}</button><button type="button" className={ui.cancelar} onClick={cerrarEdicion}>{T.cancelar}</button></div>
    </form>
  )

  return (
    <div className={ui.raiz}>
      {cabecera}
      <section className={ui.progreso} aria-live="polite">
        <div className={ui.progresoFila}><b>{listosDe(vista.listos, vista.total)}</b><span>{faltan(vista.total - vista.listos)}</span></div>
        <div className={ui.barra} role="progressbar" aria-valuemin={0} aria-valuemax={vista.total} aria-valuenow={vista.listos} aria-label={listosDe(vista.listos, vista.total)}><span style={{ width: `${pct}%` }} /></div>
      </section>

      {vista.posiciones.map(p => {
        const clave = llave(p), abierta = !!abiertas?.has(clave), ambar = p.estado === 'sin-persona' || p.estado === 'pendiente'
        const quien = p.confirmadas.join(' · ')
        return (
          <section key={clave} className={ui.posicion}>
            <button type="button" className={ui.posCab} aria-expanded={abierta} onClick={() => alternar(clave)}>
              <span className={`${ui.avatar}${ambar ? ` ${ui.avatarAmbar}` : ''}`} aria-hidden="true">{ambar ? <TriangleAlert size={18} /> : p.estado === 'general' ? '·' : iniciales(p.confirmadas[0] ?? p.nombre)}</span>
              <span className={ui.posTextos}>
                <span className={ui.posNombre}>{p.nombre}</span>
                {p.estado === 'sin-persona' ? <span className={ui.ambar}>{T.sinPersona}</span>
                  : p.estado === 'pendiente' ? <span className={ui.ambar}>{T.pendiente}{p.pendientes.length > 0 ? ` · ${p.pendientes.join(' · ')}` : ''}</span>
                  : p.estado === 'general' ? <span className={ui.sub}>{T.soloLoVesTu}</span>
                  : <span className={ui.sub}>{quien}</span>}
              </span>
              <span className={ui.cuenta}>{p.listos} de {p.total}</span>
              {abierta ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
            </button>
            {abierta && (
              <div className={ui.cuerpo}>
                {p.grupos.map((g, gi) => (
                  <div key={g.id ?? `s${gi}`} className={ui.grupo}>
                    {g.id && (
                      <div className={ui.grupoCab}>
                        {editando?.tipo === 'grupo' && editando.id === g.id ? formulario(T.tituloSeccion) : (
                          <>
                            <h3 className={ui.grupoTitulo}>{g.titulo ?? T.sinSeccion}</h3>
                            <span className={ui.cuentaG}>{g.items.filter(i => i.checked).length} de {g.items.length}</span>
                            <div className={ui.ancla}>
                              <button type="button" className="anc-rowMore" style={{ opacity: 1 }} aria-label={`${T.accionesDeSeccion}: ${g.titulo ?? ''}`} aria-haspopup="menu" onClick={() => setMenu(m => (m === `grupo:${g.id}` ? null : `grupo:${g.id}`))}><MoreHorizontal size={16} /></button>
                              {menu === `grupo:${g.id}` && (
                                <MenuFlotante titulo={T.accionesDeSeccion} onCerrar={() => setMenu(null)}>
                                  <button onClick={() => { setMenu(null); setTexto(g.titulo ?? ''); setEditando({ tipo: 'grupo', id: g.id as string }) }}>{T.renombrar}</button>
                                  <div className="anc-rowMenuSep" />
                                  <button className="anc-rowMenuDanger" onClick={() => { setMenu(null); void eliminarGrupo(g) }}><Trash2 size={13} /> {T.eliminarSeccion}</button>
                                </MenuFlotante>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <ul className={ui.items}>
                      {g.items.map(i => (
                        <li key={i.id} className={ui.item}>
                          {editando?.tipo === 'item' && editando.id === i.id ? <div className={ui.itemEdita}>{formulario(T.escribeItem)}</div> : (
                            <>
                              <button type="button" role="checkbox" aria-checked={i.checked} aria-label={i.texto} className={`${ui.marca}${i.checked ? ` ${ui.hecho}` : ''}`} onClick={() => void marcar(i)}>
                                <span className={ui.circulo} aria-hidden="true">{i.checked && <Check size={16} strokeWidth={3} />}</span>
                              </button>
                              <span className={`${ui.itemTexto}${i.checked ? ` ${ui.tachado}` : ''}`}><span>{i.texto}</span>
                                {i.checked && i.marca && <small>{i.marca.yo ? loMarcasteTu(hora(i.marca.hora)) : marcadoPor(i.marca.nombre || '—', hora(i.marca.hora))}</small>}</span>
                              <div className={ui.ancla}>
                                <button type="button" className="anc-rowMore" style={{ opacity: 1 }} aria-label={`${T.accionesDeItem}: ${i.texto}`} aria-haspopup="menu" onClick={() => setMenu(m => (m === `item:${i.id}` ? null : `item:${i.id}`))}><MoreHorizontal size={16} /></button>
                                {menu === `item:${i.id}` && (
                                  <MenuFlotante titulo={T.accionesDeItem} onCerrar={() => setMenu(null)}>
                                    <button onClick={() => { setMenu(null); setTexto(i.texto); setEditando({ tipo: 'item', id: i.id }) }}>{T.editarTexto}</button>
                                    <button onClick={() => setTimeout(() => setMenu(`mover:${i.id}`), 0)}>{T.moverAOtroGrupo}</button>
                                    <div className="anc-rowMenuSep" />
                                    <button className="anc-rowMenuDanger" onClick={() => { setMenu(null); void eliminarItem(i) }}><Trash2 size={13} /> {T.eliminar}</button>
                                  </MenuFlotante>
                                )}
                                {menu === `mover:${i.id}` && (
                                  <MenuFlotante titulo={T.moverTitulo} onCerrar={() => setMenu(null)}>
                                    {destinos.filter(d => !(d.grupoId === g.id && d.positionId === p.positionId && (d.grupoId !== null || g.id === null))).map(d => (
                                      <button key={d.clave} className={ui.destino} onClick={() => { setMenu(null); void accion({ accion: 'mover-item', itemId: i.id, grupoId: d.grupoId, positionId: d.grupoId ? undefined : d.positionId }) }}>
                                        <span>{d.etiqueta}</span>{d.positionId !== p.positionId && <small>{pasaraA(d.posNombre)}</small>}
                                      </button>
                                    ))}
                                  </MenuFlotante>
                                )}
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {p.total === 0 && p.grupos.length === 0 && <p className={ui.vacio}>{T.sinItems}</p>}
                {agregando?.clave === clave && agregando.tipo === 'item' ? formulario(T.escribeItem, (() => { const u = [...p.grupos].reverse().find(g => g.id); return u ? añadeA(u.titulo ?? T.sinSeccion) : undefined })())
                  : agregando?.clave === clave && agregando.tipo === 'seccion' ? formulario(T.tituloSeccion)
                  : (
                    <div className={ui.pie}>
                      <button type="button" className={ui.anadir} onClick={() => { cerrarEdicion(); setAgregando({ clave, tipo: 'item' }) }}><Plus size={16} aria-hidden="true" /> {T.anadirItem}</button>
                      <button type="button" className={ui.anadir} onClick={() => { cerrarEdicion(); setAgregando({ clave, tipo: 'seccion' }) }}><Plus size={16} aria-hidden="true" /> {T.nuevaSeccion}</button>
                    </div>
                  )}
              </div>
            )}
          </section>
        )
      })}
      {aviso && <p role="alert" className={ui.aviso}>{aviso}</p>}
      <p className={ui.nota}>{T.nominaNota}</p>
      <div className={ui.centro}>
        <p className={ui.nota}>{T.actualizaNota}</p>
        <button type="button" className={ui.actualizar} onClick={() => void cargar()} disabled={actualizando}>{actualizando ? T.actualizando : T.actualizar}</button>
      </div>
    </div>
  )
}
