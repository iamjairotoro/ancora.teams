// El enlace viejo /portal/servicio/<id>?equipo=<id> (punto 54, commit 5): el servicio ahora vive dentro del portal, con su dirección en la URL (/portal?servicio=<id>&equipo=<id>). Sigue funcionando.
import { redirect } from 'next/navigation'
import { urlServicio } from '@/lib/portal/urlServicio'

export default function ServicioMePage({ params, searchParams }: { params: { id: string }; searchParams: { equipo?: string } }) {
  redirect(urlServicio('/portal', params.id, typeof searchParams.equipo === 'string' ? searchParams.equipo : null))
}
