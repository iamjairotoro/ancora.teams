'use client'
// La ventana «Plantillas» del checklist del líder (teléfono, Checklist-Plantillas-A): las plantillas del equipo, «Empezar con el del domingo pasado» y «Guardar este como plantilla».
// TODO lo decide el servidor (/api/admin/checklist): aquí no se escribe nada directo en la base ni se manda contenido; solo ids, un nombre y confirmaciones. Aplicar solo AGREGA: antes de aplicar, la confirmación dice cuántos ítems
// se agregan y cuántos se omiten (el servidor lo calcula). Solo teléfono: el escritorio sigue con ChecklistTool.
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import VentanaCentrada from '@/components/ventanas/VentanaCentrada'
import { confirmar } from '@/lib/ventanas/ventanas'
import { TEXTOS_CHECKLIST as T, aplicadoAviso, confirmarAplicar, detallePlantilla, existeConfirmar, plantillaGuardada, plantillasDe, predeterminadaBloqueada, type ResumenPlan } from '@/lib/textos/checklist'
import ui from './plantillas.module.css'

interface PlantillaV { id: string; nombre: string; items: number; posiciones: number | null; predeterminada: boolean }
interface Lista { plantillas: PlantillaV[]; domingoPasado: { disponible: boolean; items?: number }; esAdmin: boolean }
type Origen = { origen: 'plantilla'; plantillaId: string } | { origen: 'domingo-pasado' }

async function llamar(cuerpo: Record<string, unknown>): Promise<{ status: number; body: any }> {
  const r = await fetch('/api/admin/checklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

export default function PlantillasChecklist({ checklistId, equipo, onCerrar, onVista, onInforme }: {
  checklistId: string
  equipo: string
  onCerrar: () => void
  /** La vista fresca del checklist (la respuesta de aplicar). */
  onVista: (vista: any) => void
  onInforme: (texto: string) => void
}) {
  const [lista, setLista] = useState<Lista | null>(null)
  const [paso, setPaso] = useState<'lista' | 'guardar'>('lista')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    let vivo = true
    llamar({ accion: 'plantillas-listar', checklistId }).then(r => { if (!vivo) return; if (r.status === 200) setLista(r.body); else setError(T.noSePudoPlantillas) }).catch(() => { if (vivo) setError(T.noSePudoPlantillas) })
    return () => { vivo = false }
  }, [checklistId])

  async function elegir(o: Origen) {
    if (ocupado) return
    setOcupado(true); setError(null)
    try {
      let esperado: ResumenPlan | null = null
      const pre = await llamar({ accion: 'plantilla-previsualizar', checklistId, ...o })
      if (pre.status !== 200) { setError(T.noSePudoGuardar); return }
      esperado = pre.body as ResumenPlan
      for (let intento = 0; intento < 2; intento++) {
        if (esperado.agregar === 0) { setError(T.nadaNuevo); return }
        if (!(await confirmar(confirmarAplicar(esperado), { accion: T.aplicarAccion }))) return
        const r = await llamar({ accion: 'plantilla-aplicar', checklistId, ...o, esperados: { agregar: esperado.agregar } })
        if (r.status === 200) { const { aplicado, ...vista } = r.body; onVista(vista); onInforme(aplicadoAviso(aplicado)); onCerrar(); return }
        if (r.status === 409 && r.body?.codigo === 'cambio') { esperado = r.body.resumen as ResumenPlan; setError(T.cambioElChecklist); continue }
        setError(T.noSePudoGuardar); return
      }
    } catch { setError(T.noSePudoGuardar) }
    finally { setOcupado(false) }
  }

  async function guardar(reemplazar = false) {
    const limpio = nombre.replace(/\s+/g, ' ').trim()
    if (!limpio || ocupado) return
    setOcupado(true); setError(null)
    try {
      const r = await llamar({ accion: 'plantilla-guardar', checklistId, nombre: limpio, ...(reemplazar ? { reemplazar: true } : {}) })
      if (r.status === 200) { onInforme(plantillaGuardada(r.body.guardada?.nombre ?? limpio, !!r.body.guardada?.reemplazo)); onCerrar(); return }
      const c = r.body?.codigo
      if (r.status === 409 && c === 'existe') {
        setOcupado(false)
        if (await confirmar(existeConfirmar(r.body.nombre ?? limpio, !!r.body.predeterminada), { accion: T.reemplazarAccion })) await guardar(true)
        return
      }
      if (r.status === 403 && c === 'predeterminada') { const sug = String(r.body.sugerencia ?? ''); setError(predeterminadaBloqueada(limpio, sug)); if (sug) setNombre(sug); return }
      setError(c === 'vacio' ? T.vacioParaGuardar : c === 'ambiguo' ? T.nombreAmbiguo : T.noSePudoGuardar)
    } catch { setError(T.noSePudoGuardar) }
    finally { setOcupado(false) }
  }

  if (paso === 'guardar') return (
    <VentanaCentrada titulo={T.guardarComoPlantilla} sinIcono controlada ocupado={ocupado} error={error} onCerrar={() => { setPaso('lista'); setError(null) }}
      botones={[{ texto: T.guardar, primario: true, onClick: () => void guardar() }, { texto: T.cancelar, onClick: () => { setPaso('lista'); setError(null) } }]}>
      <p className={ui.aviso}>{T.guardarPlantillaIntro}</p>
      <div className={ui.campo}>
        <label className={ui.etiqueta} htmlFor="pl-nombre">{T.nombrePlantilla}</label>
        <input id="pl-nombre" className={ui.entrada} value={nombre} maxLength={60} autoFocus autoComplete="off" onChange={e => setNombre(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void guardar() } }} />
      </div>
    </VentanaCentrada>
  )

  return (
    <VentanaCentrada titulo={plantillasDe(equipo)} sinIcono controlada ocupado={ocupado} error={error} onCerrar={onCerrar}
      botones={[{ texto: T.guardarComoPlantilla, primario: true, onClick: () => { setError(null); setPaso('guardar') } }, { texto: T.cerrar, onClick: onCerrar }]}>
      {!lista ? (error ? null : <p className={ui.cargando}>{T.actualizando}</p>) : (
        <div className={ui.lista}>
          {lista.plantillas.length === 0 && <p className={ui.vacio}>{T.sinPlantillas}</p>}
          {lista.plantillas.map(p => (
            <button key={p.id} type="button" className={ui.fila} disabled={ocupado} onClick={() => void elegir({ origen: 'plantilla', plantillaId: p.id })}>
              <span className={ui.txt}><span className={ui.nombre}>{p.nombre}{p.predeterminada && <span className={ui.marca}>{T.predeterminada}</span>}</span><span className={ui.det}>{detallePlantilla(p.items, p.posiciones)}</span></span>
              <ChevronRight className={ui.flecha} size={18} aria-hidden="true" />
            </button>
          ))}
          <button type="button" className={ui.fila} disabled={ocupado || !lista.domingoPasado.disponible} onClick={() => void elegir({ origen: 'domingo-pasado' })}>
            <span className={ui.txt}><span className={ui.nombre}>{T.domingoPasado}</span><span className={ui.det}>{lista.domingoPasado.disponible ? T.domingoPasadoAyuda : T.sinDomingoPasado}</span></span>
            <ChevronRight className={ui.flecha} size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </VentanaCentrada>
  )
}
