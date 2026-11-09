'use client'
// Editor de acordes en teléfono (etapa C2): pantalla completa con los modos Letra y Acordes. Todo vive en memoria: NADA se guarda hasta pulsar Guardar (una sola petición a /api/admin/canciones/acordes).
// El documento, su historial (Deshacer/Rehacer) y la regla de posición de los acordes están en lib/editorAcordes.ts; aquí solo la pantalla.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import { aSecciones, cambiarTexto, deshacer, desdeSecciones, docVacio, insertarEncabezado, nuevoHistorial, puedeDeshacer, puedeRehacer, registrar, rehacer, TIPOS_SECCION, type Documento, type Historial, type TipoSeccion } from '@/lib/editorAcordes'
import { TONOS } from '@/lib/tonos'
import { resumenDeCambios, type ActualGuardado, type Resumen } from '@/lib/resumenGuardado'
import { TEXTOS_EDITOR as T, mensajeDeGuardado } from '@/lib/textos/editorAcordes'
import { useTecladoHoja } from '../useTecladoHoja'
import ModoAcordes from './ModoAcordes'
import ui from './editor-cancion-movil.module.css'

type Cargado = { tono: string; letra: string; origen: 'formato2' | 'pendiente' | 'formato1' | 'ninguno'; secciones: any[][] | null; sinConvertir: number; huella: string; guardadas?: { letra: string; secciones: any[][] | null; nSecciones: number; sinConvertir: number } | null; actual?: ActualGuardado }
type Props = { songId: string; titulo: string; onCerrar: () => void; onGuardado: () => void }

