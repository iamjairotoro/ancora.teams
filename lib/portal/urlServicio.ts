// La URL de un servicio dentro del portal (punto 54, commit 5): `/portal?servicio=<id>&equipo=<id>` (sesión) o `/portal/<token>?servicio=…` (enlace del correo). Las rutas viejas
// /portal/servicio/<id>?equipo= y /portal/<token>/servicio/<id>?equipo= redirigen aquí, así los enlaces guardados siguen funcionando. Sin acceso a datos ni a servidor.
export function urlServicio(base: string, id: string, equipo?: string | null): string {
  const q = new URLSearchParams({ servicio: id })
  if (equipo) q.set('equipo', equipo)
  return `${base}?${q.toString()}`
}
