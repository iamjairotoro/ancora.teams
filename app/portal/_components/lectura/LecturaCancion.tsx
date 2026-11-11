'use client'
// La pantalla de lectura con acordes del músico (etapa C3a): barra superior, cabecera, tira de partes y, debajo, la hoja con acordes que ya existía (HojaAcordes, en su versión «c3»: insignia por sección, sin la cabecera de C1).
// Solo se monta cuando hay hoja con acordes en teléfono (la regla de CancionPortal): el resto de canciones sigue con la hoja de letra de siempre. No guarda nada por su cuenta: usa las mismas preferencias de C1.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HojaAcordes from '@/components/canciones/HojaAcordes'
import CabeceraCancion from '@/components/canciones/lectura/CabeceraCancion'
import TiraPartes, { type ParteTira } from '@/components/canciones/lectura/TiraPartes'
import coloresUi from '@/components/canciones/lectura/partes.module.css'
import { tonoDeLectura, type HojaAcordesDatos } from '@/lib/lecturaAcordes'
import { parteDe } from '@/lib/partesCancion'
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'
import type { LyricPrefs } from '@/lib/lyricPrefs'
import { useLecturaAcordes } from '../useLecturaAcordes'
import BarraCancion from './BarraCancion'
import HojaPreferencias from './HojaPreferencias'
import HojaTonalidad from './HojaTonalidad'

const RESPIRO_LINEA = 16      // px bajo la tira: una sección saltada desde la tira queda a 10 px de ella (scroll-margin), así que cae dentro de la línea y la siguiente nunca

/** La línea de lectura (px desde el borde de arriba de la pantalla): justo debajo de la tira fija; sin tira, el 30 % de la pantalla (la regla de antes). */
export function lineaDeLectura(bordeDeAbajoDeLaTira: number | null, altoPantalla: number): number {
  return bordeDeAbajoDeLaTira === null ? altoPantalla * 0.3 : bordeDeAbajoDeLaTira + RESPIRO_LINEA
}
/** La parte activa: la última sección (en orden) cuyo borde de arriba ya llegó a la línea; 0 si ninguna. `null` = esa sección no está en la página. */
export function parteActiva(bordesDeArriba: (number | null)[], linea: number): number {
  let a = 0
  bordesDeArriba.forEach((t, i) => { if (t !== null && t <= linea) a = i })
  return a
}

export interface DatosHoja { nombre: string; original_title: string | null; autor: string | null; traductor: string | null; ccli: string | null; copyright: string | null }

export default function LecturaCancion({ token, hoja, artista, bpm, acordes, tonoServicio, tipografia, etiquetaVolver, onVolver, onAdjuntos }: {
  token: string | null; hoja: DatosHoja; artista?: string | null; bpm?: number | null
  acordes: HojaAcordesDatos; tonoServicio?: string | null
  tipografia: { prefs: LyricPrefs; elegir: (p: Partial<Pick<LyricPrefs, 'fontFamily' | 'textScale'>>) => void; errPrefs: boolean }
  etiquetaVolver: string; onVolver: () => void; onAdjuntos: () => void
}) {
  const { prefs, elegir, errPrefs } = useLecturaAcordes(token)
  const [tonoLocal, setTonoLocal] = useState<string | null>(null), [activa, setActiva] = useState(0), [prefsAbiertas, setPrefsAbiertas] = useState(false), [tonoAbierto, setTonoAbierto] = useState<{ alAbrir: string | null } | null>(null)
  const bloqueo = useRef(0)
  const partes: ParteTira[] = useMemo(() => acordes.secciones.map(s => { const p = parteDe(s.code, s.name); return { abrev: p.abrev, clave: p.clave, nombre: s.name || p.abrev, repeat: s.repeat } }), [acordes])
  const base = tonoDeLectura({ original: acordes.tono, servicio: tonoServicio }), tono = tonoDeLectura({ original: acordes.tono, servicio: tonoServicio, local: tonoLocal }).tono
  const servicio = base.origen === 'servicio' ? base.tono : null
  const elegirTono = useCallback((t: string) => setTonoLocal(t === base.tono ? null : t), [base.tono])      // elegir el tono del servicio (o el de lectura de base) quita la elección local

  // La parte activa sigue a la lectura: la última sección cuyo borde de arriba ya llegó a la línea de lectura, que es justo debajo de la tira fija (su borde de abajo + un respiro). Sin la tira a mano (no debería pasar) vale el 30 % de la pantalla.
  // Al saltar desde la tira se fija de inmediato y el desplazamiento no la mueve durante un momento.
  useEffect(() => {
    let raf = 0, espera: ReturnType<typeof setTimeout> | null = null
    const calcular = () => {
      raf = 0
      const falta = bloqueo.current - Date.now()
      if (falta > 0) { if (espera) clearTimeout(espera); espera = setTimeout(calcular, falta + 20); return }      // durante el salto no se mueve; al terminar se recalcula (si la persona siguió desplazándose, la activa no se queda vieja)
      const tira = document.querySelector(`ul[aria-label="${T.partes}"]`)?.parentElement
      const linea = lineaDeLectura(tira ? tira.getBoundingClientRect().bottom : null, window.innerHeight)
      setActiva(parteActiva(partes.map((_, i) => document.getElementById(`parte-${i}`)?.getBoundingClientRect().top ?? null), linea))
    }
    const alDesplazar = () => { if (!raf) raf = requestAnimationFrame(calcular) }
    window.addEventListener('scroll', alDesplazar, { passive: true })
    return () => { window.removeEventListener('scroll', alDesplazar); if (raf) cancelAnimationFrame(raf); if (espera) clearTimeout(espera) }
  }, [partes])

  const irA = useCallback((i: number) => {
    setActiva(i); bloqueo.current = Date.now() + 900
    const reducido = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`parte-${i}`)?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' })
  }, [])
  const alAdjuntos = onAdjuntos

  return (
    <div className={coloresUi.colores}>
      <BarraCancion etiquetaVolver={etiquetaVolver} onVolver={onVolver} partes={partes} activa={activa} onIr={irA} tono={tono} onTono={() => setTonoAbierto({ alAbrir: tonoLocal })} onAdjuntos={alAdjuntos} onAjustes={() => setPrefsAbiertas(true)} ajustesAbiertos={prefsAbiertas} />
      <CabeceraCancion titulo={hoja.nombre} artista={artista} bpm={bpm} original={acordes.tono} autor={hoja.autor} traductor={hoja.traductor} detalles={prefs.detalles} />
      <TiraPartes partes={partes} activa={activa} onIr={irA} />
      <HojaAcordes title={hoja.nombre} originalTitle={hoja.original_title || undefined} ccli={hoja.ccli || undefined} copyright={hoja.copyright || undefined}
        hoja={acordes} tonoServicio={tonoServicio} prefs={prefs} onPrefs={elegir} errPrefs={errPrefs} typography={tipografia.prefs} c3={{ tonoLocal, onTonoLocal: setTonoLocal }} />
      {tonoAbierto && <HojaTonalidad original={acordes.tono} servicio={servicio} actual={tono} onElegir={elegirTono} onCerrar={guardado => { if (!guardado) setTonoLocal(tonoAbierto.alAbrir); setTonoAbierto(null) }} />}
      {prefsAbiertas && <HojaPreferencias prefs={prefs} onPrefs={elegir} errPrefs={errPrefs} tipografia={tipografia} onCerrar={() => setPrefsAbiertas(false)} />}
    </div>
  )
}
