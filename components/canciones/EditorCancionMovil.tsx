'use client'
// Editor de acordes en teléfono (etapa C2): pantalla completa con los modos Letra y Acordes. Todo vive en memoria: NADA se guarda hasta pulsar Guardar (una sola petición a /api/admin/canciones/acordes).
// El documento, su historial (Deshacer/Rehacer) y la regla de posición de los acordes están en lib/editorAcordes.ts; aquí solo la pantalla.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import { aSecciones, agregarSeccionInstrumental, aplicarEdicion, cambiarTexto, deshacer, desdeSecciones, docVacio, estructura, nuevoHistorial, puedeDeshacer, puedeRehacer, registrar, rehacer, type Documento, type Historial } from '@/lib/editorAcordes'
import { TONOS } from '@/lib/tonos'
import { TEXTOS_EDITOR as T, mensajeDeGuardado } from '@/lib/textos/editorAcordes'
import ModoAcordes from './ModoAcordes'
import ui from './editor-cancion-movil.module.css'

type Cargado = { tono: string; letra: string; origen: 'formato2' | 'pendiente' | 'formato1' | 'ninguno'; secciones: any[][] | null; sinConvertir: number; huella: string }
type Props = { songId: string; titulo: string; onCerrar: () => void; onGuardado: () => void }

