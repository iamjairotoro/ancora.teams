# Estructura de «Nueva canción» · S6-B: «Renombrar»

Rama `estructura-ui`. Sin boceto nuevo (se reutiliza la hoja de tipos de «Parte nueva»). Solo el editor de una canción NUEVA en teléfono.

## Qué hace
- En el menú del círculo, «Renombrar» abre la hoja «Renombrar parte»: los ocho tipos, con el nombre que recibiría ESTA parte («Verso 2» si ya hay un verso 1, «Coro», «Puente»…; sin la numeración de «Parte nueva»).
- Elegir un tipo cambia el encabezado de esa sección en el texto con la numeración de siempre (`cambiarTipoSeccion`: conserva lo que haya entre paréntesis, p. ej. «CORO (2x):» → «VERSO 3 (2x):») y **remapea** la estructura: cada referencia mantiene su lugar aunque cambie la clave de la parte (nombre + lugar entre las de igual nombre). Ejemplo probado: con V1 C C V2 V2, renombrar VERSO 2 a CORO deja V1 C C [coro] [coro] en el mismo orden, con el borde punteado en la segunda aparición de cada coro.
- Elegir el mismo nombre, o cerrar la hoja con la X, no cambia nada. Con arreglo propio sigue apagado (y también en una parte sin encabezado).
- Deshacer y Rehacer restauran el texto Y la estructura (el mismo mecanismo de «Eliminar sección»).
- Con la numeración de siempre, elegir «Verso» sobre un verso le da el número siguiente al mayor que ya hay («VERSO 1» → «VERSO 3» si existe el 2); la hoja lo muestra antes de elegir. Elegir «Coro» sobre «CORO 2» le quita el número.

## Límites
- Con dos partes de igual nombre, la clave sigue siendo nombre + lugar; renombrar remapea, pero escribir a mano los encabezados en el modo Texto no (sigue la regla de S1: una parte con nombre nuevo escrita a mano entra al final).

## Pruebas
- `tests/portal/estructura-s6b-renombrar.test.js` (8) y `tests/mutaciones/estructura-s6b-renombrar.json` (19, todas detectadas; 1 defensiva equivalente retirada).
- Navegador real (CDP) 390 y 360 px, claro y oscuro: `tests/e2e-menus/estructura-s6b-renombrar.js` (23 por combinación). Capturas aquí.
- Regresión: `tests/e2e-menus/correr-regresion-nueva-cancion.sh`.
