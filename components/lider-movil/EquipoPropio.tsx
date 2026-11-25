'use client'
// SU equipo en el servicio, para el líder: la MISMA pantalla del administrador (servicio-movil/VistaEquipo) con los permisos del líder sobre su propio equipo: abrir sus herramientas, añadir las que falten, «Gestionar equipo» y tocar una
// posición para abrir su ventana (HojaPosicionLider: cupos, personas y asignar). Es el ÚNICO bloque que escribe (por lib/lider/cliente → /api/lider/*, que decide en el servidor si puede); la ventana solo le avisa. «Notificar» no
// está: la convocatoria la envía quien administra.
import { SlidersHorizontal } from 'lucide-react'
import { useId, useState } from 'react'
import HojaBase from '../admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import { enviar } from '@/lib/lider/cliente'
import { TIPOS_HERRAMIENTA, type EquipoPropio as Datos, type TipoHerramienta } from '@/lib/lider/servicioLider'
import { fechaCorta } from '@/lib/admin/servicioMovil'
import { TEXTOS_LIDER_EDICION as TE, TEXTOS_LIDER_SERVICIO as TS } from '@/lib/textos/servicioLider'
import { voluntariosN } from '@/lib/textos/servicio'
import pantallas from '../servicio-movil/pantallas.module.css'
import VistaEquipo from '../servicio-movil/VistaEquipo'
import { TIPO_DE_HERRAMIENTA, cuentasDe, nombreDeTipo, posicionesVista, resumenDe } from './datosVista'
import HojaPosicionLider from './HojaPosicionLider'
import ui from './lider-movil.module.css'
import Presente from '@/components/Presente'

export type Vista = 'checklist' | 'horario' | 'notas' | 'equipo'
const NOMBRE_TIPO: Record<TipoHerramienta, string> = { checklist: TE.tipoChecklist, schedule: TE.tipoHorario, notes: TE.tipoNotas }
const VISTA_DE: Record<TipoHerramienta, Vista> = { checklist: 'checklist', schedule: 'horario', notes: 'notas' }
const Titulo = ({ id, children }: { id: string; children: React.ReactNode }) => <h2 id={id} className={hoja.titulo}>{children}</h2>

function HojaHerramienta({ faltan, onElegir, onCerrar }: { faltan: TipoHerramienta[]; onElegir: (t: TipoHerramienta) => void; onCerrar: () => void }) {
  const id = useId()
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{TE.agregarHerramienta}</Titulo>}>
      {cerrar => (
        <>
          <ul className={pantallas.listaHoja}>{faltan.map(t => <li key={t}><button type="button" className={pantallas.filaHoja} onClick={() => cerrar(() => onElegir(t))}>{NOMBRE_TIPO[t]}</button></li>)}</ul>
          <button type="button" className={`${pantallas.boton} ${ui.cancelarHoja}`} onClick={() => cerrar()}>Cancelar</button>
        </>
      )}
    </HojaBase>
  )
}

export default function EquipoPropio({ equipo, servicioId, fecha, subtitulo, cerrado, irA, onCambio }: { equipo: Datos; servicioId: string; fecha: string; subtitulo: string; cerrado: boolean; irA: (v: Vista, ref: string) => void; onCambio: () => void }) {
  const [abierta, setAbierta] = useState<string | null>(null)      // la posición cuya ventana está abierta (se vuelve a buscar en equipo.posiciones: siempre al día)
  const [hojaHerr, setHojaHerr] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const tiene = new Set(equipo.herramientas.map(h => h.tipo)), faltan = TIPOS_HERRAMIENTA.filter(t => !tiene.has(t))
  const hacer = async (r: ReturnType<typeof enviar>) => { setOcupado(true); setError(null); const x = await r; setOcupado(false); if (x.ok) onCambio(); else { setError(x.error); onCambio() } }
  const c = cuentasDe(equipo)
  const posicion = abierta ? equipo.posiciones.find(p => p.id === abierta) ?? null : null
  const tipoDe = (id: string) => equipo.herramientas.find(h => h.id === id)?.tipo

  return (
    <>
      <VistaEquipo nombre={equipo.nombre} color={equipo.color} subtitulo={subtitulo} resumen={resumenDe(c)} vacantes={c.vacantes} tuEquipo
        herramientas={equipo.herramientas.map(h => ({ clave: h.id, tipo: TIPO_DE_HERRAMIENTA[h.tipo], nombre: nombreDeTipo(h.tipo) }))}
        onAbrirHerramienta={id => { const t = tipoDe(id); if (t) irA(VISTA_DE[t], id) }} onAnadirHerramienta={faltan.length > 0 ? () => setHojaHerr(true) : undefined}
        tituloVoluntarios={voluntariosN(c.asignados, c.cupos)} accionVoluntarios={<button type="button" className="anc-bt anc-bt--s" onClick={() => irA('equipo', equipo.id)}><SlidersHorizontal className="anc-bt__ico" aria-hidden="true" /><span className="anc-bt__txt">{TS.gestionarEquipo}</span></button>}
        ayudaPosiciones={TS.ayudaPosiciones} sinPosiciones={TS.sinPosiciones} posiciones={posicionesVista(equipo)} onAbrirPosicion={setAbierta}>
        {cerrado && <p className={ui.avisoCerrado}>{TE.cerrado}</p>}
        {error && <p className={ui.error} role="alert" style={{ padding: 0 }}>{error}</p>}
        <p className={ui.notaEquipo}>{TE.convoca}</p>
      </VistaEquipo>
      <Presente abierta={!!posicion} valor={posicion}>{posicion => posicion && <HojaPosicionLider posicion={posicion} equipo={equipo.nombre} fecha={fechaCorta(fecha).split(' ').slice(1).join(' ') || fecha} integrantes={equipo.integrantes} cerrado={cerrado} ocupado={ocupado} onCerrar={() => setAbierta(null)}
        onCupos={n => hacer(enviar('cupos', { servicio: servicioId, posicion: posicion.id, cupos: n }))}
        onElegir={(slot, persona) => hacer(enviar('asignar', { servicio: servicioId, posicion: posicion.id, slot, persona }))}
        onQuitar={slot => hacer(enviar('asignar', { servicio: servicioId, posicion: posicion.id, slot, persona: null }))} />}</Presente>
      <Presente abierta={hojaHerr}>{() => <HojaHerramienta faltan={faltan} onCerrar={() => setHojaHerr(false)} onElegir={tipo => hacer(enviar('herramientas', { accion: 'agregar', equipo: equipo.id, tipo }))} />}</Presente>
    </>
  )
}
