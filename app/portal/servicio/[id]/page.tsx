'use client'
// Detalle de un servicio con la identidad resuelta en el servidor (sin id en la URL).
import { useParams } from 'next/navigation'
import ServicioDetalle from '../../_components/ServicioDetalle'

export default function ServicioMePage() {
  const { id } = useParams<{ id: string }>()
  return <ServicioDetalle token={null} svcId={id} />
}
