# «Nueva canción» · paso C: tira de partes con «+» en el editor nuevo

Rama `nueva-cancion-flujo`, commit propio (después del paso B, que ya está en `dev` en `fee3a9a`). Solo en el flujo nuevo (editor de una canción nueva, teléfono, administración). NO está en `dev` ni en `main`.

## Qué hace
- Bajo la cabecera del editor nuevo aparece la **tira de partes**: un círculo por parte del texto (color y abreviatura de la lectura: V1, C, V2, Bd, It, E…) y, al final, el círculo punteado **«+»**, que abre la hoja «Agregar parte» del paso B. Con el documento vacío la tira es solo el «+».
- Cada parte que se agrega aparece **al instante**, aunque todavía no tenga letra, y queda activa.
- **Tocar un círculo lleva a esa parte**:
  - modo **Texto**: el cursor va a su encabezado y el cuadro se desplaza para dejarlo a la vista (se mide con una copia invisible del texto, porque el cuadro parte las líneas largas);
  - modo **Acordes**: esa sección sube a la parte de arriba del cuerpo.
- La **parte activa** sigue al cursor (Texto) o a lo que se ve (Acordes: la última cuya parte de arriba ya llegó a la zona de arriba del cuerpo; al entrar al modo Acordes se recalcula). Tocar la parte ya activa muestra su nombre en un globo (como en la lectura).
- La tira queda **fija** arriba: el texto pasa por debajo; no se mueve al desplazar.
- El botón «+ Parte» del paso B se reemplaza por este «+» (como en la maqueta).

## Lo que NO cambia
- **El editor de una canción que ya existe** no tiene tira ni «+» (`nueva` sigue siendo opcional); se comprueba en navegador y en código.
- **La lectura:** `TiraPartes` recibe una propiedad nueva, `agregar`, opcional; sin ella dibuja lo mismo de siempre. La lectura no la pasa. Se repitieron en navegador la lectura con acordes (C3a) y la tira fija.
- Nada se guarda por la tira: sigue habiendo solo las dos peticiones de siempre del editor. Ni ruta, ni esquema, ni migraciones.
- Repetir ×N (D), renombrar/eliminar/mover (E), canciones existentes (F) y escritorio (G) siguen pendientes; el menú del círculo llega con D. Todavía cada círculo es una parte (`repeat` siempre 1).

## Piezas
- `lib/editorAcordes.ts`: `partesDeDocumento` (una parte por sección, con nombre y dónde empieza; un encabezado sin letra cuenta), `parteDeCaret`, `parteAlcanzada`. Mismo índice que `estructura().secciones` y que el modo Acordes.
- `components/canciones/nueva/posicionTexto.ts`: `desplazamientoHasta` (cuánto desplazar el cuadro de texto para dejar una posición arriba).
- `TiraPartes.tsx` (+ `.circAgregar`, 44 px, punteado) y `EditorCancionMovil.tsx` (tira, `irASeccion`, parte activa).

## Pruebas
- `tests/portal/nueva-cancion-paso-c.test.js` (9) y `tests/mutaciones/nueva-cancion-paso-c.json` (24 mutaciones, todas detectadas).
- `tests/e2e-menus/nueva-cancion-paso-c.js`, en Chrome real, 390 y 360 px, claro y oscuro: 29 comprobaciones por combinación, 0 fallas (servidor simulado en la página; datos inventados; en toda la prueba un solo insert de canción y una petición de guardado). Cubre: sin tira en una canción existente; «+» solo con el documento vacío (44 px, punteado); V1, C, V2, Bd, It, E con sus colores y 44 × 44 px; la nueva queda activa; la tira no se mueve al desplazar; en Texto, tocar V1/Bd/E pone el cursor en su encabezado y lo deja a la vista; en Acordes, V2 y Bd quedan arriba del cuerpo; la activa sigue al cursor y al desplazamiento; «Coro 2» desde el «+»; Guardar envía una petición con las siete partes.
- Repetidas: paso A (31 por combinación y 4 a 1280), paso B (34; se actualizó para usar el «+» de la tira en vez de «+ Parte»), adjuntos (27), editores (`editor-instrumental-tag` 18, `editor-v2-texto` y `editor-v2-carril` 116, `editor-acordes-comportamiento`), lectura con acordes (C3a, 37) y tira fija (69).

## Límites
- El simulador no ejecuta el guardado real: se comprueba la petición que se enviaría.
- Con 40 partes la tira se desliza de lado; el «+» queda al final (se llega deslizando).
- Un bloque de letra sin encabezado aparece como círculo «·» («Sin nombre»); no se le puede cambiar el nombre todavía (E).
