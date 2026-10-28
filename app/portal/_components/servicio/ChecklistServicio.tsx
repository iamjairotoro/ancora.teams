'use client'
// El checklist de tu equipo en este servicio, SOLO con lo de tu posición (o tus posiciones). Lo que ves lo decide el servidor (GET /api/portal/checklist); aquí no se filtra nada: lo que llega es lo tuyo.
// Marcar y desmarcar guardan quién y a qué hora (POST /api/portal/checklist/marcar) y la respuesta trae el estado fresco. NO hay actualización en vivo: la pantalla se pide al abrirla, al volver a la app y con «Actualizar».
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { portalFetch } from '@/lib/portal/portalFetch'
import { TEXTOS_CHECKLIST as T, faltan, listosDe, loMarcasteTu, marcadoPor } from '@/lib/textos/checklist'
import { teamColorProps } from '@/components/TeamColor'
import EsqueletoLista from '@/components/servicio-movil/EsqueletoLista'
import ui from './checklist.module.css'

interface Marca { yo: boolean; nombre: string | null; hora: string }
interface ItemVista { id: string; texto: string; checked: boolean; marca: Marca | null }
interface GrupoVista { titulo: string | null; items: ItemVista[] }
interface PosicionVista { nombre: string; listos: number; total: number; grupos: GrupoVista[] }
interface Datos { posiciones: PosicionVista[]; listos: number; total: number; sinChecklist?: boolean }

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' })

