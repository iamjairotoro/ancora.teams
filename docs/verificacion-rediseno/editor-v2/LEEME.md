# Editor móvil v2: capturas de verificación

Tomadas en un navegador real (Chrome por CDP, emulando teléfono) sobre el build del HEAD de la rama `editor-movil-v2`. 390 y 360 px, claro y oscuro: `capturas/<vista>__<ancho>__<tema>.png`.

| Vista | Archivo | Mockup |
|---|---|---|
| Línea activa con un «+» sobre cada palabra | `carril-linea-activa` | v2-Acordes |
| Acorde elegido, ancla y panel fijo | `panel-acorde-elegido` | v2-Acordes |
| Pantalla desplazada: la línea queda entre la barra y el panel | `panel-desplazado` | v2-Acordes |
| Modo Texto con la fila de encabezados | `texto-barra`, `texto-encabezados` | v2-Texto |
| Secciones reconocidas (y «Pre-coro:» como letra) | `acordes-secciones` | — |
| Menú de una sección | `menu-seccion` | — |
| Sección borrada con aviso y Deshacer | `seccion-borrada` | — |
| Línea de acordes con piezas | `interludio-linea` | v2-Interludio |
| Espacio con «Ancho − +» | `interludio-espacio` | v2-Interludio |
| Varias líneas de acordes | `interludio-varias-lineas` | v2-Interludio |

`comparativas/`: mockup a la izquierda, captura final a la derecha (390 px, oscuro). Los mockups están en `docs/mockups/`.
Pruebas que las generan: `tests/e2e-menus/editor-v2-carril.js`, `editor-v2-texto.js`, `editor-v2-interludio.js`.