const NOMBRES: Record<string, string> = { verso: 'VERSO', precoro: 'PRE-CORO', coro: 'CORO', puente: 'PUENTE' }

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
  const [modo, setModo] = useState<'letra' | 'acordes'>('letra')
  const [dialogo, setDialogo] = useState<null | { tipo: 'salir' } | { tipo: 'tono'; a: string }>(null)
  const [quitados, setQuitados] = useState<string | null>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null), selectRef = useRef<HTMLSelectElement>(null), errorRef = useRef<HTMLDivElement>(null)
  const doc = hist.presente

  const cargar = useCallback(async () => {
    setEstado('cargando'); setError(null); setConflicto(false)
    try {
      const r = await fetch(`/api/admin/canciones/acordes?id=${encodeURIComponent(songId)}`, { cache: 'no-store' })
      const j = r.ok ? await r.json() : null
      if (!j?.cancion) { setEstado('error'); return }
      const c = j.cancion as Cargado
      const d = c.secciones ? desdeSecciones(c.letra, c.secciones) : null
      const doc0 = d ?? docVacio(c.letra)
      setCarga(c); setHist(nuevoHistorial(doc0)); setTono(c.tono); setInicial({ doc: doc0, tono: c.tono }); setModo('letra'); setQuitados(null)
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

  const avisarQuitados = (q: { acordes: number; interludios: number }) =>
    setQuitados([q.acordes ? T.quitados(q.acordes) : '', q.interludios ? T.quitadosInterludios(q.interludios) : ''].filter(Boolean).join(' · ') || null)

  const alEscribir = (valor: string, caret: number) => {
    const r = cambiarTexto(doc, valor, caret)
    if (r.doc === doc) return
    const linea = 'l' + valor.slice(0, caret).split('\n').length
    setHist(h => registrar(h, r.doc, linea)); avisarQuitados(r.quitados); setError(null)
  }
  const agregarSeccion = (clave: string) => {
    if (clave === 'instrumental') { setHist(h => registrar(h, agregarSeccionInstrumental(doc).doc)); setQuitados(null); return }
    const nombre = NOMBRES[clave], n = clave === 'verso' ? estructura(doc.texto).secciones.filter(s => /^VERSO\b/i.test(s.nombre)).length + 1 : 0
    const T0 = doc.texto, sep = !T0.trim() ? '' : T0.endsWith('\n\n') ? '' : T0.endsWith('\n') ? '\n' : '\n\n'
    const r = aplicarEdicion(doc, { s: T0.length, e: T0.length, t: `${sep}${nombre}${n ? ' ' + n : ''}:\n` })
    setHist(h => registrar(h, r.doc)); setQuitados(null)
    requestAnimationFrame(() => { const a = areaRef.current; if (a) { a.focus(); a.setSelectionRange(a.value.length, a.value.length) } })
  }

  const pedirTono = (a: string) => {
    if (a === tono) return
    if (doc.anclas.length || doc.interludios.length) setDialogo({ tipo: 'tono', a }); else { setTono(a); setError(null) }
  }
  // El aviso rojo vive en una franja fija bajo la barra (no dentro del cuerpo que se desplaza): al aparecer recibe el foco, que lo trae a la vista y lo anuncia. Sin tono, el foco se queda en el selector.
  useEffect(() => { if (error && error !== T.faltaTono) errorRef.current?.focus() }, [error])
  const cancelar = () => (sucio ? setDialogo({ tipo: 'salir' }) : onCerrar())

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

  const nAcordes = doc.anclas.length

  return (
    <div className={ui.raiz} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className={ui.cab}>
        <button type="button" className={ui.texto} onClick={cancelar}>‹ {T.cancelar}</button>
        <h2>{titulo}</h2>
        <button type="button" className={`${ui.texto} ${ui.guardar}`} onClick={guardar} disabled={estado !== 'listo' || guardando}>{guardando ? T.guardando : T.guardar}</button>
      </div>
      {estado === 'listo' && (aviso || error) && (
        <div className={ui.franja}>
          {aviso && <p className={ui.aviso} role="status">{aviso}</p>}
          {error && (
            <div ref={errorRef} className={ui.error} role="alert" tabIndex={-1}>{error}{conflicto && <> <button type="button" className={ui.texto} onClick={() => void cargar()}>{T.reintentar}</button></>}</div>
          )}
        </div>
      )}
      {estado === 'listo' && (
        <>
          <div className={ui.herr}>
            <button type="button" className={ui.icono} aria-label={T.deshacer} disabled={!puedeDeshacer(hist)} onClick={() => { setHist(deshacer); setQuitados(null) }}><Undo2 size={20} aria-hidden="true" /></button>
            <button type="button" className={ui.icono} aria-label={T.rehacer} disabled={!puedeRehacer(hist)} onClick={() => { setHist(rehacer); setQuitados(null) }}><Redo2 size={20} aria-hidden="true" /></button>
            <span className={ui.cuenta}>{T.acordesConservados(nAcordes)}</span>
          </div>
          <div className={ui.modos} role="group" aria-label="Modo">
            <button type="button" aria-pressed={modo === 'letra'} onClick={() => setModo('letra')}>{T.modoLetra}</button>
            <button type="button" aria-pressed={modo === 'acordes'} onClick={() => setModo('acordes')}>{T.modoAcordes}</button>
          </div>
        </>
      )}
      <div className={ui.cuerpo}>
        {estado === 'cargando' && <p className={ui.estado} role="status">…</p>}
        {estado === 'error' && (
          <div role="alert" className={ui.estado}><p>{T.errorCarga}</p><button type="button" className={ui.texto} onClick={() => void cargar()}>{T.reintentar}</button></div>
        )}
        {estado === 'listo' && (
          <>
            {quitados && <p className={ui.aviso} role="status">{quitados}</p>}
            <div className={ui.fila}>
              <label className={`${ui.tono} ${!tono ? ui.sinTono : ''}`}>{T.tono}
                <select ref={selectRef} value={tono} onChange={e => pedirTono(e.target.value)} aria-label={T.tono}>
                  <option value="">{T.sinTono}</option>
                  {TONOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </div>
            {modo === 'letra' && (
              <>
                <div className={ui.chips}>
                  <button type="button" onClick={() => agregarSeccion('verso')}>{T.secciones.verso}</button>
                  <button type="button" onClick={() => agregarSeccion('precoro')}>{T.secciones.precoro}</button>
                  <button type="button" onClick={() => agregarSeccion('coro')}>{T.secciones.coro}</button>
                  <button type="button" onClick={() => agregarSeccion('puente')}>{T.secciones.puente}</button>
                  <button type="button" onClick={() => agregarSeccion('instrumental')}>{T.secciones.instrumental}</button>
                </div>
                <textarea ref={areaRef} className={ui.area} value={doc.texto} aria-label={T.modoLetra} spellCheck={false} autoCapitalize="sentences"
                  onChange={e => alEscribir(e.target.value, e.target.selectionStart ?? e.target.value.length)} />
                <p className={ui.ayuda}>{T.ayudaLetra}</p>
              </>
            )}
            {modo === 'acordes' && (tono
              ? <ModoAcordes doc={doc} tono={tono} onCambio={d => { setHist(h => registrar(h, d)); setQuitados(null); setError(null) }} />
              : <p className={ui.error} role="status">{T.faltaTono}</p>)}
          </>
        )}
      </div>
      {dialogo && (
        <div className={ui.velo} role="presentation">
          <div className={ui.dialogo} role="alertdialog" aria-modal="true" aria-labelledby="ed-dlg-t">
            {dialogo.tipo === 'salir' ? (
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
