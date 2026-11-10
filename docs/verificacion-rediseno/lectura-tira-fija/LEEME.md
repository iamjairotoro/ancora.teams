# Lectura (C3): tira de partes fija

La tira de partes queda **pegada arriba** mientras se lee; el contenido pasa por debajo. Rama `lectura-c3`, commit aparte.

## Qué cambia
- `.tiraCaja` (`lectura-partes.module.css`): `position: sticky; top: var(--safe-top, 0px); z-index: 18`, fondo `var(--anc-bg)` (el del tema, el mismo de la franja de la barra de estado) y una línea `var(--anc-ring)` debajo.
- Capas: 18, por debajo del menú inferior (20), el reproductor y el menú «Saltar a sección» (29), el velo (30) y las hojas (31). La franja sólida de la barra de estado (19) queda arriba de la tira sin tocarla: están una encima de la otra, no se cruzan.
- Salto: `.secC3` usa `scroll-margin-top: calc(var(--safe-top) + var(--tira-alto) + 0.625rem)`; `--tira-alto` (44 px + 1 rem) se define en `partes.module.css`. La cabecera de la sección queda justo debajo de la tira.
- La parte activa se mantiene visible dentro de la tira: `TiraPartes` corre solo su fila (`scrollTo` horizontal, nunca `scrollIntoView`), con `corrimientoParaVer`.
- Globo con el nombre: encima de los círculos como en la maqueta; con la tira pegada arriba (no hay sitio, queda la barra de estado) va **debajo** (`globoVaAbajo`, clase `tipAbajo`).
- La barra de arriba (volver, saltar, tono, adjuntos, ajustes) **sigue desplazándose**: no se tocó.

## Pruebas
- `tests/portal/lectura-tira-fija.test.js` (11) y `tests/mutaciones/lectura-tira-fija.json` (15 mutaciones, todas detectadas).
- `tests/e2e-menus/lectura-tira-fija.js`, en Chrome real, con zona segura emulada de 47 px (muesca), a 390 y 360 px, claro y oscuro, en los modos Ambos, Acordes, Letras y Ambos con vista compacta: 69 comprobaciones por combinación, 0 fallas.
  Uso: `BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones.sh tests/e2e-menus/lectura-tira-fija.js <carpeta>`.
  - (a) con scrollY de 600 px hasta el final, el borde de la tira está a 47 px (la zona segura) y nada la cubre (tres puntos de la tira, `elementFromPoint`); ningún elemento fijo se pisa con ella; la pantalla no se desliza de lado.
  - (b) al tocar cada una de las 10 partes, la cabecera de su sección queda visible, debajo de la tira, y la parte tocada queda activa.
  - (c) al desplazarse, la activa sigue a la lectura y su círculo se ve entero dentro de la tira.
  - (d) cero escrituras nuevas; solo el `POST /api/portal/visita` que la lectura ya enviaba.

## Avisos (no cambian lo que ya existía)
- **Secciones cortas** (Interludio, Instrumental): tras tocarlas, la activa pasa a la siguiente cuando termina el bloqueo del salto, porque la regla existente es «la última sección cuyo borde pasó el 30 % de la pantalla». Con la tira fija, la línea de lectura natural es justo debajo de ella. Propuesta aparte, esperando OK.
- **Final de la página:** las últimas secciones no pueden subir hasta la tira porque se acaba la página; es igual desde antes.
- El globo, con la tira pegada arriba, cubre unos píxeles del texto durante 2 s (no recibe toques).

## Capturas
`capturas/`: `fija-arriba`, `fija-tras-salto`, `fija-globo`, `fija-acordes`, `fija-letras`, `fija-compacta`, a 390 y 360 px, claro y oscuro. `comparativas/`: maqueta «Partes» (estática, oscura) a la izquierda y la captura a la derecha. La maqueta no puede mostrar la tira pegándose; para eso están las capturas tras desplazarse.
