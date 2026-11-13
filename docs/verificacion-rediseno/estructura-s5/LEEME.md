# Estructura de «Nueva canción» · S5: menú del círculo v2

Rama `estructura-ui`. Tablero «Nueva canción · 7». Solo el editor de una canción NUEVA en teléfono.

## Qué cambia
El menú del círculo habla del LUGAR tocado: «Lugar 6 de 9 · aparece 3 veces».
- **Repetir aquí** («Agrega otra aparición justo después»): inserta una copia del lugar justo después; el menú se cierra y la aparición nueva queda activa. A 60 lugares se apaga y dice «La estructura admite hasta 60 lugares.»
- **Mover en la estructura** ‹ ›: intercambia el lugar con su vecina; el menú se queda abierto y sigue al lugar. Se apaga en los bordes y cuando la vecina es la misma parte (no cambiaría nada).
- **Quitar de la estructura** («La letra se queda; solo sale este lugar»): quita ese lugar; el menú se cierra. En la ÚLTIMA aparición de una parte sale apagado con «Es su única aparición. Para sacarla, usa «Eliminar sección»» (texto nuevo).
- **Renombrar** y **Eliminar sección** («Borra la letra y sus 3 apariciones» / «…su única aparición»): visibles pero apagados hasta S6.
- Con arreglo propio guardado, TODO sale apagado con el aviso «Esta canción ya tiene un orden propio guardado. Para no pisarlo, la estructura no se puede cambiar aquí.» (el texto del tablero 5b hablaba de «Repetir», que ya no existe; misma idea, otra frase).
- Ninguna acción toca el texto ni el historial de Deshacer: solo la estructura (en memoria hasta Guardar).
- Se retiró «Repetir ×N» (contador, sus textos, «Mover (más adelante)» y «Eliminar parte»), y con él las ayudas interinas `fijarSeguidas` / `seguidasEn` de S3.

## Pruebas
- `tests/portal/estructura-s5-menu.test.js` (9) y `tests/mutaciones/estructura-s5-menu.json` (24, todas detectadas).
- Se retiraron del paso D las pruebas del menú antiguo y sus mutaciones (el servidor y el campo `arreglo` siguen cubiertos), y el e2e `nueva-cancion-paso-d.js` (lo reemplazan los de S3, S4 y S5).
- Navegador real (CDP) 390 y 360 px, claro y oscuro: `tests/e2e-menus/estructura-s5-menu.js` (37 comprobaciones por combinación). Capturas en esta carpeta.
- Regresión: `tests/e2e-menus/correr-regresion-nueva-cancion.sh`.
