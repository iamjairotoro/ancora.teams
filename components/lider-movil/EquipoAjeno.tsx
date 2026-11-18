'use client'
// La pantalla de un equipo AJENO para el líder: la MISMA del administrador (servicio-movil/VistaEquipo) en solo lectura: se ven sus voluntarios, cuántos faltan y qué herramientas tiene (solo el tipo), con el candado.
// Sus props son SOLO datos (nada de funciones de acción) y este archivo no importa lib/lider/cliente: no tiene cómo escribir. No se le pasan manejadores a VistaEquipo, así que nada se abre, se añade ni se asigna.
import type { EquipoAjeno as Datos } from '@/lib/lider/servicioLider'
import { TEXTOS_LIDER as T } from '@/lib/textos/servicioLider'
import { voluntariosN } from '@/lib/textos/servicio'
import VistaEquipo from '../servicio-movil/VistaEquipo'
import { TIPO_DE_HERRAMIENTA, cuentasDe, nombreDeTipo, posicionesVista, resumenDe } from './datosVista'

export default function EquipoAjeno({ equipo, subtitulo }: { readonly equipo: Datos; readonly subtitulo: string }) {
  const c = cuentasDe(equipo)
  return (
    <VistaEquipo nombre={equipo.nombre} color={equipo.color} subtitulo={subtitulo} resumen={resumenDe(c)} vacantes={c.vacantes} soloLectura
      herramientas={equipo.herramientas.map((t, i) => ({ clave: `${t}-${i}`, tipo: TIPO_DE_HERRAMIENTA[t], nombre: nombreDeTipo(t) }))}
      tituloVoluntarios={voluntariosN(c.asignados, c.cupos)} ayudaPosiciones={T.ayudaPosicionesAjeno} sinPosiciones={T.sinPosicionesAjeno} posiciones={posicionesVista(equipo)} />
  )
}
