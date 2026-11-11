# Adjuntos en su propia pantalla («Adjuntos – <canción>»)

Rama `nueva-cancion-flujo`, commit aparte del paso A. No cambia dónde ni cómo se guardan los archivos, ni permisos, ni esquema.

## Estado de antes
- **Músico (lectura con acordes):** el clip solo aparecía si había archivos y NO abría nada: desplazaba la página hasta la sección «Adjuntos» del final (entre la letra y el audio). Sin archivos, no había nada ni estado vacío.
- **Músico (pantalla de letra):** sin clip; la sección de abajo era el único acceso.
- **Administración:** el botón «Adjuntos · N» abría una ventana centrada sin flecha de volver; además había un bloque fijo «Adjuntos» al final de la ficha (con la lista y la subida) que también era quien cargaba el conteo.

## Qué cambia
- Un componente de pantalla compartido, `components/adjuntos/PantallaAdjuntos.tsx`: flecha de volver (44 px), título «Adjuntos – <canción>», cuerpo con la lista y el estado vacío (`AdjuntosVacio`). Teléfono: pantalla completa; escritorio y tableta: panel centrado.
- **Músico:** el clip de la lectura SIEMPRE se ve y abre la pantalla; la pantalla de letra trae un botón compacto «Adjuntos · N» arriba. La sección de abajo desaparece. Sin archivos: «Aún no hay archivos» (sin «Sube archivos para comenzar», porque el músico no sube).
- **Administración:** el botón «Adjuntos · N» abre la MISMA pantalla con la lista y la subida de siempre (`AttachmentsList`, sin cambios); se quita el bloque fijo de abajo. Sin archivos: «Aún no hay archivos» y «Sube archivos para comenzar». El texto de la zona de arrastrar es siempre «Arrastra archivos aquí».
- **Conteo:** como el bloque de abajo ya no está, el conteo del botón se lee con una consulta de SOLO conteo (`select('id', { count: 'exact', head: true })` sobre `song_attachments`, mismo cliente, mismos permisos) y se vuelve a leer al cambiar de canción y tras cada subida o borrado.
- **Capas:** 27 por defecto (sobre el menú inferior, 20, y bajo el visor de PDF, 28, para que «Ver» abra por encima); en la ficha del administrador, 52 (la de la ventana de antes) para quedar sobre su barra superior; el menú de cada fila sigue en 53.
- «Nueva canción»: la ventana «Datos» no lleva adjuntos; se suben desde el botón «Adjuntos · N» de la ficha una vez creada.

## Pruebas que se actualizaron a propósito (comportamiento que cambia)
- `lectura-c3a.test.js` y `tests/e2e-menus/lectura-c3a.js`: el clip siempre está y abre una pantalla (antes: solo con archivos y bajaba a una sección).
- `canciones-movil.test.js`: la ventana «Adjuntos» de antes (`anc-adjModal`…) ya no existe. Quedaron sin usar las reglas `.anc-adjVentana`, `.anc-adjTitulo` y `.anc-adjCerrar` de `app/songs-movil.css`: se dejaron para no mezclar una limpieza de CSS en este commit.
- `ficha-admin-ui.test.js`: la comparación con main del bloque de botones sigue exigiendo que Tipografía, Editar y Editar con acordes sean idénticos; Adjuntos conserva su acción y su texto, que ahora sale de `TEXTOS_ADJUNTOS`.
- `tests/portal/editor-movil.test.js` (paso A): `setEditorAcordes(` aparece 4 veces.

## Golden
`tests/e2e-menus/golden/*` (panel sin acordes y barra de botones, a 390 y 1280) se regeneraron con `BASELINE=1` y quedaron **idénticos byte a byte**: ninguno de los dos recortes incluía el bloque de abajo, y el botón dice lo mismo.

## Pruebas
- `tests/portal/adjuntos-pantalla.test.js` (7) y `tests/mutaciones/adjuntos-pantalla.json` (26 mutaciones, todas detectadas).
- `tests/e2e-menus/adjuntos-pantalla.js`, en Chrome real, 390 y 360 px, claro y oscuro: 27 comprobaciones por combinación, 0 fallas (servidor simulado en la página; cero escrituras en administración).
- Repetidas: `lectura-c3a.js` (37 por combinación) y `lectura-tira-fija.js` (69 por combinación, los mismos 4 avisos conocidos), `ficha-admin-acordes.js` en 390 y 1280.

## Límites
- «Ver» (visor de PDF) y la subida real no se ejercitaron con archivos reales: el servidor está simulado. El visor no se tocó.
- El Escape no cierra la pantalla (sin teclado físico en teléfono); en escritorio se cierra con la flecha o tocando fuera.
