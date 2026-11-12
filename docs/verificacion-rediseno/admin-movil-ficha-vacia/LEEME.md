# Admin móvil · paso 3: ficha de la canción, aviso de «Borrador» y estado vacío

Rama `admin-movil-diseno`, commit propio, después del paso 2 (ya en `dev` en `b5478d0`). Tablero: **Ficha admin · Borrador y estado vacío** del canvas. Solo presentación y solo en **teléfono** (≤ 768 px): mismas acciones y rutas de hoy. **El escritorio no cambia.**

## Qué se ve (teléfono)
- **Aviso de «Borrador»** (justo bajo el título, antes de la barra de botones): ícono de aviso, «Borrador», «Los músicos aún no la ven.» y, para quien administra, «Publicar» (azul, 44 px). «Publicar» hace lo de siempre (`publicarBorrador`: solo escribe `publicada: true`); si falla, el error sale debajo y el botón queda disponible para reintentar. El escritorio conserva su aviso y su texto largo («Borrador: los músicos aún no la ven y no se ofrece en los setlists.») donde estaba.
- **Estado vacío** (sin letra ni hoja con acordes, cuando la ruta ya respondió): ícono, «Esta canción todavía no tiene letra», «Escribe la letra con sus acordes, o sube un archivo para que los músicos la vean.», **«Agregar letra»** (la acción de siempre: la edición de esa canción) y **«Subir archivos»** (abre la pantalla de Adjuntos, la misma del botón «Adjuntos»). Los dos botones, solo para quien administra, como antes. Ya no hay dos textos según haya adjuntos o no: el del tablero es uno.
- **Cabecera y título al medir del tablero nuevo** (que trae medidas distintas a «Canción · Móvil · Detalle»): «Editar» como píldora y «⋯» como círculo (44 px); portada de 76, título 22/800, artista en gris y las pastillas en su propia fila debajo. Se aplica a toda ficha (con letra, con acordes, vacía) para que no cambie de tamaño entre estados.

## Decisiones y límites (para tu revisión)
- La **barra de botones** (Tipografía, «Editar con acordes», Adjuntos) **sigue** también en el estado vacío, aunque el tablero no la dibuja: «Editar con acordes» no tiene equivalente en el tablero y ocultarla dejaría sin camino el editor de acordes para una canción sin letra. Es una línea de CSS/JSX ocultarla si prefieres el tablero al pie de la letra. Su rediseño es del paso 4.
- «Agregar letra» conserva su acción de hoy (la edición con el cuadro de letra), no el editor de acordes, porque pediste no agregar acciones.
- En el estado vacío del teléfono ya no se dibujan los créditos ni el CCLI/copyright que `LyricSheet` mostraba bajo el vacío (el tablero no los trae); siguen en el formulario de edición. `LyricSheet` no se tocó.

## Golden de la ficha
`tests/e2e-menus/golden/` guarda el HTML de la ficha (panel y barra de botones) de una canción con letra: **este paso no lo cambia** (diff vacío; 390 y 1280 siguen idénticos, comprobado en las 4 combinaciones). Lo nuevo (aviso y vacío) vive en `[data-ficha=borrador]` y `[data-ficha=vacia]`, fuera de ese panel; su marcado lo fijan las pruebas unitarias.

## Cambios de código
`components/canciones/FichaBorrador.tsx` y `FichaVacia.tsx` (nuevos), `FichaCabeceraMovil.tsx` (pastillas fuera de la fila del título), `CancionesPanel.tsx` (aviso según pantalla; el vacío entre el marcador y `LyricSheet`), `app/songs-movil.css` (dentro de la consulta de teléfono, solo tokens), `lib/textos/cancionesAdmin.ts` (textos del teléfono). Pruebas antiguas ajustadas a propósito: el orden de la ficha (paso 1), las medidas del título (paso 2: 76 y 22/800), `ficha-cabecera.js` (el vacío ahora es el nuevo) y `nueva-cancion-paso-a.js` (el aviso del borrador en teléfono dice «Los músicos aún no la ven.»).

## Pruebas
- `tests/portal/admin-movil-ficha-vacia.test.js` (8) y `tests/mutaciones/admin-movil-ficha-vacia.json` (26 mutaciones, todas detectadas; las del paso 2 siguen 24/24).
- `tests/e2e-menus/ficha-vacia.js` (+ `correr-ficha-vacia.sh`), Chrome real, 390 y 360 px en claro y oscuro (14 comprobaciones cada una) y 1280 px (4, escritorio sin cambios).
- Regresión en navegador: ficha con golden, paso 2, marcadores del paso 1 (20 combinaciones), Adjuntos, lectura C3a y «Nueva canción» A–D.
- Capturas en esta carpeta: `ficha-vacia`, `ficha-borrador`, `ficha-borrador-error` a 390 y 360, claro y oscuro.
