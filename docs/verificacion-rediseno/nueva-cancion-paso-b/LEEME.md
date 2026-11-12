# «Nueva canción» · paso B: el editor para una canción nueva

Rama `nueva-cancion-flujo`, commit propio (después del paso A y de adjuntos, que ya están en `dev`). Solo teléfono y administración. NO está en `dev` ni en `main`.

## Qué hace
- Tras «Crear y escribir la letra» (o «Guardar y escribir la letra» desde los datos) se abre el editor de siempre en su versión de canción nueva (`nueva`, propiedad opcional de `EditorCancionMovil`):
  - Cabecera **‹ Datos · título · «Tono F · 72 bpm · Editar datos» · Guardar** (Guardar apagado mientras no haya nada escrito).
  - Con el documento vacío, la tarjeta **«Empieza por una parte»** con los ocho tipos (círculo de color y el nombre que recibirían); sin barras de herramientas ni cuadro de texto.
  - Al elegir una parte se agrega **al final** del texto y el cursor queda listo para escribir su letra.
  - Con texto aparece el botón **«+ Parte»**, que abre la hoja **«Agregar parte»** («Ya tienes V1, Pc, C y V2. La parte nueva recibe el número siguiente.») con el número que recibiría cada tipo.
- **Numeración** (`nombreSiguiente`, `agregarParte` en `lib/editorAcordes.ts`): el primer verso es «VERSO 1»; los demás tipos no llevan número la primera vez y luego van con el mayor número que ya hay + 1: VERSO 3, CORO 2, PRE CORO 2, INTERLUDIO 2. Códigos con el generador de siempre (V3, C2, INT2…); «PRE CORO 2» da `PC-2` y no se tocó (decisión tuya).
- Si el último encabezado quedó **sin letra** («CORO:» recién agregado), la parte nueva lo reemplaza (un encabezado sin letra no cuenta como sección y, suelto, se volvería una línea de letra). Límite de 40 partes (el de la ruta de guardado).
- **«‹ Datos»**: sale del editor (pregunta «¿Descartar los cambios?» si hay texto sin guardar) y abre la ventana de datos DE ESA CANCIÓN YA CREADA: «Guardar y escribir la letra» o «Solo guardar los datos». Actualiza SOLO los campos de datos (nunca la letra ni `publicada`); no crea otra canción.
- Un **borrador sin letra** abierto con «Editar con acordes» desde su ficha también usa esta versión. Una canción con letra, o ya publicada, abre el editor de siempre.
- **Primer guardado:** no pide el resumen («no hay nada que pisar»); es la misma petición de siempre a `/api/admin/canciones/acordes`, con todas sus protecciones (la ruta y `guardarAcordes.ts` no se tocaron). La canción se publica sola ahí (paso A).

## Lo que NO cambia
- El editor sin `nueva` (canciones ya guardadas): mismas condiciones, mismas peticiones, mismo «Cancelar». Se repitieron en navegador `editor-instrumental-tag` (18 por combinación), `editor-v2-texto` y `editor-v2-carril` (116), `editor-acordes-comportamiento`, y las pruebas unitarias del editor; solo se actualizaron los textos exactos de tres comprobaciones que miraban el código.
- Ni esquema, ni migraciones, ni la ruta de guardado, ni la tira de la lectura (el «+» de la tira es el paso C).
- Quedan para los pasos siguientes: tira de partes en el editor (C), «Repetir ×N» con el campo `arreglo` (D), renombrar/eliminar/mover (E), canciones existentes (F), escritorio (G). «Prefiero pegar la letra completa» sigue fuera (nota en `docs/PENDIENTES-code.md`). El consejo «¿El coro se repite…?» de la maqueta llega con «Repetir» (D).

## Pruebas
- `tests/portal/nueva-cancion-paso-b.test.js` (13) y `tests/mutaciones/nueva-cancion-paso-b.json` (26 mutaciones, todas detectadas).
- `tests/e2e-menus/nueva-cancion-paso-b.js`, en Chrome real, 390 y 360 px, claro y oscuro: 34 comprobaciones por combinación, 0 fallas (servidor simulado en la página; datos inventados; en toda la prueba un insert, un update y una petición de guardado, nada más).
- Repetidas: paso A (31 por combinación y 4 a 1280 px) y adjuntos (27 por combinación).

## Límites
- El simulador no ejecuta el guardado real: se comprueba que se envía UNA petición con el texto y los códigos correctos; la validación de esa petición se prueba con `validarCuerpo` en las pruebas unitarias.
- La numeración se comprobó con documentos armados escribiendo letra bajo cada encabezado, que es como se usa; con encabezados sin letra se aplica la regla del reemplazo.
