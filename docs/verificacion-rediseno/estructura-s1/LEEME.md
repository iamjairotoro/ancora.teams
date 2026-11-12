# Estructura de «Nueva canción» · S1: la lógica pura

`lib/estructuraCancion.ts` (nuevo). **Sin pantalla, sin red, nadie lo usa todavía**: no cambia nada visible ni de comportamiento. Rama `estructura-cancion`.

## Qué hace
- Una **estructura** es la lista, en orden, de referencias a partes (la clave de siempre de la parte: nombre + lugar entre las de igual nombre). La misma parte puede salir varias veces, también no seguidas.
- **Guardado:** las referencias SEGUIDAS a la misma parte se comprimen en UNA entrada `{indice, repeat}` (repeat 1–9; una tanda más larga se parte en otra entrada); las no seguidas son entradas separadas (`aEntradas`). **Al abrir**, `desdeEntradas` expande cada `repeat` en círculos seguidos. Ida y vuelta probada con 300 estructuras al azar (generador fijo).
- La estructura **por defecto** (cada parte una vez y en el orden del texto) no escribe nada (`estructuraParaGuardar` → `undefined`).
- **Texto ↔ estructura** (`sincronizar`): si la estructura era la de por defecto, sigue al texto; si era propia, una parte nueva (escrita a mano en el modo Texto, o renombrada) entra AL FINAL y lo que ya no existe se suelta.
- **Operaciones** (devuelven la estructura nueva o `null`; nunca modifican la recibida): `agregarReferencia` («Volver a usar»; `agregarParteNueva` para «Parte nueva»), `repetirAqui`, `quitarReferencia` (no en la última aparición de una parte), `moverReferencia` ‹ › (no en los bordes ni entre dos referencias de la misma parte), `sinParte` («Eliminar sección»), `parteDeReferencia` (a qué parte salta un círculo).
- Topes: **60 pasos** en total y **9 seguidas** por entrada.

## Pruebas
`tests/portal/estructura-s1-logica.test.js` (15 comprobaciones) y `tests/mutaciones/estructura-s1-logica.json` (18 mutaciones, todas detectadas).

## Límite conocido (heredado de «Repetir ×N»)
La clave de una parte es su nombre más su lugar entre las del mismo nombre. Si se borra o se inserta antes una parte con el mismo nombre (dos «CORO»), las referencias del que queda se re-numeran. «Renombrar» (S6) remapea las claves sin perder el lugar.
