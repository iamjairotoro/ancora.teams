'use client'
// La hoja con acordes dentro de la ficha de administradora (Modo Admin): el MISMO dibujo de la lectura (HojaAcordes y LineaConAcordes) en lugar de la hoja de letra, con la tipografía de la ficha y los avisos de la ruta
// (otras versiones, letra distinta). Solo se monta cuando la ruta entregó hoja (tono + todas las variantes en formato 2); si no, la ficha sigue con LyricSheet. No escribe nada, salvo la notación ABC/123 de la persona, como en la lectura.
import { useLecturaAcordes } from '@/app/portal/_components/useLecturaAcordes'
import type { HojaAcordesDatos } from '@/lib/lecturaAcordes'
import { TEXTOS_FICHA as T } from '@/lib/textos/fichaAcordes'
import HojaAcordes from './HojaAcordes'

type Props = {
  title: string; originalTitle?: string; autor?: string; traductor?: string; ccli?: string; copyright?: string
  hoja: HojaAcordesDatos; otrasVersiones: number; desajuste: boolean
  typography: { fontFamily: string; textScale: number; lineHeightWide: boolean }
}

const estiloAviso = { margin: '0 0 12px', padding: '10px 12px', borderRadius: 12, background: 'var(--anc-sunk)', color: 'var(--anc-ink-2)', fontSize: '.9375rem', lineHeight: 1.45 } as const

export default function FichaConAcordes(p: Props) {
  const { prefs, elegir, errPrefs } = useLecturaAcordes(null)
  return (
    <>
      {p.desajuste && <p className="anc-aviso-ficha" role="note" style={estiloAviso}>{T.desajuste}</p>}
      {p.otrasVersiones > 0 && <p className="anc-aviso-ficha" role="note" style={estiloAviso}>{T.otrasVersiones(p.otrasVersiones)}</p>}
      <HojaAcordes title={p.title} originalTitle={p.originalTitle} autor={p.autor} traductor={p.traductor} ccli={p.ccli} copyright={p.copyright}
        hoja={p.hoja} prefs={prefs} onPrefs={elegir} errPrefs={errPrefs} typography={p.typography} />
    </>
  )
}
