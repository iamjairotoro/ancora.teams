# Editor móvil: «+ Instrumental» y «+ Tag»

Rama `editor-instrumental-tag`. La fila de botones del encabezado trae ocho: + Verso, + Pre coro, + Coro, + Puente, + Interludio, **+ Instrumental, + Tag**, + Final. Mismo comportamiento que los demás: insertan un encabezado de sección («INSTRUMENTAL:», «TAG:») y, con el cursor sobre un encabezado, le cambian el tipo.

- **Instrumental**: sección de solo acordes como Interludio (trae su «(instrumental)» y admite varias líneas de acordes). Código al guardar: **Inst**.
- **Tag**: sección cantada normal, con letra y acordes sobre las palabras. Código: **Tg**.
- **Interludio** sigue siendo **INT** y **Final** sigue siendo **F** (la tira de lectura lo muestra como «E»). «Ending» y «Outro» se reconocen como Final en el menú de sección (solo visualización).
- **Lo ya guardado no cambia**: una sección guardada como INT (nombre Instrumental) o T (nombre Tag) conserva su código al volver a guardar. El arreglo enlaza las secciones por `sectionId` (no por código ni por etiqueta). Un cambio de código real de una sección del arreglo sigue pidiendo confirmación.

Prueba en navegador real (Chrome por CDP, servidor simulado en la página, datos inventados): `tests/e2e-menus/editor-instrumental-tag.js`, 18 comprobaciones por combinación (390 y 360 px, claro y oscuro).

```bash
scripts/verificacion/construir.sh 3168
BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/editor-instrumental-tag.js docs/verificacion-rediseno/editor-instrumental-tag/capturas
```

| Archivo (`capturas/<vista>__<ancho>__<tema>.png`) | Qué muestra |
|---|---|
| `botones` | la fila de botones, con los ocho (se desliza) |
| `texto-instrumental-tag` | «INSTRUMENTAL:» y «TAG:» insertados en el modo Texto |
| `menu-ocho-tipos` | el menú de sección con los ocho tipos |
| `acordes-instrumental-tag` | una línea de acordes en Instrumental y un acorde en Tag |
