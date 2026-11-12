# Admin móvil · paso 2: ficha de la canción, cabecera y bloque de título

Rama `admin-movil-diseno`, commit propio, después del paso 1 (marcadores de espera, ya en `dev` en `cf09fde`). Tablero: **Canción · Móvil · Detalle** del canvas. Solo presentación y solo en **teléfono** (≤ 768 px): mismas acciones, mismas rutas, misma lógica. **El escritorio no cambia** (el HTML del panel y de la barra a 1280 px es idéntico al golden).

## Qué se ve (teléfono)
- **Arriba:** «‹ Canciones» a la izquierda; «✎ Editar» a la derecha (color de acento del modo) y, a su lado, el menú «⋯» de siempre (Editar, Archivar, Eliminar), sin cambios. Los tres miden 44 px o más.
- **Bloque de título:** portada de 96 (de diseño), título como el único `h1` (24/700), artista y pastillas «Tono G», «72 bpm» y el compás si lo hay. Lo que la canción no tiene no se muestra. Sin carátula: un cuadro neutro con una nota musical (solo tokens; no se inventa ninguna imagen ni degradado).
- **«Letra y acordes»** (13/600, gris) sobre la hoja, solo si hay hoja con acordes o letra. En una canción sin letra no aparece (el estado vacío no tiene tablero todavía).
- La **hoja** (letra o acordes) ya no repite el título: se oculta por CSS dentro de la ficha del teléfono (`.anc-fichaHoja .anc-sTitle`). `LyricSheet`, `HojaAcordes` y `FichaConAcordes` **no se tocaron** (siguen igual que en el paso 1), así que la lectura del músico no cambia.
- La barra de botones pierde «Editar» **solo en teléfono** (ahora está en la cabecera): quedan Tipografía, «Editar con acordes» y Adjuntos donde estaban; sus pasos vienen después.

## Lo que NO se hizo (a propósito)
- **«Agregar a servicio», «Transponer» y «Usada N veces / Última vez»**: el tablero los trae, pero no son funciones que existan; se dibuja sin ellos. Quedan anotados como ideas futuras en `docs/PENDIENTES-code.md` («Ficha del admin en teléfono: ideas futuras…»).
- Estado vacío, aviso de «Borrador» con «Publicar» y menú «⋯» como hoja: esperan sus tableros (pasos 3 y 5).

## Golden de la ficha (regenerado) y su diff
`tests/e2e-menus/golden/` guarda el HTML de la ficha sin acordes. Con este paso cambia **solo el de 390 px**; el de 1280 px queda byte a byte igual.

```
barra-botones__390.html     −  <button class="anc-btn anc-btn--quiet">Editar</button>
panel-sin-acordes__390.html    <div class="anc-panel" …>  →  <div class="anc-panel anc-fichaHoja" …>
barra-botones__1280.html, panel-sin-acordes__1280.html   (sin cambios)
```

## Cambios de código
`components/canciones/FichaCabeceraMovil.tsx` (nuevo), `CancionesPanel.tsx` (cabecera según pantalla; `menuDetalle` compartido; «Editar» fuera de la barra solo en teléfono; título de sección; clase `anc-fichaHoja`), `app/songs-movil.css` (reglas dentro de la consulta de teléfono, solo tokens), `lib/textos/cancionesAdmin.ts` (textos). Los comentarios JSX van en su propia línea: en la misma línea crearían nodos de espacio y cambiarían el HTML del escritorio.

## Pruebas
- `tests/portal/admin-movil-ficha-cabecera.test.js` (11) y `tests/mutaciones/admin-movil-ficha-cabecera.json` (24 mutaciones, todas detectadas).
- `tests/e2e-menus/ficha-cabecera.js` (+ `correr-ficha-cabecera.sh`), en Chrome real: 390 y 360 px en claro y oscuro (20 comprobaciones cada una) y 1280 px (6, escritorio sin cambios). Mide la cabecera (≥ 44), el título (24 × `--esc`), la portada (96 × `--esc`), las pastillas, que el título se vea una sola vez, que «Editar» abra la edición de esa canción y «Canciones» vuelva a la lista sin escribir nada, el menú «⋯», la hoja con acordes, el estado vacío sin «Letra y acordes», que no aparezcan las tres funciones inexistentes y que no haya desplazamiento lateral.
- Pruebas antiguas ajustadas a propósito: `ficha-admin-ui.test.js` (la barra de main con «Editar» solo en escritorio; el menú movido a `menuDetalle`, solo cambió la sangría).
- Capturas en esta carpeta (`ficha-con-letra`, `ficha-con-hoja`, `ficha-sin-letra`, `ficha-menu`, a 390 y 360, claro y oscuro; y 1280 claro).
- Regresión: ver el informe (ficha con golden, marcadores del paso 1, adjuntos, lectura, «Nueva canción» A–D).
