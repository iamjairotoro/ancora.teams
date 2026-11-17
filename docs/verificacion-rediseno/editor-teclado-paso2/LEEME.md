# Editor móvil frente al teclado · paso 2: dar sitio al texto

Rama `fix-teclado-editor`. Sigue al paso 1 (`6914e49`), que ancla el editor a la zona visible. Este paso corrige la causa A: con el teclado abierto la cabecera, las herramientas y el panel no dejaban sitio al texto (24 px).

## Qué cambia (solo CSS, todo bajo `.raiz[data-teclado]`; sin teclado nada cambia)
- **Se quedan** Deshacer, Rehacer y el botón de modo («✎ Texto» / «♪ Acordes»).
- **Se ocultan** el tono, ABC/123 y la frase de ayuda («Cada acorde se queda con su palabra.»).
- **El panel de botones va en una fila:** «♪ Acordes» fijo a la izquierda y «+ Verso, + Pre coro…» deslizables a su derecha.
- Cabecera, herramientas, cuerpo y panel pierden respiro vertical (la zona segura de arriba se respeta). Todo lo que se toca sigue en 44 px.
- **Canción nueva:** además se ocultan el subtítulo («Tono F · 72 bpm · Editar datos») y la **tira de la estructura con su cabecera**. Decisión de Claude, a revisar: ocultando solo el subtítulo y la cabecera de la estructura el texto quedaba en 87 a 147 px; la tira ocupa unos 69 px y era lo único que quedaba por quitar sin tocar Deshacer. Vuelve al cerrar el teclado.

## Medido (texto visible con el teclado abierto; objetivo ≥ 150 px)
| | 390 px | 360 px |
|---|---|---|
| Antes (cualquier editor) | 24 | 24 |
| Canción guardada, zona segura 47 (app instalada) | 169 | 156 |
| Canción guardada, zona segura 0 (Safari) | 216 | 203 |
| Canción nueva, zona segura 47 | 169 | 156 |
| Canción nueva, zona segura 0 | 216 | 203 |
Igual con la vista desplazada 0, 120 y 200 px. El panel termina exactamente en el borde del teclado y no asoma la página de atrás.

## Pruebas
- `tests/portal/teclado-texto.test.js` (6) y `tests/mutaciones/teclado-texto.json` (16, todas detectadas).
- Navegador real con teclado emulado: `tests/e2e-menus/editor-teclado.js` (44 comprobaciones por combinación en canción guardada, 48 en nueva con `ESCENARIO=nueva`), 390 y 360 px, claro y oscuro, zona segura 47 y 0. Capturas aquí.
- Regresión: `tests/e2e-menus/correr-regresion-editor-teclado.sh` (editor v2 texto, carril e interludio; hojas pequeñas; Nueva canción con estructura; adjuntos; lectura; esqueletos).

## Qué comprobar en el iPhone (Claudia, en el preview de dev)
Chrome de escritorio no tiene teclado: lo emulé. Esto es lo que solo se puede confirmar en el teléfono.
1. Abrir una canción **ya guardada con letra larga** → «Editar con acordes» → «✎ Texto». Tocar una línea **de la mitad de abajo** del cuadro.
   - El panel «♪ Acordes · + Verso · + Pre coro…» queda **pegado al teclado**, en una sola fila, sin hueco debajo.
   - **No** se ve la ficha de la canción por detrás, ni arriba ni abajo.
   - Arriba se ven «‹ Cancelar», el título y «Guardar», y debajo Deshacer, Rehacer y «♪ Acordes».
   - Se ven al menos 5 o 6 líneas de texto y el cursor queda a la vista al escribir.
2. Escribir varias líneas seguidas y desplazar el texto con el dedo: el panel no salta ni se despega del teclado.
3. Deslizar la fila de botones hacia la izquierda: aparecen «+ Puente», «+ Interludio», «+ Instrumental», «+ Tag», «+ Final». Tocar «+ Coro»: inserta el encabezado y el teclado **no** se cierra.
4. Tocar Deshacer y Rehacer con el teclado abierto: funcionan y el teclado sigue abierto.
5. Cerrar el teclado (botón «OK»/flecha del teclado o tocar «♪ Acordes»): vuelven el tono, ABC/123 y la frase de ayuda, y el panel a dos filas, **sin que la pantalla quede cortada ni desplazada**.
6. Girar el teléfono con el teclado abierto y volver a vertical: el editor sigue ocupando la pantalla.
7. Con la barra de direcciones de Safari visible y oculta (desplaza la página antes de entrar): el resultado es el mismo.
8. Hacer zoom con dos dedos en el editor y soltar: no debe quedar nada descolocado al volver.
9. **Canción nueva** («ZZ Prueba teclado (borrar)»): crear, agregar Verso 1 y Coro, escribir. Con el teclado abierto se ocultan la tira de círculos y el subtítulo; al cerrarlo vuelven. Decir si prefieres la tira siempre a la vista aunque quede menos texto. Borrar la canción al terminar.
10. Si usas la app **instalada en la pantalla de inicio** además de Safari, repetir el punto 1 allí (es el caso con menos sitio).
11. Comprobar que no cambió nada en las hojas pequeñas con campos: «Agregar persona», la hoja de un día en Disponibilidad y una hoja del admin con campos de texto.
