# «Nueva canción» (teléfono) · paso A: ventana «Datos» y «Más datos»

Rama `nueva-cancion-flujo`, commit propio. Solo teléfono y solo administrador: en escritorio «+ Agregar canción» abre el formulario de siempre.

## Qué hace
- «+ Agregar canción» abre la ventana **Datos** (título, artista, tonalidad, BPM, compás, duración) con «Más datos» (título original, autor, traductor, CCLI, copyright, enlaces, notas y carátula) y dos botones: **Crear y escribir la letra** (pide tono; abre el editor de esa canción) y **Solo crear, la escribo después** (tono opcional; vuelve a la lista).
- La canción se crea al pulsar uno de los dos botones, como **borrador** (`publicada = false`), sin letra. Sin adjuntos en esta ventana.
- Se publica sola en el primer guardado del editor que trae letra (mismo `update` de `songs`, paso 4 del plan de `guardarAcordes`). El administrador también puede publicarla desde su ficha («Borrador» → «Publicar»: un update con solo `{publicada:true}`).
- La lista del administrador marca «Borrador».

## Migración (la aplica Claudia, antes de desplegar este código)
`migrations/056-cancion-publicada.sql` (una sentencia) y `056-verificacion.sql`. Con la columna ausente, el código no se rompe: el catálogo, la ficha y la lectura del editor repiten su consulta sin el filtro, y el guardado no escribe `publicada`. Lo único que exige la columna es CREAR un borrador.

## Dónde se filtra `publicada = true`
| Archivo | Qué |
|---|---|
| `app/api/all-songs/route.ts` | catálogo de los músicos: `.eq('publicada', true)` (con repetición sin filtro si la columna no existe) |
| `app/api/portal/cancion/route.ts` | ficha del músico: `.eq('publicada', true)`; un borrador responde «no encontrada» |
| `app/admin/page.tsx` | `servicioProps.songs: soloPublicadas(songs)` → selectores de setlist (`OrdenDelServicio`, `HojaBloqueOrden`, `ServicePanel`) |
| `lib/publicada.ts` | `esBorrador`, `soloPublicadas` |
El panel «Canciones» del administrador NO filtra (recibe todas y marca los borradores). `archived_at` no se tocó (hallazgo en `docs/PENDIENTES-code.md`).

## Pruebas
- `tests/portal/nueva-cancion-paso-a.test.js` (10) y `tests/mutaciones/nueva-cancion-paso-a.json` (32 mutaciones, todas detectadas).
- `tests/e2e-menus/nueva-cancion-paso-a.js`, en Chrome real, 390 y 360 px, claro y oscuro (31 comprobaciones por combinación) y 1280 px (4): campos de 16 px, todo ≥ 44 px, sin desplazamiento lateral, validaciones sin enviar nada, «Solo crear» = un insert en borrador sin abrir el editor, «Crear y escribir» = un insert con todos los datos y abre el editor, «Borrador» en la lista y la ficha, «Publicar» = un update con solo `{publicada:true}`, ninguna otra escritura. El servidor está simulado en la página; datos inventados.
  Uso: `BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/nueva-cancion-paso-a.js <carpeta>` y, para escritorio, `SOLO="1280 light" BASE=… node tests/e2e-menus/nueva-cancion-paso-a.js <carpeta>`.

## Límites
- Las pruebas de los filtros de las rutas leen el código (las rutas necesitan sesión del portal); no se ejecutaron contra una base con la columna.
- El enlace de YouTube de «Más datos» no se comprueba al crear.
