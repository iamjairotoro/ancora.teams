# Admin móvil · paso 1: marcadores de espera (adiós al salto «antiguo → nuevo»)

Rama `admin-movil-diseno` (desde `dev` en `4034c3d`), commit propio. Solo presentación: mismas rutas, mismas consultas, mismos manejadores. **El escritorio no cambia**: todos los marcadores se dibujan solo en teléfono (≤ 768 px).

## La causa (medida, no supuesta)
Reproducción en Chrome real a 390 px, caché vacía y red lenta (300 ms de latencia, 150 KB/s), con la API retrasada 0,9 s para que se vea qué se pinta mientras se espera. En todos los casos se pintaba **primero la pantalla antigua como marcador de espera** y, al llegar la respuesta, se cambiaba por la nueva. El tema, la fuente y el CSS tardío **no** intervienen: en claro y oscuro el color y la tipografía ya salían bien desde el primer cuadro.

| Pantalla | Antes: lo que se pintaba mientras se esperaba | Cambio de diseño (CLS) antes → después |
|---|---|---|
| Ficha del admin con hoja de acordes | `LyricSheet` (la tarjeta clara con la letra) ~935 ms, y luego la hoja con acordes | 0,017 → 0,024 (ese valor es el de la lista bajo el arranque; ver nota. Lo que cambia aquí es lo que se ve: ya no aparece la letra antes de la hoja) |
| Lectura del músico | La pantalla antigua «Letra» (con «Adjuntos», «Tipografía» y «Cargando letra…») ~940 ms | 0,128 → 0,055 |
| Editor de Nueva canción | Subtítulo «Editar datos» sin tono y sin sitio para la tira de partes | 0,078 → 0,037 |
| Lista de canciones del admin | «Sin resultados» y «0 en el repertorio» hasta que llegaban las canciones | 0,017 → 0,024 (igual: bajo el arranque; lo que cambia es el contenido, que ya no dice «Sin resultados») |

Nota sobre el 0,017 → 0,024 de la lista: es el instante en que la pantalla de arranque («Verificando acceso…», que cubre todo) deja ver la página. Sube algo porque las filas en gris miden un poco más que el cuadro «Sin resultados»; no es visible bajo el arranque. El CLS de la ficha, la lista y el editor no es el criterio principal: lo es que la pantalla antigua no se pinte, y eso lo comprueban las 20 combinaciones.

## Qué se cambió
- **Ficha** (`useFichaAcordes.ts`, `FichaEsqueleto.tsx`, `CancionesPanel.tsx`): el hook devuelve además `listo` (ya hay respuesta —con hoja, sin hoja o fallida— o la lectura no está activa). En teléfono, mientras no está listo, la ficha dibuja el marcador gris en lugar de `LyricSheet`. Si la ruta falla o no hay hoja, cae a la letra de siempre. Orden: hoja con acordes → marcador (solo teléfono) → letra.
- **Lectura del músico** (`LecturaEsqueleto.tsx`, `CancionPortal.tsx`): en teléfono y esperando, el marco de la lectura en gris: la barra con «volver» (funciona), el título y el artista de la lista, la tira y las hojas en gris. La pantalla «Letra» ya no se dibuja un momento. Escritorio y tableta conservan «Cargando letra…». ⚠ Una canción que solo tiene letra (sin acordes) pasa del marcador gris a la pantalla «Letra» de siempre: es un cambio de gris a la pantalla antigua, no de la nueva a la antigua; esa pantalla sigue como estaba (decisión de C3).
- **Editor de Nueva canción** (`EditorCancionMovil.tsx`): el subtítulo usa el tono de la lista mientras llega la canción (no cambia al llegar) y la tira de partes tiene su sitio reservado. Solo el editor nuevo; el de siempre no cambia.
- **Lista** (`SongList.tsx`, `CancionesPanel.tsx`, `app/admin/page.tsx`): `cargando` (= `dataLoading` de /admin) → en teléfono, cuatro filas en gris y el aviso «Cargando las canciones…» para lectores de pantalla, sin «Sin resultados» ni «0 en el repertorio».
- Estilos: `app/songs-movil.css` (dentro de la consulta de teléfono), `lectura-esqueleto.module.css`, `editor-cancion-movil.module.css`. Solo tokens `--anc-*`. Textos nuevos: `cargandoLista`, `cargandoCancion` (tuteo, sin «toca»).

## Pruebas
- `tests/portal/admin-movil-esqueletos.test.js` (10) y `tests/mutaciones/admin-movil-esqueletos.json` (21 mutaciones, todas detectadas).
- `tests/e2e-menus/esqueletos-carga.js` + `correr-esqueletos.sh`: **la secuencia de cuadros con red lenta**. 5 escenarios × 390 y 360 px × claro y oscuro = 20 combinaciones, 0 fallas. Comprueba que se ve el marcador y que **nunca** se pinta la pantalla antigua: ni una sección de letra (`.anc-lsec`) en la ficha con hoja, ni «Cargando letra… / Adjuntos / Tipografía» en la lectura, ni «Sin resultados / 0 en el repertorio» en la lista, ni un subtítulo distinto en el editor; y que al final está lo nuevo.
- `antes/` (cuadros de la reproducción original, 390 px) y `despues/` (hojas de contacto de las 20 combinaciones: un cuadro justo antes y otro justo después de cada cambio, con su hora).
- Regresión en navegador real: ver el informe (ficha con el golden contra `main`, lectura C3a–C3d, tira fija, adjuntos, editor, «Nueva canción» A–D).

## Límites
- La reproducción usa un servidor simulado en la página (datos inventados) con la API retrasada 0,9 s; con latencias reales los marcadores duran lo que tarde cada respuesta. No se probó contra Supabase ni contra el preview de Vercel.
- Los marcadores son del alto aproximado de una hoja corta: una hoja muy larga crece al llegar (hacia abajo, sin mover lo de arriba).
