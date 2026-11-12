// El marcador de espera de la ficha del administrador en teléfono: mientras la ruta del editor no ha respondido, se sabe «una hoja viene en camino» pero no cuál (con acordes o de letra). Gris, sin texto inventado,
// del alto aproximado de una hoja corta, para que al llegar la hoja nada salte. Solo se dibuja en teléfono (el escritorio sigue como siempre). Las clases anc-fichaEsq* viven en app/songs-movil.css.
import { TEXTOS_ACORDES as T } from '@/lib/textos/acordesLectura'

export default function FichaEsqueleto() {
  return (
    <div className="anc-fichaEsq" data-esqueleto="ficha" role="status" aria-busy="true" aria-label={T.cargandoCancion}>
      <span className="anc-skel anc-fichaEsq__titulo" aria-hidden="true" />
      {[0, 1].map(i => (
        <div key={i} className="anc-fichaEsq__parte" aria-hidden="true">
          <span className="anc-skel anc-fichaEsq__nombre" />
          <span className="anc-skel anc-fichaEsq__linea" />
          <span className="anc-skel anc-fichaEsq__linea anc-fichaEsq__linea--corta" />
        </div>
      ))}
    </div>
  )
}
