# Estructura de «Nueva canción» · S6-A: «Eliminar sección»

Rama `estructura-ui`. Solo el editor de una canción NUEVA en teléfono.

## Qué hace
- En el menú del círculo, «Eliminar sección» ya está activa (roja). Abre el diálogo, sin borrar de una:
  - Título: «¿Eliminar «CORO»?» (el nombre como sale en el menú).
  - Cuerpo: «Se borra su letra y sus acordes, y sus 3 apariciones en la estructura.» (con una aparición: «y su única aparición en la estructura.») + «Puedes deshacerlo antes de guardar.»
  - Botones: «Eliminar» (rojo, texto blanco) y «Cancelar».
- Cancelar no cambia nada. Eliminar borra del texto la sección (encabezado, letra y acordes) y TODAS sus referencias de la estructura; las demás siguen en su lugar, también cuando hay dos partes con el mismo nombre (se remapean las claves: borrar el primer «CORO» no confunde las referencias del segundo).
- «Puedes deshacerlo antes de guardar» es cierto porque el editor tiene Deshacer/Rehacer y ahora también restauran la estructura: cada eliminación guarda la estructura de antes y de después y se restaura al cruzar ese cambio del historial.
- Con arreglo propio sigue apagada. «Quitar de la estructura» en la última aparición sigue apagado.

## Límites
- El otro camino para borrar una sección (tocar su nombre en el modo Acordes → «Eliminar sección») no pide confirmar ni remapea la estructura: es el de siempre y no se tocó. Con partes de nombre repetido podría mover referencias; anotado en PENDIENTES.

## Pruebas
- `tests/portal/estructura-s6a-eliminar.test.js` (9) y `tests/mutaciones/estructura-s6a-eliminar.json` (22, todas detectadas; 1 equivalente retirada).
- Navegador real (CDP) 390 y 360 px, claro y oscuro: `tests/e2e-menus/estructura-s6a-eliminar.js` (24 por combinación). Capturas aquí.
- Regresión: `tests/e2e-menus/correr-regresion-nueva-cancion.sh`.
