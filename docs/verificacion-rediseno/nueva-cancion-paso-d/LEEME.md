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

## ⚠ Hallazgo para tu decisión (no lo cambié)
La lectura del músico, **cuando una canción tiene arreglo, muestra SOLO las secciones que están en él** (`armarHojaAcordes`: sin arreglo usa todas las secciones en orden; con arreglo usa únicamente las entradas del arreglo). Por eso este paso escribe el arreglo con todas las secciones y solo si hay alguna repetición. Pero: si después se **agrega una sección a una canción que ya tiene arreglo** (por ejemplo, reabrir en el editor de siempre una canción creada con «Repetir» y agregar un Puente), esa sección **no aparece para los músicos**, porque la regla acordada es que el servidor nunca modifica un arreglo existente. Ya pasa hoy con la canción que tiene arreglo propio.
Opciones, sin hacer nada todavía: (a) que el servidor, al guardar, **agregue al final** del arreglo las secciones nuevas que no estén (sin tocar las entradas existentes); (b) que la lectura muestre las secciones que no están en el arreglo, al final; (c) dejarlo así y avisarlo en el editor. Dime cuál prefieres.

## Corrección de un defecto del paso C (encontrado por la prueba de este paso)
En modo Acordes, al tocar una parte del final del texto (que no puede llegar arriba porque se acaba el texto), el desplazamiento la dejaba «no activa» y el segundo toque ya no abría el menú. Ahora, si el cuerpo está al **final** del desplazamiento, manda la última parte tocada en la tira; en cuanto la persona se aleja del final, vuelve la regla de siempre (sin reloj). Es un cambio de comportamiento del paso C ya presente en `dev`; no cambia nada más.

## Pruebas
- `tests/portal/nueva-cancion-paso-d.test.js` (19) y `tests/mutaciones/nueva-cancion-paso-d.json` (40 mutaciones, todas detectadas; una mutación equivalente se retiró: con índices únicos menores que 40 el tope de 40 entradas es solo una salida temprana).
- `tests/e2e-menus/nueva-cancion-paso-d.js`, en Chrome real, 390 y 360 px, claro y oscuro: 33 comprobaciones por combinación, 0 fallas (servidor simulado en la página; datos inventados; en toda la prueba dos inserts de canción y las peticiones de guardado). Cubre: el menú (círculo, nombre, «Parte 2 de 2»), el contador 1–9 y sus topes, los tres botones apagados, ≥ 44 px, la insignia, que se conserve al reabrir/agregar/escribir, el toque largo, el modo Acordes, `arreglo` por índice en el guardado, sin `arreglo` con todo en ×1, y el caso 5b (apagado, ×1, aviso, sin `arreglo`).
- Repetidas: pasos A, B y C, adjuntos, editores (`editor-instrumental-tag`, `editor-v2-texto`, `editor-v2-carril`, `editor-acordes-comportamiento`), lectura con acordes y tira fija.

## Límites
- El simulador no ejecuta el guardado real ni la base: el `update` con `.is('default_arrangement', null)` se prueba contra una base en memoria que emula ese filtro; **no se ejecutó contra Supabase** (no consulto ni modifico la base). Conviene probarlo en el preview de `dev` con una canción «ZZ… (borrar)» cuando lo apruebes.
- «Renombrar», «Mover» y «Eliminar parte» no hacen nada todavía (apagados).