export default function EditorCancionMovil({ songId, titulo, onCerrar, onGuardado }: Props) {
  const [estado, setEstado] = useState<'cargando' | 'error' | 'listo'>('cargando')
  const [carga, setCarga] = useState<Cargado | null>(null)
  const [hist, setHist] = useState<Historial>(() => nuevoHistorial(docVacio()))
  const [tono, setTono] = useState('')
  const [inicial, setInicial] = useState<{ doc: Documento; tono: string } | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [conflicto, setConflicto] = useState(false)
  const [modo, setModo] = useState<'texto' | 'acordes'>('acordes')            // un solo modo a la vez: Acordes (carril y panel) o Texto (teclado y encabezados)
  const [notacion, setNotacion] = useState<'american' | 'number'>('american')   // solo cómo se ven los acordes (ABC o 123); no se guarda
  const [dialogo, setDialogo] = useState<null | { tipo: 'salir' } | { tipo: 'tono'; a: string } | { tipo: 'guardar'; resumen: Resumen }>(null)
  const [quitados, setQuitados] = useState<string | null>(null)
  const [guardadasCargadas, setGuardadasCargadas] = useState(false)
  const [confirmado, setConfirmado] = useState(false)          // el resumen se pide una vez por apertura del editor
  const raizRef = useRef<HTMLDivElement>(null), areaRef = useRef<HTMLTextAreaElement>(null), selectRef = useRef<HTMLSelectElement>(null), errorRef = useRef<HTMLDivElement>(null)
  const doc = hist.presente
  useTecladoHoja(raizRef)      // con el teclado abierto, la pantalla entera queda encima de él: la fila de encabezados y «Acordes» no se esconden

  const cargar = useCallback(async () => {
    setEstado('cargando'); setError(null); setConflicto(false)
    try {
      const r = await fetch(`/api/admin/canciones/acordes?id=${encodeURIComponent(songId)}`, { cache: 'no-store' })
      const j = r.ok ? await r.json() : null
      if (!j?.cancion) { setEstado('error'); return }
      const c = j.cancion as Cargado
      const d = c.secciones ? desdeSecciones(c.letra, c.secciones) : null
      const doc0 = d ?? docVacio(c.letra)
      setCarga(c); setHist(nuevoHistorial(doc0)); setTono(c.tono); setInicial({ doc: doc0, tono: c.tono }); setModo(c.letra.trim() ? 'acordes' : 'texto'); setQuitados(null); setGuardadasCargadas(false); setConfirmado(false)
      setAviso(c.sinConvertir > 0 ? T.avisoSinConvertir : c.secciones && !d ? T.avisoAcordesAntiguos : c.origen === 'pendiente' && d ? T.avisoPendiente : null)
      setEstado('listo')
    } catch { setEstado('error') }
  }, [songId])
  useEffect(() => { void cargar() }, [cargar])

  const sucio = !!inicial && (doc !== inicial.doc || tono !== inicial.tono)
  useEffect(() => {
    if (!sucio) return
    const f = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', f); return () => window.removeEventListener('beforeunload', f)
  }, [sucio])

  // «Cargar desde las secciones guardadas»: reemplaza el documento por el texto (y los acordes, si todo se pudo leer) de lo guardado en las secciones. Entra al historial: Deshacer vuelve a lo que había.
  const cargarGuardadas = () => {
    const g = carga?.guardadas
    if (!g) return
    const d = g.secciones ? desdeSecciones(g.letra, g.secciones) : null
    setHist(h => registrar(h, d ?? docVacio(g.letra))); setGuardadasCargadas(true); setQuitados(null); setError(null); setModo('acordes')
  }
  const avisarQuitados = (q: { acordes: number; interludios: number }) =>
    setQuitados([q.acordes ? T.quitados(q.acordes) : '', q.interludios ? T.quitadosInterludios(q.interludios) : ''].filter(Boolean).join(' · ') || null)

  const alEscribir = (valor: string, caret: number) => {
    const r = cambiarTexto(doc, valor, caret)
    if (r.doc === doc) return
    const linea = 'l' + valor.slice(0, caret).split('\n').length
    setHist(h => registrar(h, r.doc, linea)); avisarQuitados(r.quitados); setError(null)
  }
  // Inserta el encabezado en la línea del cursor (con numeración automática) y deja el cursor listo para escribir debajo. El teclado no se cierra: los botones no le quitan el foco al cuadro.
  const insertarSeccion = (tipo: TipoSeccion) => {
    const area = areaRef.current, r = insertarEncabezado(doc, area?.selectionStart ?? doc.texto.length, tipo)
    setHist(h => registrar(h, r.doc)); avisarQuitados(r.quitados); setError(null)
    requestAnimationFrame(() => { const a2 = areaRef.current; if (a2) { a2.focus(); a2.setSelectionRange(r.caret, r.caret) } })
  }

  const pedirTono = (a: string) => {
    if (a === tono) return
    if (doc.anclas.length || doc.interludios.length) setDialogo({ tipo: 'tono', a }); else { setTono(a); setError(null) }
  }
  // El aviso rojo vive en una franja fija bajo la barra (no dentro del cuerpo que se desplaza): al aparecer recibe el foco, que lo trae a la vista y lo anuncia. Sin tono, el foco se queda en el selector.
  useEffect(() => { if (error && error !== T.faltaTono) errorRef.current?.focus() }, [error])
  const cancelar = () => (sucio ? setDialogo({ tipo: 'salir' }) : onCerrar())

  // Con letra o secciones ya guardadas se muestra, antes de escribir nada, qué va a cambiar; se confirma una vez por apertura del editor.
  const pedirGuardar = () => {
    if (!carga || guardando) return
    if (!tono) { setError(T.faltaTono); selectRef.current?.focus(); return }
    const r = carga.actual ? resumenDeCambios({ ...carga.actual, letra: carga.letra }, { letra: doc.texto, secciones: aSecciones(doc) }) : null
    if (r && r.hayContenido && !confirmado) { setDialogo({ tipo: 'guardar', resumen: r }); return }
    void guardar()
  }
  const guardar = async () => {
    if (!carga || guardando) return
    if (!tono) { setError(T.faltaTono); selectRef.current?.focus(); return }
    setGuardando(true); setError(null); setConflicto(false)
    try {
      const r = await fetch('/api/admin/canciones/acordes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId, tono, letra: doc.texto, secciones: aSecciones(doc), base: carga.huella }) })
      const j = await r.json().catch(() => null)
      if (r.ok) { onGuardado(); return }
      const m = mensajeDeGuardado(r.status, j)
      if (m.conflicto) setConflicto(true)
      setError(m.texto)
    } catch { setError(mensajeDeGuardado(0, null).texto) }
    setGuardando(false)
  }

  return (
    <div ref={raizRef} className={ui.raiz} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className={ui.cab}>
        <button type="button" className={ui.texto} onClick={cancelar}>‹ {T.cancelar}</button>
        <h2>{titulo}</h2>
        <button type="button" className={`${ui.texto} ${ui.guardar}`} onClick={pedirGuardar} disabled={estado !== 'listo' || guardando}>{guardando ? T.guardando : T.guardar}</button>
      </div>
      {estado === 'listo' && (aviso || error || (carga?.guardadas && !guardadasCargadas)) && (
        <div className={ui.franja}>
          {aviso && <p className={ui.aviso} role="status">{aviso}</p>}
          {carga?.guardadas && !guardadasCargadas && (
            <p className={ui.aviso} role="status">{T.avisoGuardadas(carga.guardadas.nSecciones, !!carga.guardadas.secciones)} <button type="button" className={ui.texto} onClick={cargarGuardadas}>{T.cargarGuardadas}</button></p>
          )}
          {error && (
            <div ref={errorRef} className={ui.error} role="alert" tabIndex={-1}>{error}{conflicto && <> <button type="button" className={ui.texto} onClick={() => void cargar()}>{T.reintentar}</button></>}</div>
          )}
        </div>
      )}
      {estado === 'listo' && (
        <div className={ui.herr}>
          <button type="button" className={ui.icono} aria-label={T.deshacer} disabled={!puedeDeshacer(hist)} onClick={() => { setHist(deshacer); setQuitados(null) }}><Undo2 size={20} aria-hidden="true" /></button>
          <button type="button" className={ui.icono} aria-label={T.rehacer} disabled={!puedeRehacer(hist)} onClick={() => { setHist(rehacer); setQuitados(null) }}><Redo2 size={20} aria-hidden="true" /></button>
          <button type="button" className={ui.modoTexto} aria-pressed={modo === 'texto'} onClick={() => setModo(m => (m === 'texto' ? 'acordes' : 'texto'))}>{modo === 'texto' ? T.volverAcordes : T.modoTexto}</button>
          <span className={ui.salto} aria-hidden="true" />
          <label className={`${ui.tono} ${!tono ? ui.sinTono : ''}`}>{T.tono}
            <select ref={selectRef} value={tono} onChange={e => pedirTono(e.target.value)} aria-label={T.tono}>
              <option value="">{T.sinTono}</option>
              {TONOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <div className={ui.notacion} role="group" aria-label={T.notacion}>
            <button type="button" aria-pressed={notacion === 'american'} onClick={() => setNotacion('american')}>{T.notacionLetras}</button>
            <button type="button" aria-pressed={notacion === 'number'} onClick={() => setNotacion('number')}>{T.notacionGrados}</button>
          </div>
        </div>
      )}
      <div className={ui.cuerpo}>
        {estado === 'cargando' && <p className={ui.estado} role="status">…</p>}
        {estado === 'error' && (
          <div role="alert" className={ui.estado}><p>{T.errorCarga}</p><button type="button" className={ui.texto} onClick={() => void cargar()}>{T.reintentar}</button></div>
        )}
        {estado === 'listo' && (
          <>
            {quitados && <p className={ui.aviso} role="status">{quitados}{puedeDeshacer(hist) && <> <button type="button" className={ui.texto} onClick={() => { setHist(deshacer); setQuitados(null) }}>{T.deshacer}</button></>}</p>}
            {modo === 'texto' && (
              <textarea ref={areaRef} className={ui.area} value={doc.texto} aria-label={T.modoLetra} spellCheck={false} autoCapitalize="sentences"
                onChange={e => alEscribir(e.target.value, e.target.selectionStart ?? e.target.value.length)} />
            )}
            {modo === 'acordes' && (tono
              ? <ModoAcordes doc={doc} tono={tono} notacion={notacion} onCambio={(d, aviso) => { setHist(h => registrar(h, d)); setQuitados(aviso ?? null); setError(null) }} />
              : <p className={ui.error} role="status">{T.faltaTono}</p>)}
          </>
        )}
      </div>
      {estado === 'listo' && modo === 'texto' && (
        <div className={ui.barraTexto}>
          <div className={ui.encabezados} role="group" aria-label={T.agregarSeccion}>
            {TIPOS_SECCION.map(tp => <button key={tp} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insertarSeccion(tp)}>{T.secciones[tp]}</button>)}
          </div>
          <div className={ui.pieTexto}>
            <button type="button" className={ui.volver} onMouseDown={e => e.preventDefault()} onClick={() => setModo('acordes')}>{T.volverAcordes}</button>
            <span>{T.ayudaTexto}</span>
          </div>
        </div>
      )}
      {dialogo && (
        <div className={ui.velo} role="presentation">
          <div className={ui.dialogo} role="alertdialog" aria-modal="true" aria-labelledby="ed-dlg-t">
            {dialogo.tipo === 'guardar' ? (
              <>
                <h3 id="ed-dlg-t">{T.resumenTitulo}</h3>
                <ul>
                  <li>{dialogo.resumen.letraCambia ? T.resumenLetra(dialogo.resumen.lineas[0], dialogo.resumen.lineas[1]) : T.resumenLetraIgual}</li>
                  <li>{T.resumenSecciones(dialogo.resumen.secciones[0], dialogo.resumen.secciones[1])}</li>
                  {dialogo.resumen.seDesactivan.length > 0 && <li>{T.resumenDesactiva(dialogo.resumen.seDesactivan)}</li>}
                  {dialogo.resumen.entradasArreglo > 0 && <li>{T.resumenArreglo(dialogo.resumen.entradasArreglo)}</li>}
                </ul>
                <p>{T.resumenRespaldo}</p>
                <div className={ui.botones}>
                  <button type="button" onClick={() => setDialogo(null)}>{T.seguirEditando}</button>
                  <button type="button" className={ui.principal} onClick={() => { setDialogo(null); setConfirmado(true); void guardar() }}>{T.resumenGuardar}</button>
                </div>
              </>
            ) : dialogo.tipo === 'salir' ? (
              <>
                <h3 id="ed-dlg-t">{T.descartar}</h3>
                <div className={ui.botones}>
                  <button type="button" onClick={() => setDialogo(null)}>{T.seguirEditando}</button>
                  <button type="button" className={ui.principal} onClick={onCerrar}>{T.descartarSi}</button>
                </div>
              </>
            ) : (
              <>
                <h3 id="ed-dlg-t">{T.cambiarTonoTitulo}</h3>
                <p>{T.cambiarTonoCuerpo(tono, dialogo.a)}</p>
                <div className={ui.botones}>
                  <button type="button" onClick={() => setDialogo(null)}>{T.cancelar}</button>
                  <button type="button" className={ui.principal} onClick={() => { setTono(dialogo.a); setDialogo(null); setError(null) }}>{T.cambiarTonoSi}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
