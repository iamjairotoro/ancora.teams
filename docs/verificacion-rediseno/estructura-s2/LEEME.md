# Estructura de «Nueva canción» · S2: el servidor

`lib/admin/guardarAcordes.ts` (y dos funciones nuevas en `lib/estructuraCancion.ts`). **Ningún cliente lo usa todavía**: el campo es opcional y la pantalla no lo manda, así que el comportamiento de hoy no cambia. **Sin migraciones, sin tocar la base** (la ruta no cambió: `app/api/admin/canciones/acordes/route.ts`). Rama `estructura-cancion`.

## Qué cambia
- **Cuerpo del POST:** llave opcional `estructura: [{ indice, repeat }]`. El índice es el de la sección en `secciones` y **puede repetirse** (también no seguido). Reglas (campo de error «estructura», solo el campo, nunca el detalle):
  - `indice` entero dentro de las secciones; `repeat` entero de 1 a 9; sin llaves de más;
  - **toda sección aparece al menos una vez**;
  - **tope de 60 pasos** = suma de los `repeat` (y por tanto, como mucho 60 entradas).
  - Sin secciones, solo vale la lista vacía.
- **Qué se escribe** (`armarArreglo`), siempre en el mismo paso 6 y con la misma comprobación **dentro del propio update** (`is null` / igual al valor leído): si otro guardado se adelantó, no pisa nada y el guardado sigue completo.
  - Canción **SIN arreglo propio**: la estructura MANDA sobre `arreglo` (paso D, que queda para clientes viejos y no cambió). El servidor la **compacta** por su cuenta (no se fía del cliente): entradas seguidas a la misma sección se funden en una con `repeat` hasta 9, y una tanda más larga se parte. Se escribe una entrada `{sectionId, label = código de la sección, repeat}` por entrada. Si la estructura es la **de por defecto** (cada sección una vez y en orden), NO se escribe nada y la canción queda sin arreglo propio.
  - Canción **CON arreglo propio**: `estructura` se **ignora** (primera entrega: solo lectura). Rige D2 como hoy (las secciones creadas en este guardado se agregan al final con repeat 1; nada existente se toca ni se reordena).
- **GET:** `cancion.estructuraGuardada` = el arreglo propio como entradas `{ indice de la sección activa, repeat }` en su orden (lo que la pantalla de la estructura mostrará, solo para leer, en una canción con arreglo propio). `null` sin arreglo, con un arreglo raro o que no apunta a ninguna sección; salta las entradas que apuntan a otra cosa o a una sección dada de baja (como la lectura del músico). **La huella (`base`) no cambió.**

## Pruebas
`tests/portal/estructura-s2-servidor.test.js` (12 comprobaciones) y `tests/mutaciones/estructura-s2-servidor.json` (18 mutaciones, todas detectadas; se retiraron 2 por ser equivalentes: el tope de entradas es redundante con el de pasos, y un índice igual al número de secciones ya lo frena «toda sección aparece»). Incluye la ida y vuelta por el servidor (guardar → leer → `estructuraGuardada`), la carrera con otro guardado y las pruebas de D, D2 y del guardado de siempre, que siguen verdes sin tocarlas.
