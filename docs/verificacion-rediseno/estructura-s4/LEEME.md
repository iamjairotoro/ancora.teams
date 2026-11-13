# Estructura de «Nueva canción» · S4: hoja «Agregar a la estructura»

Rama `estructura-ui`. Tablero «Nueva canción · 6b». Solo el editor de una canción NUEVA en teléfono.

## Qué cambia
- La hoja del «+» se llama ahora «Agregar a la estructura» y tiene dos grupos:
  - **Volver a usar una parte** («Entra en la estructura sin escribir su letra otra vez.»): las partes que ya existen en el texto. Elegir una agrega UNA aparición al final de la estructura (círculo punteado, queda activo y el cuerpo va a su parte). No crea sección ni escribe nada en el texto.
  - **Parte nueva** («Tiene su propia letra y acordes.»): los ocho tipos de siempre; la parte nueva entra al final del texto y de la estructura.
- Con el documento vacío solo sale «Parte nueva».
- Con arreglo propio guardado las partes de «Volver a usar» salen apagadas con el aviso «Esta canción ya tiene un orden propio guardado. Para no pisarlo, la estructura no se puede cambiar aquí.» (texto nuevo, sin la palabra «Repetir», que se retira en S5); «Parte nueva» sigue activa (D2 la agrega al final del arreglo).
- A 60 lugares avisa «La estructura admite hasta 60 lugares.»
- Se fue el consejo «¿El coro se repite con la misma letra?…» (hablaba de «Repetir»); también el texto «Ya tienes V1, Pc…».
- Al guardar, las apariciones seguidas de la misma parte viajan como UNA entrada con `repeat` y las no seguidas como entradas separadas.

## Pruebas
- `tests/portal/estructura-s4-hoja.test.js` (6) y `tests/mutaciones/estructura-s4-hoja.json` (12, todas detectadas).
- Adaptados (cambió la hoja): paso B y D (unitarias y e2e), paso C (e2e); `voz.test.js` (sin la excepción de `consejoRepetir`).
- Navegador real (CDP) 390 y 360 px, claro y oscuro: `tests/e2e-menus/estructura-s4-hoja.js` (21 comprobaciones por combinación). Capturas en esta carpeta.
- Regresión: `tests/e2e-menus/correr-regresion-nueva-cancion.sh`.
