# «Nueva canción» · paso D: menú del círculo con «Repetir ×N» y el campo `arreglo`

Rama `nueva-cancion-flujo`, commit propio (después del paso C, que ya está en `dev` en `b9a332b`). Boceto: tableros «Nueva canción · 5» y «5b» del canvas. Solo en el flujo nuevo (editor de una canción nueva). NO está en `dev` ni en `main`.

## Qué hace
- **El menú del círculo** («Parte»): hoja inferior con la parte (círculo, nombre y «Parte 2 de 4»), **«Repetir»** («Se canta seguido, con la misma letra», con «−», «×N» y «+»), y **Renombrar**, **Mover (más adelante)** y **Eliminar parte**. Los tres últimos aparecen **apagados** hasta el paso E.
- **Cómo se abre** (decisión mía, el boceto no lo dice): un toque en la parte que **ya está activa**, o un **toque largo** en cualquiera. Un toque en otra parte sigue llevando a ella (paso C). En la lectura no cambia nada (el globo con el nombre sigue igual).
- **Repetir**: de ×1 a ×9. «−» apagado en ×1 y «+» apagado en ×9. **No crea otra sección**: el círculo muestra la insignia con el número (la que ya dibuja la tira) y la repetición vive en memoria, por parte, hasta Guardar. Sigue a su parte aunque se agreguen otras o se escriba la letra (clave = nombre + lugar entre las de igual nombre).
- **Guardar** manda `arreglo: [{ indice, repeat }]` (una entrada por parte) **solo si alguna parte se repite**. Con todo en ×1 no se manda nada y la canción queda sin arreglo propio.
- **Con arreglo propio** (tablero 5b): «Repetir» sale apagado, en ×1, con el aviso «Esta canción ya tiene un orden propio guardado. Para no pisarlo, «Repetir» no se puede cambiar aquí.», y el guardado no manda `arreglo`.
- La hoja «Agregar parte» trae ahora el consejo de la maqueta: «¿El coro se repite con la misma letra? No agregues otro: toca su círculo y elige «Repetir».»

## El servidor (`lib/admin/guardarAcordes.ts`; la ruta no se tocó)
- `arreglo` es **opcional** y se valida estricto: lista de hasta 40, cada entrada solo `{indice, repeat}`, índice entero dentro de las secciones y sin repetirse, repetición entera de 1 a 9; cualquier otra cosa → 400 «en arreglo».
- **Solo escribe `default_arrangement` si está vacío, y nunca pisa uno existente.** «Vacío» = `null`: una lista (aunque esté vacía) o cualquier otra cosa cuenta como «ya tiene» y no se toca. La comprobación va **dentro del mismo guardado**: es una operación más del plan (paso 6, la última) cuyo `update` lleva `.is('default_arrangement', null)`, así que si otro guardado escribió un arreglo entre la lectura y este punto, no se pisa (el update no toca ninguna fila y el guardado sigue completo). Un error de verdad detiene el guardado en el paso 6 (la letra y las secciones ya quedaron).
- Escribe **una entrada por sección, en orden y con TODAS las secciones**, enlazadas por sus `sectionId` reales (los de las secciones que se guardan en ese mismo guardado) y con el código como `label`, como los arreglos de siempre.
- **No se escribe si nada se repite** (todo ×1): ver el hallazgo de abajo.
- `GET` devuelve además `arregloPropio` (¿`default_arrangement` distinto de null?) para apagar «Repetir»; no cambia la huella. Sin migraciones ni cambios de esquema; las protecciones de siempre (huella, 409 del arreglo, respaldo, códigos conservados) están intactas.

