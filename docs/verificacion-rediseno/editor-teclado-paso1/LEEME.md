# Editor móvil frente al teclado · paso 1: anclar el editor a la zona visible

Rama `fix-teclado-editor`. Problema visto por Claudia en iPhone (Safari, modo Texto, canción guardada): el panel «+ Verso … ♪ Acordes» flotaba a media pantalla, el cuadro de texto quedaba en una franja y asomaba la ficha por detrás.
No era una regresión: existe igual en `main` (`cec007a`) desde el editor v2 (`4e73ca8`). Medido con los mismos números en `main`, `pre-nueva-cancion-dev-2026-11-11`, `pre-estructura-s0-dev-2026-11-12` y `dev`.

## Causas (medidas a 390 × 664 con teclado de 302 px)
- **A · no cabe:** la capa se limitaba a 350 px y cabecera (103) + herramientas (114) + panel (146) suman 363: al texto le quedaban 24 px. Lo corrige el paso 2.
- **B · el desplazamiento de Safari no se compensaba:** la capa es `position:fixed; inset:0`; el gancho de las hojas solo sube `bottom`. Si Safari desplaza la vista (`visualViewport.offsetTop`), la capa queda anclada arriba, fuera de la pantalla, y su borde de abajo a media pantalla. Con 200 px de desplazamiento el cálculo creía que ya no había teclado. **Lo corrige este paso.**

## Qué cambia
- `lib/tecladoHoja.ts`: `ajusteDePantalla` (nuevo). Hay teclado si el viewport visible es más de 120 px más bajo que el de diseño, esté o no desplazada la vista. Devuelve `arriba` (acotado) y `alto`.
- `components/useTecladoHoja.ts`: `useTecladoPantalla` (nuevo). Pone `top` = desplazamiento, `height` = alto visible, `bottom:auto`, `--alto-visible` y `data-teclado`. Sigue `resize` y `scroll` del visualViewport. Al cerrar el teclado lo quita todo.
- `EditorCancionMovil.tsx` usa `useTecladoPantalla`. **`useTecladoHoja` y las tres hojas que lo usan (HojaBase, Disponibilidad, Agregar persona) no cambian**: hay una prueba que ejecuta ese gancho y da lo mismo que antes.
- Sirve igual al editor de canción nueva (es el mismo componente).

## Lo que este paso todavía no arregla
Con zona segura de 47 px (app instalada) el panel se sale 25 px por debajo del teclado, igual que antes: es la causa A. En Safari (zona 0) cabe.

## Pruebas
- `tests/portal/teclado-pantalla.test.js` (8): el cálculo con y sin desplazamiento de Safari (0, 120, 200), barra de direcciones (umbral), zoom de dedos, valores raros; los DOS ganchos ejecutados con un viewport simulado. `tests/mutaciones/teclado-pantalla.json` (19, todas detectadas).
- Navegador real (CDP) con teclado emulado: `tests/e2e-menus/editor-teclado.js`, 390 y 360 px, claro y oscuro, desplazamientos 0, 120 y 200, zona segura 47 y 0 (24 comprobaciones por combinación). Capturas aquí (recortadas a la zona visible).
- Regresión: `tests/e2e-menus/correr-regresion-editor-teclado.sh`.
- Límite: Chrome de escritorio no tiene teclado; se sustituye `visualViewport`. Cuánto desplaza Safari de verdad se comprueba en el iPhone.
