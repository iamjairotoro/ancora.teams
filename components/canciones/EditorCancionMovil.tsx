'use client'
// Editor de acordes en teléfono (etapa C2): pantalla completa con los modos Letra y Acordes. Todo vive en memoria: NADA se guarda hasta pulsar Guardar (una sola petición a /api/admin/canciones/acordes).
// El documento, su historial (Deshacer/Rehacer) y la regla de posición de los acordes están en lib/editorAcordes.ts; aquí solo la pantalla.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import { agregarParte, aSecciones, cambiarTexto, deshacer, desdeSecciones, docVacio, insertarEncabezado, nuevoHistorial, puedeDeshacer, puedeRehacer, registrar, rehacer, TIPOS_SECCION, type Documento, type Historial, type TipoSeccion } from '@/lib/editorAcordes'
import { TONOS } from '@/lib/tonos'
import { resumenDeCambios, type ActualGuardado, type Afectada, type Resumen } from '@/lib/resumenGuardado'
import { TEXTOS_EDITOR as T, mensajeDeGuardado } from '@/lib/textos/editorAcordes'
import { TEXTOS_NUEVA, subtituloEditor } from '@/lib/nuevaCancion'
import { parteDe } from '@/lib/partesCancion'
import { estructura, parteAlcanzada, parteDeCaret, partesDeDocumento } from '@/lib/editorAcordes'
import { HojaAgregarParte, TarjetaEmpieza } from './nueva/SelectorParte'
import MenuParte from './nueva/MenuParte'
import { arregloParaGuardar, conRepeticion, repeticionesDeLasPartes, type Repeticiones } from '@/lib/arregloCancion'
import { desplazamientoHasta } from './nueva/posicionTexto'
import TiraPartes, { type ParteTira } from './lectura/TiraPartes'
import coloresUi from './lectura/partes.module.css'
import { useTecladoHoja } from '../useTecladoHoja'
import ModoAcordes from './ModoAcordes'
import ui from './editor-cancion-movil.module.css'

type Cargado = { arregloPropio?: boolean; tono: string; letra: string; origen: 'formato2' | 'pendiente' | 'formato1' | 'ninguno'; secciones: any[][] | null; sinConvertir: number; huella: string; guardadas?: { letra: string; secciones: any[][] | null; nSecciones: number; sinConvertir: number } | null; actual?: ActualGuardado }
// `nueva` (opcional): el editor de una canción NUEVA (paso B de «Nueva canción»): cabecera «‹ Datos» con «Tono · bpm · Editar datos», tarjeta «Empieza por una parte» mientras no hay texto y hoja «Agregar parte». Sin ella, el editor es el de siempre.
type Props = { songId: string; titulo: string; onCerrar: () => void; onGuardado: () => void; nueva?: { bpm: number | null; onDatos: () => void } }

const firma = (a: Afectada[]) => a.map(x => `${x.codigo}:${x.motivo}`).join('|')

