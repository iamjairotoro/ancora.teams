'use client'
// Hoja con acordes (etapa C1): solo se dibuja cuando la canción tiene tono y todas sus variantes están en formato 2 (lib/portal/acordesCancion.ts). El formato 1 sigue en LyricSheet, sin cambios.
// Lee en el tono del servicio (si lo hay y es del mismo modo) o en el original; la persona puede verla en otro tono SOLO aquí (no se guarda nada) y elegir ABC o 123 (se recuerda en su perfil).
import { useState } from 'react'
import { notacionDe, seccionesParaMostrar, tonoDeLectura, type HojaAcordesDatos } from '@/lib/lecturaAcordes'
import { tonosDelMismoModo } from '@/lib/tonos'
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'
import type { LecturaPrefs } from '@/lib/lyricPrefs'
import LineaConAcordes from './LineaConAcordes'
import InsigniaSeccion from './lectura/InsigniaSeccion'
import { parteDe } from '@/lib/partesCancion'
import ui from './hoja-acordes.module.css'
import c3ui from './lectura/hoja-c3.module.css'

type Props = {
  title: string; originalTitle?: string; autor?: string; traductor?: string; ccli?: string; copyright?: string
  hoja: HojaAcordesDatos
  tonoServicio?: string | null
  prefs: LecturaPrefs
  onPrefs: (patch: Partial<LecturaPrefs>) => void
  errPrefs?: boolean
  typography: { fontFamily: string; textScale: number; lineHeightWide: boolean }
  /** Lectura nueva (C3): sin la cabecera de C1 (la dibuja la pantalla), con insignia por sección, un id por sección (`parte-N`, para saltar) y el tono local que decide la pantalla (así la píldora de arriba lo ve). */
  c3?: { tonoLocal: string | null; onTonoLocal: (t: string | null) => void }
}

export default function HojaAcordes(p: Props) {
  const [localInterno, setLocalInterno] = useState<string | null>(null)
  const local = p.c3 ? p.c3.tonoLocal : localInterno, setLocal = p.c3 ? p.c3.onTonoLocal : setLocalInterno
  const base = tonoDeLectura({ original: p.hoja.tono, servicio: p.tonoServicio })
  const { tono, origen } = local ? tonoDeLectura({ original: p.hoja.tono, servicio: p.tonoServicio, local }) : base
  const secciones = seccionesParaMostrar(p.hoja, tono, notacionDe(p.prefs.notation))
  const hayServicio = base.origen === 'servicio'
  const clase = [p.prefs.compacta ? ui.compacta : '', p.prefs.compacta && p.c3 ? c3ui.compactaC3 : '', p.prefs.vista === 'acordes' ? ui.soloAcordes : p.prefs.vista === 'letras' ? ui.soloLetras : ''].filter(Boolean).join(' ')
  const elegirTono = (t: string) => setLocal(t === base.tono ? null : t)

  return (
    <div className="anc-sheet" style={{ '--anc-letra-font': p.typography.fontFamily, '--anc-letra-size': `calc(${p.typography.textScale}rem / var(--esc, 1))`, '--anc-letra-lh': p.typography.lineHeightWide ? 1.9 : 1.55 } as React.CSSProperties}>
      {!p.c3 && (<>
      <h1 className="anc-sTitle">{p.title}</h1>
      {p.originalTitle && <p className="anc-sOrig">{p.originalTitle}</p>}
      {(p.autor || p.traductor) && (
        <p className="anc-credits">
          {p.autor && <><b>Letra y Música:</b> {p.autor}</>}{p.autor && p.traductor && <br />}
          {p.traductor && <><b>Traducción por:</b> {p.traductor}</>}
        </p>
      )}
      </>)}
      {!p.c3 && <ul className={ui.chips}>
        {hayServicio && <li className={ui.chip}>{T.tonoDelServicio} {base.tono}</li>}
        <li className={ui.chip}>{T.original} {p.hoja.tono}</li>
        {origen === 'local' && <li className={ui.chip}>{T.tonoEtiqueta} {tono}</li>}
      </ul>}
      {/* La barra de notación y tono es de la hoja de C1: en la lectura nueva (c3) la notación vive en Preferencias y el tono en «Previsualizar tonalidad». */}
      {!p.c3 && (<>
      <div className={ui.barra}>
        <div className={ui.seg} role="group" aria-label={T.notacionEtiqueta}>
          <button type="button" aria-pressed={p.prefs.notation === 'americano'} onClick={() => p.onPrefs({ notation: 'americano' })}>{T.americano}</button>
          <button type="button" aria-pressed={p.prefs.notation === 'numeros'} onClick={() => p.onPrefs({ notation: 'numeros' })}>{T.numeros}</button>
        </div>
        <label className={ui.tono}>{T.tonoEtiqueta}
          <select value={tono} onChange={e => elegirTono(e.target.value)}>
            {tonosDelMismoModo(p.hoja.tono).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        {hayServicio && origen !== 'local' && <button type="button" className={ui.enlace} onClick={() => setLocal(p.hoja.tono)}>{T.verEn(p.hoja.tono)}</button>}
        {local && <button type="button" className={ui.enlace} onClick={() => setLocal(null)}>{T.volverAlServicio(base.tono)}</button>}
      </div>
      {p.errPrefs && <p className={ui.error} role="status">{T.errorPrefs}</p>}
      </>)}

      <div className={clase}>
        {secciones.map((s, i) => (
          <section key={i} id={p.c3 ? `parte-${i}` : undefined} className={p.c3 ? `${ui.sec} ${c3ui.secC3}` : ui.sec}>
            {p.c3 ? (() => { const pa = parteDe(s.code, s.name); return <InsigniaSeccion abrev={pa.abrev} clave={pa.clave} nombre={s.name || pa.abrev} /> })() : (
              <div className={ui.secCab}>
                {s.name && <p className="anc-secName2" style={{ margin: 0 }}>{s.name}:</p>}
                {s.repeat > 1 && <span className={ui.secRep}>{T.repeticiones(s.repeat)}</span>}
              </div>
            )}
            {(lineas => (p.c3 ? <div className={c3ui.tarjeta}>{lineas}</div> : lineas))(s.lineas.map((l, j) => l.kind === 'bars'
              ? <p key={j} className={ui.compas}>{l.bars}</p>
              : (
                <LineaConAcordes key={j} como="p" className={ui.linea} trozos={l.segments.map(g => ({ texto: g.text, acorde: g.acorde }))} acorde={p => p.acorde} />
              )))}
          </section>
        ))}
      </div>

      <p className={ui.nota}>{origen === 'local' ? T.notaTonoLocal : hayServicio ? T.notaTonoServicio : ''}</p>
      {(p.ccli || p.copyright) && (
        <p className="anc-legal2">{p.copyright}{p.copyright && p.ccli && <br />}{p.ccli && <b>CCLI {p.ccli}</b>}</p>
      )}
    </div>
  )
}
