'use client'
// Dibuja la ventana centrada de `confirmar` / `avisar` (lib/ventanas/ventanas.ts) en teléfono. El mensaje es el de siempre; para la ventana se parte en título y texto (lib/ventanas/partirMensaje.ts).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { partirMensaje } from '@/lib/ventanas/partirMensaje'
import { registrarVentanas, type OpcionesAvisar, type OpcionesConfirmar } from '@/lib/ventanas/ventanas'
import { TEXTOS_VENTANAS as T } from '@/lib/textos/ventanas'
import VentanaCentrada from './VentanaCentrada'

type Abierta = { tipo: 'confirmar'; mensaje: string; o: OpcionesConfirmar; fin: (v: boolean) => void } | { tipo: 'avisar'; mensaje: string; o: OpcionesAvisar; fin: () => void }

export function VentanasProvider({ children }: { children: ReactNode }) {
  const [abierta, setAbierta] = useState<Abierta | null>(null)
  const eligio = useRef(false)      // «sí» se anota al tocar el botón; cerrar sin elegir (Escape, el fondo, «atrás») es «no»
  useEffect(() => {
    registrarVentanas({
      confirmar: (mensaje, o) => new Promise<boolean>(fin => setAbierta({ tipo: 'confirmar', mensaje, o, fin })),
      avisar: (mensaje, o) => new Promise<void>(fin => setAbierta({ tipo: 'avisar', mensaje, o, fin })),
    })
    return () => registrarVentanas(null)
  }, [])
  const cerrar = () => { const a = abierta, v = eligio.current; eligio.current = false; setAbierta(null); if (a?.tipo === 'confirmar') a.fin(v); else if (a) a.fin() }
  const p = abierta ? partirMensaje(abierta.mensaje) : null
  return (
    <>
      {children}
      {abierta && p && (abierta.tipo === 'confirmar'
        ? <VentanaCentrada titulo={p.titulo} texto={p.texto} tono={abierta.o.peligro ? 'peligro' : 'info'} onCerrar={cerrar}
            botones={[{ texto: abierta.o.cancelar ?? T.cancelar, onClick: () => {} }, { texto: abierta.o.accion ?? T.continuar, primario: true, peligro: abierta.o.peligro, antes: () => { eligio.current = true }, onClick: () => {} }]} />
        : <VentanaCentrada titulo={p.titulo} texto={p.texto} tono={abierta.o.tono ?? 'error'} onCerrar={cerrar}
            botones={[{ texto: abierta.o.cerrar ?? T.cerrar, onClick: () => {} }]} />)}
    </>
  )
}
