/* ════════════════════════════════════════════════════════════════════════
   LyricSheet.tsx — hoja de letra (fase 20, cambio de rumbo desde acordes).
   ORIGEN: docs/mockup-letra.html. Reemplaza a SongChart.tsx en la vista de
   canción — SongChart.tsx, chords.ts y parseChart.ts quedan intactos y
   sin usar, no se borran.

   Estructura tomada del PDF oficial de Hillsong, en este orden: título en
   español (mayúscula), bajada, título original, créditos a la derecha,
   secciones en MAYÚSCULA + dos puntos con su letra debajo, y al pie
   copyright + CCLI.

   El CCLI y el copyright se muestran SIEMPRE que existan — no son
   decoración, son la condición legal para mostrar la letra. Pero esto NO
   es un candado: si faltan, la letra se ve igual (el aviso de que faltan
   vive en la vista de EDICIÓN, para quien administra — no acá, donde
   canta la banda un domingo por un dato administrativo).
   ════════════════════════════════════════════════════════════════════════ */
'use client'

import { parseLyrics } from '@/lib/parseLyrics'

export type LyricTypography = {
  fontFamily: string
  textScale: number       // rem del cuerpo de la letra
  lineHeightWide: boolean
  stageMode: boolean
}

type Props = {
  title: string
  originalTitle?: string
  autor?: string
  traductor?: string
  letra: string
  ccli?: string
  copyright?: string
  typography: LyricTypography
  // Quien administra puede cargar la letra desde acá mismo — evita que
  // tenga que ir a buscar el botón "Editar" de más arriba para lo que es,
  // en una canción recién creada, el primer paso obvio.
  isAdmin?: boolean
  onAddLyrics?: () => void
  // El mensaje de "sin letra" depende de si hay adjuntos (ahí viven los
  // acordes) — pero ese número se carga aparte (ver CancionesPanel), así
  // que attachmentsLoaded tiene que ser explícito: mientras sea false, no
  // se sabe todavía si hay 0 adjuntos o si la consulta no volvió, y
  // afirmar cualquiera de los dos textos sería mentir por un instante.
  attachmentsCount: number
  attachmentsLoaded: boolean
}

export function LyricSheet(p: Props) {
  const sections = parseLyrics(p.letra || '')
  const hasLegal = !!(p.ccli || p.copyright)
  const hasLetra = !!p.letra?.trim()

  return (
    <div
      className="anc-sheet"
      style={{
        '--anc-letra-font': p.typography.fontFamily,
        '--anc-letra-size': `${p.typography.textScale}rem`,
        '--anc-letra-lh': p.typography.lineHeightWide ? 1.9 : 1.55,
      } as React.CSSProperties}
    >
      <h1 className="anc-sTitle">{p.title}</h1>
      {p.originalTitle && (
        <>
          <p className="anc-sSub">Traducción oficial en español</p>
          <p className="anc-sOrig">{p.originalTitle}</p>
        </>
      )}

      {(p.autor || p.traductor) && (
        <p className="anc-credits">
          {p.autor && <><b>Letra y Música:</b> {p.autor}</>}
          {p.autor && p.traductor && <br />}
          {p.traductor && <><b>Traducción por:</b> {p.traductor}</>}
        </p>
      )}

      {hasLetra ? sections.map((s, i) => (
        <div key={i} className="anc-lsec">
          {s.name && <p className="anc-secName2">{s.name}:</p>}
          <p className="anc-lyr">{s.lyrics}</p>
        </div>
      )) : (
        <div className="anc-lyrEmpty">
          {p.attachmentsLoaded && (
            <p className="anc-lyrEmptyTitle">
              {p.attachmentsCount > 0
                ? 'Esta canción todavía no tiene letra. Los acordes están en Adjuntos, más abajo.'
                : 'Esta canción todavía no tiene letra ni adjuntos.'}
            </p>
          )}
          {p.isAdmin && (
            <button className="anc-btn anc-btn--accent" onClick={p.onAddLyrics}>Agregar letra</button>
          )}
        </div>
      )}

      {hasLegal && (
        <p className="anc-legal2">
          {p.copyright}{p.copyright && p.ccli && <br />}
          {p.ccli && <b>CCLI {p.ccli}</b>}
        </p>
      )}
    </div>
  )
}