export default function EditorCancionMovil({ songId, titulo, onCerrar, onGuardado, nueva }: Props) {
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
  const [arregloOk, setArregloOk] = useState<string | null>(null)          // las secciones del arreglo cuyo cambio ya se confirmó (su firma)
  const [quitados, setQuitados] = useState<string | null>(null)
  const [guardadasCargadas, setGuardadasCargadas] = useState(false)
  const [agregando, setAgregando] = useState(false)           // la hoja «Agregar parte» (solo canción nueva)
  const [menuParte, setMenuParte] = useState<number | null>(null)   // el menú del círculo (solo canción nueva): el índice de la parte
  const [repeticiones, setRepeticiones] = useState<Repeticiones>({})   // «Repetir ×N» por parte (solo canción nueva): viven aquí hasta Guardar
  const [activaSec, setActivaSec] = useState(0)                // la parte activa de la tira (solo canción nueva): donde está el cursor o lo último que se tocó
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
      setCarga(c); setHist(nuevoHistorial(doc0)); setTono(c.tono); setInicial({ doc: doc0, tono: c.tono }); setModo(c.letra.trim() ? 'acordes' : 'texto'); setQuitados(null); setGuardadasCargadas(false); setConfirmado(false); setArregloOk(null)
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
  const salir = nueva ? nueva.onDatos : onCerrar       // en una canción nueva, «‹ Datos» vuelve a la ventana de datos
  const cancelar = () => (sucio ? setDialogo({ tipo: 'salir' }) : salir())
  const vacioNueva = !!nueva && !doc.texto.trim()      // canción nueva sin nada escrito: tarjeta «Empieza por una parte»
  // Agrega la parte al final del documento y pasa al texto, con el cursor listo para escribir su letra.
  const elegirParte = (tipo: TipoSeccion) => {
    const r = agregarParte(doc, tipo)
    setAgregando(false)
    if (!r) { setError(TEXTOS_NUEVA.limiteSecciones); return }
    setHist(h => registrar(h, r.doc)); setQuitados(null); setError(null); setModo('texto'); setActivaSec(Math.max(0, partesDeDocumento(r.doc.texto).length - 1))
    requestAnimationFrame(() => requestAnimationFrame(() => { const a = areaRef.current; if (a) { a.focus(); a.setSelectionRange(r.caret, r.caret) } }))
  }

  // La tira de partes (canción nueva): un círculo por parte del texto, con su color y abreviatura (los de la lectura). Tocar uno lleva a esa parte; el «+» abre «Agregar parte».
  const nombresPartes = useMemo(() => (nueva ? partesDeDocumento(doc.texto).map(p => p.nombre) : []), [nueva, doc.texto])
  const partesTira: ParteTira[] = useMemo(() => { const rep = repeticionesDeLasPartes(nombresPartes, repeticiones); return nombresPartes.map((nombre, i) => { const x = parteDe('', nombre); return { abrev: x.abrev || '·', clave: x.clave, nombre: nombre || TEXTOS_NUEVA.parteSinNombre, repeat: rep[i] } }) }, [nombresPartes, repeticiones])
  const cuerpoEl = () => raizRef.current?.querySelector<HTMLElement>('[class*="_cuerpo__"]') ?? null
  const toqueSec = useRef<number | null>(null)      // la última parte tocada en la tira: al FINAL del desplazamiento manda ella (una parte del final no puede llegar arriba y, sin esto, dejaría de ser la activa y su segundo toque no abriría el menú); al alejarse del final vuelve la regla normal
  const irASeccion = (i: number) => {
    setActivaSec(i); toqueSec.current = i
    const reducido = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (modo === 'texto') {
      const a = areaRef.current, p = partesDeDocumento(doc.texto)[i]
      if (!a || !p) return
      a.focus({ preventScroll: true }); a.setSelectionRange(p.ini, p.ini); a.scrollTop = desplazamientoHasta(a, p.ini)
    } else cuerpoEl()?.querySelectorAll('section[class*="_sec__"]')[i]?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' })
  }
  // La parte activa sigue al cursor (modo Texto) o a lo que se está viendo (modo Acordes: la última parte cuyo borde de arriba ya llegó a la zona de arriba del cuerpo).
  useEffect(() => {
    if (!nueva || estado !== 'listo' || vacioNueva) return
    if (modo === 'texto') {
      const alMover = () => { const a = areaRef.current; if (a && document.activeElement === a) setActivaSec(parteDeCaret(a.value, a.selectionStart ?? 0)) }
      document.addEventListener('selectionchange', alMover); return () => document.removeEventListener('selectionchange', alMover)
    }
    const c = cuerpoEl(); if (!c) return
    let raf = 0
    toqueSec.current = null
    const calcular = () => {
      raf = 0
      const alFinal = c.scrollTop >= c.scrollHeight - c.clientHeight - 2
      if (!alFinal) toqueSec.current = null
      const arriba = c.getBoundingClientRect().top, calculada = parteAlcanzada(Array.from(c.querySelectorAll('section[class*="_sec__"]')).map(x => x.getBoundingClientRect().top), arriba + 24)
      setActivaSec(alFinal && toqueSec.current !== null ? toqueSec.current : calculada)
    }
    const alDesplazar = () => { if (!raf) raf = requestAnimationFrame(calcular) }
    alDesplazar()      // al entrar al modo Acordes la activa se recalcula con lo que se ve, sin esperar a que haya desplazamiento
    c.addEventListener('scroll', alDesplazar, { passive: true }); return () => { c.removeEventListener('scroll', alDesplazar); if (raf) cancelAnimationFrame(raf) }
  }, [nueva, estado, modo, vacioNueva])

  // Con letra o secciones ya guardadas se muestra, antes de escribir nada, qué va a cambiar; se confirma una vez por apertura del editor.
  const pedirGuardar = () => {
    if (!carga || guardando) return
    if (!tono) { setError(T.faltaTono); selectRef.current?.focus(); return }
    const r = carga.actual ? resumenDeCambios({ ...carga.actual, letra: carga.letra }, { letra: doc.texto, secciones: aSecciones(doc) }) : null
    const sinConfirmarArreglo = !!r && r.afectadas.length > 0 && firma(r.afectadas) !== arregloOk       // si el cambio afecta al arreglo, se pide aunque ya se haya confirmado otro resumen
    if (r && ((r.hayContenido && !confirmado) || sinConfirmarArreglo)) { setDialogo({ tipo: 'guardar', resumen: r }); return }
    void guardar(!!r && r.afectadas.length > 0)
  }
  const guardar = async (confirmarArreglo = false) => {
    if (!carga || guardando) return
    if (!tono) { setError(T.faltaTono); selectRef.current?.focus(); return }
    setGuardando(true); setError(null); setConflicto(false)
    const arreglo = nueva && !carga.arregloPropio ? arregloParaGuardar(nombresPartes, repeticiones) : undefined      // las repeticiones solo viajan en el editor de una canción nueva y sin arreglo propio; el servidor decide si las escribe
    try {
      const r = await fetch('/api/admin/canciones/acordes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId, tono, letra: doc.texto, secciones: aSecciones(doc), base: carga.huella, ...(confirmarArreglo ? { confirmarArreglo: true } : {}), ...(arreglo ? { arreglo } : {}) }) })
      const j = await r.json().catch(() => null)
      if (r.ok) { onGuardado(); return }
      if (r.status === 409 && j?.campo === 'arreglo' && Array.isArray(j.afectadas)) {          // el servidor se adelantó a la pantalla: el mismo resumen, con lo que él encontró
        const afectadas = (j.afectadas as Afectada[]).filter(x => x && typeof x.codigo === 'string' && typeof x.nombre === 'string' && Number.isFinite(x.entradas) && (x.motivo === 'baja' || x.motivo === 'cambia'))
        const base = carga.actual ? resumenDeCambios({ ...carga.actual, letra: carga.letra }, { letra: doc.texto, secciones: aSecciones(doc) }) : null
        if (base && afectadas.length) { setDialogo({ tipo: 'guardar', resumen: { ...base, afectadas } }); setGuardando(false); return }
      }
      const m = mensajeDeGuardado(r.status, j)
      if (m.conflicto) setConflicto(true)
      setError(m.texto)
    } catch { setError(mensajeDeGuardado(0, null).texto) }
    setGuardando(false)
  }

  return (
    <div ref={raizRef} className={ui.raiz} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className={ui.cab}>
        <button type="button" className={ui.texto} onClick={cancelar}>‹ {nueva ? TEXTOS_NUEVA.datos : T.cancelar}</button>
        {nueva ? (
          <div className={ui.titulos}><h2>{titulo}</h2><button type="button" className={ui.subtitulo} onClick={cancelar}>{subtituloEditor(tono, nueva.bpm)}</button></div>
        ) : <h2>{titulo}</h2>}
        <button type="button" className={`${ui.texto} ${ui.guardar}`} onClick={pedirGuardar} disabled={estado !== 'listo' || guardando || vacioNueva}>{guardando ? T.guardando : T.guardar}</button>
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
      {nueva && estado === 'listo' && (
        <div className={`${coloresUi.colores} ${ui.tiraEditor}`}>
          <TiraPartes partes={partesTira} activa={Math.min(activaSec, Math.max(0, partesTira.length - 1))} onIr={irASeccion} onMenu={i => { setActivaSec(i); setMenuParte(i) }} agregar={{ etiqueta: TEXTOS_NUEVA.agregarParteBoton, onClick: () => setAgregando(true) }} />
        </div>
      )}
      {!vacioNueva && estado === 'listo' && (
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
            {vacioNueva ? <TarjetaEmpieza doc={doc} onElegir={elegirParte} /> : <>
            {modo === 'texto' && (
              <textarea ref={areaRef} className={ui.area} value={doc.texto} aria-label={T.modoLetra} spellCheck={false} autoCapitalize="sentences"
                onChange={e => alEscribir(e.target.value, e.target.selectionStart ?? e.target.value.length)} />
            )}
            {modo === 'acordes' && (tono
              ? <ModoAcordes doc={doc} tono={tono} notacion={notacion} onCambio={(d, aviso) => { setHist(h => registrar(h, d)); setQuitados(aviso ?? null); setError(null) }} />
              : <p className={ui.error} role="status">{T.faltaTono}</p>)}
            </>}
          </>
        )}
      </div>
      {!vacioNueva && estado === 'listo' && modo === 'texto' && (
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
      {menuParte !== null && nueva && partesTira[menuParte] && <MenuParte parte={partesTira[menuParte]} posicion={menuParte + 1} total={partesTira.length} repeat={partesTira[menuParte].repeat} bloqueado={!!carga?.arregloPropio} onRepeat={n => setRepeticiones(r => conRepeticion(r, nombresPartes, menuParte, n))} onCerrar={() => setMenuParte(null)} />}
      {agregando && nueva && <HojaAgregarParte doc={doc} existentes={estructura(doc.texto).secciones.filter(x => x.nombre).map(x => parteDe('', x.nombre).abrev)} onElegir={elegirParte} onCerrar={() => setAgregando(false)} />}
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
                {dialogo.resumen.afectadas.length > 0 && (
                  <div role="group" aria-label={T.arregloTitulo}>
                    <h3>{T.arregloTitulo}</h3>
                    <ul>{dialogo.resumen.afectadas.map(x => <li key={x.codigo + x.motivo}>{T.arregloItem(x.nombre || x.codigo, x.entradas, x.motivo)}</li>)}</ul>
                  </div>
                )}
                <p>{T.resumenRespaldo}</p>
                <div className={ui.botones}>
                  <button type="button" onClick={() => setDialogo(null)}>{T.seguirEditando}</button>
                  <button type="button" className={ui.principal} onClick={() => { const r = dialogo.resumen, conArreglo = r.afectadas.length > 0; setDialogo(null); setConfirmado(true); if (conArreglo) setArregloOk(firma(r.afectadas)); void guardar(conArreglo) }}>{dialogo.resumen.afectadas.length ? T.arregloConfirmar : T.resumenGuardar}</button>
                </div>
              </>
            ) : dialogo.tipo === 'salir' ? (
              <>
                <h3 id="ed-dlg-t">{T.descartar}</h3>
                <div className={ui.botones}>
                  <button type="button" onClick={() => setDialogo(null)}>{T.seguirEditando}</button>
                  <button type="button" className={ui.principal} onClick={salir}>{T.descartarSi}</button>
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