## D2 — secciones nuevas en una canción que ya tiene arreglo (decisión: opción «a con restricción»)
La lectura del músico, cuando una canción tiene arreglo, muestra SOLO las secciones que están en él. Por eso, **al guardar, si la canción ya tiene un arreglo propio, el servidor agrega AL FINAL de `default_arrangement` solo las secciones creadas en ese mismo guardado (filas nuevas), con `repeat` 1**:
- **No toca ni reordena** las entradas existentes (ni sus repeticiones), y **ignora las repeticiones del cuerpo** (`arreglo`): con arreglo propio no se modifica nada de lo que ya hay.
- **No agrega secciones que ya existían** y no estaban en el arreglo: se omitieron a propósito.
- Sin secciones nuevas en ese guardado no se escribe nada.
- Solo se toca un arreglo que sea una lista con al menos una entrada que apunte a una sección de la canción. Una lista vacía, un valor raro o un arreglo que no apunta a ninguna sección (la lectura usaría entonces todas las secciones) **no se toca**.
- **Sin arreglo (`null`) sigue la regla de D**: solo se escribe si hay repeticiones, con todas las secciones.
- **Mismo mecanismo seguro:** el `update` del arreglo lleva, dentro de sí mismo, la comprobación de que el arreglo sigue como se leyó al empezar el guardado: sin arreglo, `is null`; con arreglo, igual al valor leído (`.eq('default_arrangement', JSON.stringify(leído))`). Si otro guardado se adelantó, el update no toca ninguna fila, no se pisa nada y el guardado sigue como completo. Un error de verdad detiene el guardado en el paso 6.
- Pruebas: `tests/portal/nueva-cancion-paso-d2.test.js` (10) y `tests/mutaciones/nueva-cancion-paso-d2.json` (15 mutaciones, todas detectadas; dos mutaciones equivalentes se retiraron: la comprobación de que alguna entrada apunte a una sección de la canción ya descarta listas vacías o raras). Incluyen: arreglo existente + sección nueva (se agrega al final), arreglo existente + sección ya existente omitida (no se agrega), arreglo null, varias nuevas en orden, lista vacía/rara, que otro guardado se adelante, dos guardados seguidos y fallo del update.
- ⚠ Límite: la comparación del `update` con arreglo existente (`eq` sobre `jsonb` con el valor leído como JSON) **no se ejecutó contra Supabase** (no consulto ni modifico la base); se probó contra una base en memoria que compara por JSON. Si el filtro no se comportara como se espera, el síntoma sería: no se agrega la sección (0 filas, sin error) o el guardado termina con «guardado incompleto» (error en el paso 6). Conviene probarlo en el preview de `dev` con una canción «ZZ… (borrar)» que ya tenga arreglo y una sección nueva.
- Solo servidor (`lib/admin/guardarAcordes.ts`): ningún código de cliente cambió, por eso no se repitió la regresión en navegador; sí `test:portal`, las mutaciones de D y D2 y `verificar.sh`.

## Corrección de un defecto del paso C (encontrado por la prueba de este paso)
En modo Acordes, al tocar una parte del final del texto (que no puede llegar arriba porque se acaba el texto), el desplazamiento la dejaba «no activa» y el segundo toque ya no abría el menú. Ahora, si el cuerpo está al **final** del desplazamiento, manda la última parte tocada en la tira; en cuanto la persona se aleja del final, vuelve la regla de siempre (sin reloj). Es un cambio de comportamiento del paso C ya presente en `dev`; no cambia nada más.

## Pruebas
- `tests/portal/nueva-cancion-paso-d.test.js` (19) y `tests/mutaciones/nueva-cancion-paso-d.json` (40 mutaciones, todas detectadas; una mutación equivalente se retiró: con índices únicos menores que 40 el tope de 40 entradas es solo una salida temprana).
- `tests/e2e-menus/nueva-cancion-paso-d.js`, en Chrome real, 390 y 360 px, claro y oscuro: 33 comprobaciones por combinación, 0 fallas (servidor simulado en la página; datos inventados; en toda la prueba dos inserts de canción y las peticiones de guardado). Cubre: el menú (círculo, nombre, «Parte 2 de 2»), el contador 1–9 y sus topes, los tres botones apagados, ≥ 44 px, la insignia, que se conserve al reabrir/agregar/escribir, el toque largo, el modo Acordes, `arreglo` por índice en el guardado, sin `arreglo` con todo en ×1, y el caso 5b (apagado, ×1, aviso, sin `arreglo`).
- Repetidas: pasos A, B y C, adjuntos, editores (`editor-instrumental-tag`, `editor-v2-texto`, `editor-v2-carril`, `editor-acordes-comportamiento`), lectura con acordes y tira fija.

## Límites
- El simulador no ejecuta el guardado real ni la base: el `update` con `.is('default_arrangement', null)` se prueba contra una base en memoria que emula ese filtro; **no se ejecutó contra Supabase** (no consulto ni modifico la base). Conviene probarlo en el preview de `dev` con una canción «ZZ… (borrar)» cuando lo apruebes.
- «Renombrar», «Mover» y «Eliminar parte» no hacen nada todavía (apagados).
