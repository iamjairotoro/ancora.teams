// Esqueleto de una lista de servicios mientras llegan los datos (solo teléfono; mockup Carga-Lista). Usa los MISMOS elementos y clases de la ficha real (FichaServicio + ficha.module.css), con un espacio
// duro como texto: la altura sale de la misma tipografía y espaciado, así no hay saltos al llegar los datos. No muestra ningún texto: solo lleva «Cargando» oculto para lectores de pantalla y aria-busy.
// Aparece con un retraso de 150 ms (CSS): si los datos llegan antes, nunca se ve (y su lugar ya está reservado).
import { TEXTOS_SERVICIO as T } from '@/lib/textos/servicio'
import ficha from './ficha.module.css'
import sk from './esqueleto.module.css'

const NB = ' '
const B = (clase: string, extra = '') => `${clase} ${sk.forma}${extra ? ` ${extra}` : ''}`

function Cuadritos({ n }: { n: number }) { return <span className={ficha.cuadritos}>{Array.from({ length: n }, (_, i) => <span key={i} className={B(ficha.cuadrito, sk.cuadrito)} />)}</span> }
function Chips({ anchos }: { anchos: string[] }) { return <span className={ficha.etiquetas}>{anchos.map((w, i) => <span key={i} className={B(ficha.chip)} style={{ width: w }}>{NB}</span>)}</span> }

function FichaVacia({ grande }: { grande: boolean }) {
  const extras = grande ? <><Chips anchos={['5.5rem', '6.5rem']} /><Cuadritos n={2} /></> : <><Cuadritos n={3} /><Chips anchos={['5.5rem', '5rem']} /></>
  return (
    <li aria-hidden="true">
      <div className={`${ficha.ficha}${grande ? ` ${ficha.grande}` : ''}`}>
        <div className={ficha.abrir}>
          <span className={ficha.superior}>
            <span className={ficha.dia}><span className={B('', sk.diaT)}>{NB}</span><b className={B('', sk.diaN)}>{NB}</b><span className={B('', sk.diaT)}>{NB}</span></span>
            <span className={ficha.cuerpo}>
              {grande && <span className={B(ficha.enDias)} style={{ width: '4.5rem' }}>{NB}</span>}
              <span className={B(ficha.nombre)} style={{ width: grande ? '70%' : '62%' }}>{NB}</span>
              <span className={B(ficha.horario)} style={{ width: '42%' }}>{NB}</span>
              {!grande && extras}
            </span>
          </span>
          {grande && <span className={ficha.extras}>{extras}</span>}
        </div>
      </div>
    </li>
  )
}

export default function EsqueletoLista({ filas = 3, seccion = false }: { filas?: number; seccion?: boolean }) {
  return (
    <div className={sk.aparece} aria-busy="true" role="status">
      <span className={sk.oculto}>{T.cargandoOculto}</span>
      {seccion && <div className={sk.seccion} aria-hidden="true"><span className={sk.forma}>{NB.repeat(9)}</span></div>}
      <ul className={sk.lista}>{Array.from({ length: filas }, (_, i) => <FichaVacia key={i} grande={i === 0} />)}</ul>
    </div>
  )
}
