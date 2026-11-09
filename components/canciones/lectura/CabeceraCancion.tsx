// La cabecera de la lectura (etapa C3a): el título y «artista · bpm · Original X». Lo que falta no se muestra (ni el separador).
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'
import ui from './lectura-partes.module.css'

export default function CabeceraCancion({ titulo, artista, bpm, original, autor, traductor }: { titulo: string; artista?: string | null; bpm?: number | null; original?: string | null; autor?: string | null; traductor?: string | null }) {
  const partes = [artista?.trim() || '', bpm && bpm > 0 ? T.bpm(bpm) : '', original ? `${T.original} ${original}` : ''].filter(Boolean)
  return (
    <header className={ui.cabecera}>
      <h1 className={ui.titulo}>{titulo}</h1>
      {partes.length > 0 && <p className={ui.sub}>{partes.join(' · ')}</p>}
      {(autor || traductor) && (
        <p className={ui.creditos}>
          {autor && <><b>Letra y Música:</b> {autor}</>}{autor && traductor && <br />}
          {traductor && <><b>Traducción por:</b> {traductor}</>}
        </p>
      )}
    </header>
  )
}
