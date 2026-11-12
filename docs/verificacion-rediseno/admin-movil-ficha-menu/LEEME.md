# Admin móvil · paso 5: ficha de la canción, menú «⋯» como hoja

Rama `admin-movil-diseno`, commit propio, después del paso 3 (ya en `dev` en `dd4bec3`). Tablero: **Ficha admin · Menú ⋯ como hoja** del canvas. Solo presentación y solo en **teléfono** (≤ 768 px): mismas acciones y rutas de hoy, ninguna acción nueva. **El escritorio no cambia** (sigue el menú flotante de siempre: Editar, Archivar, Eliminar).

## Qué se ve (teléfono)
El «⋯» de la cabecera (círculo de 44 px) abre una **hoja desde abajo**: velo al 60 %, la ✕ a la izquierda, el nombre de la canción al centro y tres filas de 54 de diseño (mínimo 44 px): **«Editar datos»**, **«Archivar»** y **«Eliminar canción»** (en rojo, con el token de peligro).
- **«Editar datos»** = la acción de editar que ya existe: cierra la hoja y abre la edición de esa canción.
- **«Archivar»** = `archiveSong` y vuelta a la lista (solo escribe `archived_at` de esa canción).
- **«Eliminar canción»** = `deleteSong`, que **pregunta antes** («¿Eliminar esta canción? Esta acción no se puede deshacer.»); cancelar no borra nada; confirmar borra solo esa canción.
- Cierran la hoja: la ✕, tocar el fondo y Escape. El foco entra en la ✕, Tab y Mayús+Tab no salen de la hoja, la página de atrás no se desplaza y al cerrar el foco vuelve al «⋯». El «⋯» avisa `aria-haspopup="dialog"` y `aria-expanded`.

## Un hallazgo que NO cambié (anterior a este paso)
En el código de siempre, «Eliminar» (y «Archivar») vuelven a la lista **antes** de que termine la pregunta: si cancelas la pregunta de «Eliminar», la canción no se borra pero ya estás en la lista, no en la ficha. La hoja conserva ese comportamiento tal cual (pediste solo presentación). Si lo quieres corregir (volver a la lista solo si se elimina), es un cambio de una línea en `deleteSong`/su llamada, aparte.

## Decisiones y límites
- La hoja es un componente propio (`FichaMenuHoja`), con el aspecto del tablero (✕ a la izquierda, título centrado, sin asa), no la `HojaBase` de «Más» (que lleva la ✕ a la derecha y el gesto «atrás» del teléfono). Por eso, a diferencia de `HojaBase`, **el gesto «atrás» del teléfono no cierra esta hoja** (cierra la ficha como antes). Si quieres ese gesto, se agrega la misma entrada de historial que usa `HojaBase`.
- `MenuFlotante` y su CSS no se tocaron; el menú de cada fila de la lista de canciones (`⋯` de la lista) tampoco: sigue siendo el menú flotante.

## Golden de la ficha
Este paso **no cambia** el HTML guardado en `tests/e2e-menus/golden/` (panel y barra de botones de la ficha): diff vacío, 390 y 1280 idénticos en las 4 combinaciones.

## Cambios de código
`components/canciones/FichaMenuHoja.tsx` y `ficha-menu-hoja.module.css` (nuevos, solo tokens y rem), `CancionesPanel.tsx` (el botón «⋯» de teléfono y la hoja; el menú flotante queda solo para escritorio), `lib/textos/cancionesAdmin.ts` (textos). Pruebas antiguas ajustadas a propósito: `admin-movil-ficha-cabecera.test.js` (la cabecera del teléfono lleva el botón, no el menú) y `ficha-cabecera.js` (las tres acciones de la hoja).

## Pruebas
- `tests/portal/admin-movil-ficha-menu.test.js` (7) y `tests/mutaciones/admin-movil-ficha-menu.json` (26 mutaciones, todas detectadas; una equivalente —un `aria-label` en un ícono que ya está oculto— se retiró). Las de los pasos 1 a 3 siguen todas detectadas.
- `tests/e2e-menus/ficha-menu.js` (+ `correr-ficha-menu.sh`), Chrome real: 390 y 360 px en claro y oscuro (23 comprobaciones cada una) y 1280 px (2, escritorio sin cambios). Mide la hoja (velo, pegada abajo, esquinas, ✕, título centrado, filas ≥ 44, color de peligro), el foco, Tab, Escape, ✕, fondo, tocar dentro, y cada acción con sus escrituras (editar, archivar, eliminar con cancelar y con confirmar).
- Regresión: ficha con golden, pasos 1, 2 y 3, Adjuntos, lectura C3a y «Nueva canción» A–D (ver el informe).
- Capturas: `ficha-menu` y `ficha-eliminar-pregunta` a 390 y 360, claro y oscuro; `ficha-menu-escritorio` a 1280.