export default function ChecklistServicio({ token, servicioId, herramientaId, color }: { token: string | null; servicioId: string; herramientaId: string; color?: string | null }) {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error' | 'sinPermiso'>('cargando')
  const [actualizando, setActualizando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendientes, setPendientes] = useState<ReadonlySet<string>>(new Set())
  const version = useRef(0)        // la respuesta más nueva gana: una lectura lenta no pisa lo que se acaba de marcar

  const cargar = useCallback(async () => {
    const mia = ++version.current
    setActualizando(true); setAviso(null)
    try {
      const r = await portalFetch(token, `/api/portal/checklist?servicio=${encodeURIComponent(servicioId)}&herramienta=${encodeURIComponent(herramientaId)}`)
      if (mia !== version.current) return
      if (r.status === 403) { setEstado('sinPermiso'); return }
      if (!r.ok) throw new Error('x')
      setDatos(await r.json()); setEstado('ok')
    } catch { if (mia === version.current) { setAviso(T.noSePudoActualizar); setEstado(e => (e === 'cargando' ? 'error' : e)) } }
    finally { if (mia === version.current) setActualizando(false) }
  }, [token, servicioId, herramientaId])

  // Al abrir y cada vez que la app vuelve a primer plano. Sin sondeo: nada se actualiza solo mientras miras la pantalla.
  useEffect(() => {
    void cargar()
    const alVolver = () => { if (document.visibilityState === 'visible') void cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [cargar])

  async function marcar(item: ItemVista) {
    if (pendientes.has(item.id)) return
    const quiero = !item.checked
    const mia = ++version.current
    setAviso(null); setPendientes(p => new Set(p).add(item.id))
    setDatos(d => d && cambiar(d, item.id, i => ({ ...i, checked: quiero, marca: quiero ? { yo: true, nombre: null, hora: new Date().toISOString() } : null })))      // se ve al tiro; el servidor manda la verdad
    try {
      const r = await portalFetch(token, '/api/portal/checklist/marcar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: item.id, checked: quiero }) })
      if (!r.ok) throw new Error('x')
      const nuevo = await r.json()
      if (mia === version.current && nuevo.posiciones) setDatos(nuevo)
    } catch { setDatos(d => d && cambiar(d, item.id, () => item)); setAviso(T.noSePudoGuardar) }      // no se guardó: se deshace lo que se veía
    finally { setPendientes(p => { const n = new Set(p); n.delete(item.id); return n }) }
  }

  if (estado === 'cargando') return <EsqueletoLista filas={2} />
  if (estado === 'sinPermiso') return <div className={ui.tarjeta}><p className={ui.vacio}>{T.sinPermiso}</p></div>
  if (estado === 'error' || !datos) return (
    <div className={ui.tarjeta}>
      <p className={ui.vacio} role="alert">{aviso ?? T.noSePudoActualizar}</p>
      <div className={ui.centro}><button type="button" className={ui.actualizar} onClick={() => void cargar()}>{T.actualizar}</button></div>
    </div>
  )
  const nombres = datos.posiciones.map(p => p.nombre)
  const varias = datos.posiciones.length > 1
  const pct = datos.total > 0 ? Math.round((datos.listos / datos.total) * 100) : 0
  return (
    <div className={ui.raiz} {...teamColorProps(color ?? null)}>
      {datos.sinChecklist || datos.posiciones.length === 0 ? (
        <div className={ui.tarjeta}><p className={ui.vacio}>{T.sinChecklist}</p></div>
      ) : (
        <>
          <section className={ui.progreso} aria-live="polite">
            <div className={ui.progresoFila}><b>{listosDe(datos.listos, datos.total)}</b><span>{faltan(datos.total - datos.listos)}</span></div>
            <div className={ui.barra} role="progressbar" aria-valuemin={0} aria-valuemax={datos.total} aria-valuenow={datos.listos} aria-label={listosDe(datos.listos, datos.total)}><span style={{ width: `${pct}%` }} /></div>
          </section>
          <p className={ui.tu}>{varias ? T.tusPosiciones : T.tuPosicion} · <b>{nombres.join(' · ')}</b></p>
          {datos.posiciones.map(p => (
            <section key={p.nombre} className={ui.posicion} aria-label={p.nombre}>
              {varias && <h3 className={ui.posNombre}>{p.nombre}<span>{p.listos} de {p.total}</span></h3>}
              {p.grupos.map((g, gi) => (
                <div key={gi} className={ui.grupo}>
                  {g.titulo && <div className={ui.grupoCab}><h4>{g.titulo}</h4><span>{g.items.filter(i => i.checked).length} de {g.items.length}</span></div>}
                  <ul className={ui.items}>
                    {g.items.map(i => (
                      <li key={i.id}>
                        <button type="button" role="checkbox" aria-checked={i.checked} className={`${ui.item}${i.checked ? ` ${ui.hecho}` : ''}`} onClick={() => void marcar(i)} disabled={pendientes.has(i.id)}>
                          <span className={ui.circulo} aria-hidden="true">{i.checked && <Check size={16} strokeWidth={3} />}</span>
                          <span className={ui.texto}><span className={ui.titulo}>{i.texto}</span>
                            {i.checked && i.marca && <small>{i.marca.yo ? loMarcasteTu(hora(i.marca.hora)) : marcadoPor(i.marca.nombre || '—', hora(i.marca.hora))}</small>}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {p.total === 0 && <p className={ui.vacio}>{T.sinItems}</p>}
            </section>
          ))}
        </>
      )}
      {aviso && <p role="alert" className={ui.aviso}>{aviso}</p>}
      <p className={ui.nota}>{varias ? T.soloLoTuyoVarias : T.soloLoTuyo}</p>
      <div className={ui.centro}>
        <p className={ui.nota}>{T.actualizaNota}</p>
        <button type="button" className={ui.actualizar} onClick={() => void cargar()} disabled={actualizando}>{actualizando ? T.actualizando : T.actualizar}</button>
      </div>
    </div>
  )
}

function cambiar(d: Datos, id: string, f: (i: ItemVista) => ItemVista): Datos {
  const posiciones = d.posiciones.map(p => {
    const grupos = p.grupos.map(g => ({ ...g, items: g.items.map(i => (i.id === id ? f(i) : i)) }))
    return { ...p, grupos, listos: grupos.reduce((n, g) => n + g.items.filter(i => i.checked).length, 0) }
  })
  return { ...d, posiciones, listos: posiciones.reduce((n, p) => n + p.listos, 0) }
}
