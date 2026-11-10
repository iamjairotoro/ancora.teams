# Lectura con acordes · C3c («Ajustes de fuente»)

Rama `lectura-c3`. En la hoja Preferencias, «Fuente y tamaño» abre, dentro de la misma hoja, la pantalla **Ajustes de fuente** (la flecha de arriba vuelve a Preferencias):

- **Vista previa** con la fuente y el tamaño elegidos (una línea inventada con acordes; usa las mismas variables que la lectura).
- **Tamaño de fuente**: «−» y «+» entre los cuatro pasos de siempre, que se muestran en px (14, 16, 19 y 22), con los botones apagados en los extremos.
- **Fuente**: La app, Arial, Georgia y Mono (la misma lista de la ventana de tipografía; «Sistema» ya no se ofrece y, si alguien la tiene guardada, ve «La app»).
- Cada cambio se aplica y se guarda al instante en el perfil (`members.chart_prefs`: `fontFamily` y `textScale`, por `/api/portal/preferencias`); vale para todas las canciones.
- **Fuera por ahora** (decidido): pesos de la letra y de los acordes, y colores. El mockup Fuente los trae; no se dibujan.

Prueba en navegador real (Chrome por CDP, servidor simulado en la página, datos inventados): `tests/e2e-menus/lectura-c3c.js`, 18 comprobaciones por combinación (390 y 360 px, claro y oscuro).

```bash
scripts/verificacion/construir.sh 3168
BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones.sh tests/e2e-menus/lectura-c3c.js docs/verificacion-rediseno/lectura-c3c/capturas
```

| Archivo (`capturas/<vista>__<ancho>__<tema>.png`) | Qué muestra | Mockup |
|---|---|---|
| `fuente` | la pantalla con 16 px | Fuente |
| `fuente-grande` | 22 px: la vista previa crece | Fuente |
| `fuente-georgia` | Georgia elegida | — |
| `cancion-grande` | la letra de la canción con 22 px | — |
| `fuente-guardada` | tras recargar, la pantalla refleja lo guardado | — |

`comparativas/`: mockup a la izquierda, captura a la derecha (390 px).
