# Animaciones M6 — cambio de pestaña del portal del músico e indicador (lente) del menú

## Qué se midió antes de cambiar nada (`tests/e2e-menus/pestanas-frames.js`, fotograma a fotograma)
Se grabó el cambio entre las pestañas (Inicio, Servicios, Canciones, Chats, Perfil) en un Chrome real a 390 px, con el procesador normal y con el procesador 4× más lento (un teléfono más lento): caja del menú, posición y ancho de la lente, «firma» del contenido, marcadores de espera, desplazamiento y alto de la página, y un video de cuadros (`fotogramas/`).

Lo que se encontró (el «antes», `informe-antes-cpu4.json`):
1. **El contenido cambia de golpe**: en un solo cuadro desaparece la pantalla anterior y aparece la nueva, sin ninguna transición.
2. **En Inicio, la tarjeta del día se veía vacía** durante ≈280 ms (8 a 15 cuadros con el procesador lento): su animación de entrada (opacidad 0 → 1) corría al montarse la tira, así que la tarjeta blanca aparecía sin texto y se llenaba después (`antes-2-tarjeta-vacia.jpg`, `antes-3-tarjeta-llenandose.jpg`). Es el «parpadeo» que sí se pudo reproducir.
3. **Inicio es pesada y congela la lente en teléfonos lentos**: montarla de una vez (≈800 nodos: la tira de 135 días y las tarjetas) bloquea el hilo principal ≈500 ms con el procesador 4× más lento (con el normal, 35 ms): la lente se queda a medio camino y luego salta (`antes-1-lente-a-mitad-camino.jpg`), y un segundo toque espera detrás: llegaba ≈740 ms tarde.
4. **La lente tardaba 600 ms** (con rebote) frente a un contenido que cambia al instante: durante ese lapso la lente y la pantalla no coinciden.
5. **El menú inferior no se mueve en Chromium** (0 saltos de posición o tamaño en ningún cuadro). **El salto del menú que Claudia describe NO se pudo reproducir aquí.** Lo que sí se midió: al pasar de una pestaña larga a una corta con la página desplazada, el alto del documento cae (1400 → 844 px) y el desplazamiento se corta de golpe (556 → 0): es la causa probable del salto en Safari del iPhone, donde la barra del navegador se contrae o se expande con ese cambio; no se puede comprobar sin un iPhone y no se tocó.
6. **No hay marcadores de espera al cambiar de pestaña**: los datos ya están cargados en `PortalApp`; no se vio ningún esqueleto ni giro, ni diseño antiguo, en ningún cuadro. Si Claudia ve «diseño antiguo», esto no lo explica: necesito saber en qué pestaña y en qué momento.

Ninguna causa pedía cambiar la estructura de las rutas: las pestañas son un solo componente (`PortalApp`) y todo se resolvió con CSS y un cambio pequeño de React.

## Qué cambia
- **Entrada:** lo que se monta nuevo dentro del contenido del portal entra con un fundido de 160 ms (`--anc-dur-fast`, `--ease-out`) y 6 px de desplazamiento. Sin animación de salida de lo anterior (se desmonta al instante, no bloquea el toque). Solo teléfono. Con «reducir movimiento», fundido de 120 ms.
- **La tarjeta del día de Inicio** ya no anima su entrada al montarse la tira, solo al cambiar de día: se acabó la tarjeta vacía.
- **La lente** (y su zoom) usa los tokens: recorrido 280 ms (`--anc-dur-screen`, con su rebote), sombra 240 ms, opacidad 120 ms.
- **Toques rápidos:** en teléfono el contenido de la pestaña se dibuja de forma diferida e interrumpible (`useDeferredValue`): el menú y la lente siguen al toque al instante (como antes) y la pantalla pesada se dibuja después; si se toca otra pestaña a medias, ese dibujo se descarta y gana el último toque. Mayor tarea larga con el procesador 4× más lento: de ≈600 ms a ≈300 ms; retraso del segundo toque: de ≈740 ms a unos pocos ms.
