// ?person=<id> en /admin (Personas). PURAS: dicen CUÁNDO se escribe la persona en la URL y cuándo se consume.
// Regla: `?person=` es una PETICIÓN del enlace (Home, Servicio…) o la selección de la ficha FIJA (≥ 1024 px, donde siempre hay una persona seleccionada por defecto: intencional). En pantalla chica (cajón) no hay
// ficha fija: una selección por defecto (la primera de la lista) NO se escribe en la URL, y un `?person=` que abre el cajón al entrar se QUITA de la URL con replaceState (sin entradas extra en el historial); así volver de
// «Equipos» a «Personas» (que vuelve a montar la lista) muestra el listado y no reabre ningún perfil. `anchoFijo`: true = ≥ 1024 px, false = cajón (< 1024 px), null = todavía sin medir.

/** «ruta?consulta#hash» de `href` con `person` puesto (o quitado con null); null si ya estaba así. */
function conPersona(href: string, id: string | null): string | null {
  const url = new URL(href), antes = url.search
  if (id) url.searchParams.set('person', id); else url.searchParams.delete('person')
  return url.search === antes ? null : url.pathname + url.search + url.hash
}

/** La URL nueva al seleccionar a `id` (o a nadie): solo con la ficha fija visible se escribe; con cajón o sin medir, null (no se toca la URL). */
export function urlAlSeleccionar(href: string, id: string | null, anchoFijo: boolean | null): string | null {
  return anchoFijo === true ? conPersona(href, id) : null
}

/** Al montar la lista: con cajón, el `?person=` de la URL abre ESA persona (si existe) UNA vez y se quita de la URL; con ficha fija o sin medir no pasa nada (la ficha fija ya muestra la selección). */
export function alMontarLista(o: { href: string; ids: string[]; anchoFijo: boolean | null }): { abrirCajon: string | null; urlNueva: string | null } {
  if (o.anchoFijo !== false) return { abrirCajon: null, urlNueva: null }
  const id = new URL(o.href).searchParams.get('person')
  return { abrirCajon: id && o.ids.includes(id) ? id : null, urlNueva: id ? conPersona(o.href, null) : null }
}
