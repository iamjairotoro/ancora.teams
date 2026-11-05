'use client'
// «Resumen» del LÍDER en teléfono (etapa 4; tablero Resumen-Lider-A/B): cuántos servicios hubo, cuántas personas sirvieron, qué % de las posiciones quedó cubierto y cuántas veces sirvió cada persona de SU equipo.
// Todo lo calcula el servidor (/api/lider/estadisticas, solo equipos que lidera): aquí solo se dibuja. Solo iniciales, nunca foto. No escribe nada y no importa lib/lider/cliente.
import { useState } from 'react'
import ErrorDeCarga from '../ErrorDeCarga'
import { TeamMono } from '../TeamColor'
import { useCarga } from './useCarga'
import type { AvisoResumen, Periodo, PersonaResumen } from '@/lib/lider/estadisticas'
import { TEXTOS_LIDER as T, TEXTOS_RESUMEN_LIDER as TR, avisoInactiva, avisoTodos, cifraPersonas, cifraServicios, fechaDeUltimaVez, sirvioVeces } from '@/lib/textos/servicioLider'
import ui from './lider-movil.module.css'

interface Datos { equipos: { id: string; nombre: string; color: string | null }[]; equipoId: string; periodo: Periodo; servicios: number; personasQueSirvieron: number; cubiertasPct: number | null; personas: PersonaResumen[]; avisos: AvisoResumen[] }
const PERIODOS: { clave: Periodo; texto: string }[] = [{ clave: 'mes', texto: TR.mes }, { clave: '3m', texto: TR.tresMeses }, { clave: 'anio', texto: TR.anio }]
const iniciales = (n: string, a: string) => `${n[0] ?? ''}${a[0] ?? ''}`.toLocaleUpperCase('es')
const nombreDe = (p: { nombre: string; apellido: string }) => `${p.nombre} ${p.apellido}`.trim()

export default function ResumenLider() {
  const [equipo, setEquipo] = useState<string | null>(null), [periodo, setPeriodo] = useState<Periodo>('mes')
  const [c, recargar] = useCarga<Datos>(`/api/lider/estadisticas?periodo=${periodo}${equipo ? `&equipoId=${encodeURIComponent(equipo)}` : ''}`)
  const d = c.estado === 'ok' ? c.datos : null
  const porId = new Map((d?.personas ?? []).map(p => [p.id, p] as const))
  return (
    <div className={ui.pagina}>
      <h1 className={ui.titulo}>{TR.titulo}</h1>
      {d && d.equipos.length >= 2 && (
        <div className={ui.pildoras} role="group" aria-label={TR.equipoEtiqueta}>
          {d.equipos.map(e => (
            <button key={e.id} type="button" className={`${ui.pildora}${e.id === d.equipoId ? ` ${ui.pildoraOn}` : ''}`} aria-pressed={e.id === d.equipoId} onClick={() => setEquipo(e.id)}>
              <TeamMono name={e.nombre} color={e.color} /><span>{e.nombre}</span>
            </button>
          ))}
        </div>
      )}
      <div className={ui.segmentos} role="group" aria-label={TR.periodoEtiqueta}>
        {PERIODOS.map(p => <button key={p.clave} type="button" className={`${ui.segmento}${p.clave === periodo ? ` ${ui.segmentoOn}` : ''}`} aria-pressed={p.clave === periodo} onClick={() => setPeriodo(p.clave)}>{p.texto}</button>)}
      </div>
      {c.estado === 'cargando' && !d ? <p className={ui.mensaje} role="status">{T.cargando}</p>
        : c.estado === 'prohibido' ? <p className={ui.mensaje}>{T.sinAcceso}</p>
        : c.estado === 'error' ? <ErrorDeCarga compacto titulo={TR.noSePudoCargar} cuerpo={T.noSePudoCargarCuerpo} onReintentar={recargar} />
        : d && (
          <div className={ui.pagina} aria-busy={c.estado === 'cargando'}>
            <div className={ui.cifras}>
              <div className={ui.cifra}><span className={ui.cifraNum}>{d.servicios}</span><span className={ui.cifraTxt}>{cifraServicios(d.servicios)}</span></div>
              <div className={ui.cifra}><span className={ui.cifraNum}>{d.personasQueSirvieron}</span><span className={ui.cifraTxt}>{cifraPersonas(d.personasQueSirvieron)}</span></div>
              <div className={ui.cifra}><span className={ui.cifraNum}>{d.cubiertasPct === null ? TR.sinDato : `${d.cubiertasPct}%`}</span><span className={ui.cifraTxt}>{TR.posicionesCubiertas}</span></div>
            </div>
            {d.servicios === 0 && <p className={ui.ayuda}>{TR.sinServiciosPeriodo}</p>}
            <h2 className={ui.seccion}>{TR.vecesQueSirvio}</h2>
            {d.personas.length === 0 ? <p className={ui.mensaje}>{TR.sinPersonas}</p> : (
              <ul className={ui.listaResumen}>
                {d.personas.map(p => (
                  <li key={p.id} className={ui.filaResumen}>
                    <span className={ui.avatar} aria-hidden="true">{iniciales(p.nombre, p.apellido)}</span>
                    <span className={ui.resumenTxt}>
                      <span className={ui.resumenCab}><span className={ui.personaNombre}>{nombreDe(p)}</span><span className={ui.resumenCuenta} aria-label={sirvioVeces(p.cantidad)}>{p.cantidad}</span></span>
                      <span className={ui.barra} aria-hidden="true"><span className={ui.barraRelleno} style={{ width: `${d.servicios > 0 ? Math.min(100, Math.round((p.cantidad / d.servicios) * 100)) : 0}%` }} /></span>
                      <span className={ui.personaPos}>{p.ultimaVez ? `${TR.ultimaVez}: ${fechaDeUltimaVez(p.ultimaVez)}` : TR.sinServicios}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className={ui.ayuda}>{TR.nota}</p>
            {d.avisos.length > 0 && (
              <>
                <h2 className={ui.seccion}>{TR.paraTenerEnCuenta}</h2>
                <ul className={ui.avisos}>
                  {d.avisos.map((a, i) => { const p = porId.get(a.personaId); return p && (
                    <li key={i} className={ui.aviso}><span className={`${ui.puntoAviso}${a.tipo === 'inactiva' ? ` ${ui.puntoInactiva}` : ''}`} aria-hidden="true" /><span><strong>{nombreDe(p)}</strong> {a.tipo === 'todos' ? avisoTodos(d.periodo) : avisoInactiva}</span></li>
                  ) })}
                </ul>
              </>
            )}
          </div>
        )}
    </div>
  )
}
