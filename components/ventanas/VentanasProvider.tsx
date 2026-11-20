'use client'
// Dibuja la ventana centrada de `confirmar` / `avisar` (lib/ventanas/ventanas.ts) en teléfono. El mensaje es el de siempre; para la ventana se parte en título y texto (lib/ventanas/partirMensaje.ts).
// Movimiento (M3): cada ventana es un elemento de una lista con su propio <Presente>: al cerrarse sigue en pantalla lo que dura su salida (inert, sin toques) y recién entonces se quita de la lista (onSalio). Si se abre otra justo después de
// cerrar una, conviven esos ~250 ms —la que sale y la que entra, cada una con su historial, su foco y su desplazamiento— y la nueva queda encima. La respuesta a quien llamó (la promesa) se da en el mismo instante de cerrar, no al final
// de la animación: la animación es solo visual.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { partirMensaje } from '@/lib/ventanas/partirMensaje'
import { registrarVentanas, type OpcionesAvisar, type OpcionesConfirmar } from '@/lib/ventanas/ventanas'
import { TEXTOS_VENTANAS as T } from '@/lib/textos/ventanas'
import Presente from '../Presente'
import VentanaCentrada from './VentanaCentrada'

type Abierta = { tipo: 'confirmar'; mensaje: string; o: OpcionesConfirmar; fin: (v: boolean) => void } | { tipo: 'avisar'; mensaje: string; o: OpcionesAvisar; fin: () => void }
type Pieza = { id: number; a: Abierta; abierta: boolean }

export function VentanasProvider({ children }: { children: ReactNode }) {
  const [piezas, setPiezas] = useState<Pieza[]>([])
  const eligio = useRef(new Set<number>())      // «sí» se anota al tocar el botón; cerrar sin elegir (Escape, el fondo, «atrás») es «no»
  const siguiente = useRef(0)
  useEffect(() => {
    const abrir = (a: Abierta) => setPiezas(l => [...l.map(x => x.abierta ? { ...x, abierta: false } : x), { id: ++siguiente.current, a, abierta: true }])      // una ventana nueva reemplaza a la abierta (que sale)
    registrarVentanas({
      confirmar: (mensaje, o) => new Promise<boolean>(fin => abrir({ tipo: 'confirmar', mensaje, o, fin })),
      avisar: (mensaje, o) => new Promise<void>(fin => abrir({ tipo: 'avisar', mensaje, o, fin })),
    })
    return () => registrarVentanas(null)
  }, [])
  const cerrar = (id: number, a: Abierta) => {
    const v = eligio.current.has(id); eligio.current.delete(id)
    setPiezas(l => l.map(x => x.id === id ? { ...x, abierta: false } : x))
    if (a.tipo === 'confirmar') a.fin(v); else a.fin()
  }
  return (
    <>
      {children}
      {piezas.map(pz => (
        <Presente key={pz.id} abierta={pz.abierta} valor={pz.a} onSalio={() => setPiezas(l => l.filter(x => x.id !== pz.id))}>
          {a => {
            const p = partirMensaje(a.mensaje)
            return a.tipo === 'confirmar'
              ? <VentanaCentrada titulo={p.titulo} texto={p.texto} tono={a.o.peligro ? 'peligro' : 'info'} onCerrar={() => cerrar(pz.id, a)}
                  botones={[{ texto: a.o.cancelar ?? T.cancelar, onClick: () => {} }, { texto: a.o.accion ?? T.continuar, primario: true, peligro: a.o.peligro, antes: () => { eligio.current.add(pz.id) }, onClick: () => {} }]} />
              : <VentanaCentrada titulo={p.titulo} texto={p.texto} tono={a.o.tono ?? 'error'} onCerrar={() => cerrar(pz.id, a)}
                  botones={[{ texto: a.o.cerrar ?? T.cerrar, onClick: () => {} }]} />
          }}
        </Presente>
      ))}
    </>
  )
}
