# Corrección: «Archivar» y «Eliminar» de la ficha ya no salen a la lista antes de terminar

Rama `fix-ficha-eliminar-archivar` (desde `dev` en `d26f881`), commit propio. Es el hallazgo que quedó anotado en el paso 5.

## Qué pasaba
En la ficha de una canción (menú de escritorio y hoja de teléfono), «Archivar» y «Eliminar» llamaban a `archiveSong` / `deleteSong` **sin esperar** y volvían a la lista al instante. Si cancelabas la pregunta de «Eliminar», la canción no se borraba pero ya estabas en la lista.

## Cómo queda
- `deleteSong` devuelve `false` si se cancela la pregunta (sin tocar la base), y `true` solo si borró sin error. Borra **solo esa canción** (por su id) y solo después de la respuesta afirmativa.
- `archiveSong` sigue escribiendo **solo `archived_at`** de esa canción y devuelve `true` solo si no hubo error.
- La ficha cierra el menú, **espera** el resultado y vuelve a la lista **solo si salió bien**. Cancelar «Eliminar», o un error al escribir, deja la ficha abierta (sin mensaje nuevo: no se agregó ninguna acción ni texto; el error ya se ignoraba en silencio antes).
- El menú de cada fila de la lista de canciones no cambia (no hay ficha a la que volver).
- El arreglo vale igual en teléfono (hoja) y en escritorio (menú flotante): era el mismo código.

## Pruebas
- `tests/portal/ficha-eliminar-archivar.test.js` (4) y `tests/mutaciones/ficha-eliminar-archivar.json` (11 mutaciones, todas detectadas).
- `tests/e2e-menus/ficha-menu.js` ampliado (28 comprobaciones a 390 y 360 px, claro y oscuro; 4 a 1280): cancelar «Eliminar» deja la ficha abierta sin escribir nada; confirmar borra solo esa canción y vuelve a la lista; con la escritura lenta (0,9 s), «Archivar» sigue en la ficha hasta que la escritura termina y entonces vuelve; si la escritura falla, se queda. En escritorio la pregunta es la ventana nativa del navegador: la prueba la contesta desde la página.
- Pruebas antiguas ajustadas a propósito: `ficha-admin-ui.test.js` (el menú es el de `main` salvo estas dos acciones) y `admin-movil-ficha-menu.test.js` (el código de las dos acciones).
- Regresión en navegador: ficha con golden (sin cambios), paso 2, paso 3, Adjuntos y «Nueva canción» A.
