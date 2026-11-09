# Lectura con acordes · C3a (barra, cabecera y tira de partes)

Rama `lectura-c3`: solo teléfono, y solo cuando la canción tiene tono y todas sus variantes en formato 2; el resto sigue con la hoja de letra de siempre.

Prueba en navegador real (Chrome por CDP, servidor simulado en la página, datos inventados): `tests/e2e-menus/lectura-c3a.js`, 37 comprobaciones por combinación (390 y 360 px, claro y oscuro).

```bash
scripts/verificacion/construir.sh 3168
SOLO="390 dark" BASE=http://127.0.0.1:3168 node tests/e2e-menus/lectura-c3a.js docs/verificacion-rediseno/lectura-c3a/capturas
```

| Archivo (`capturas/<vista>__<ancho>__<tema>.png`) | Qué muestra |
|---|---|
| `partes-arriba` | barra, cabecera, tira de partes e insignias de sección |
| `partes-salto` | tocar «Bd» salta a su sección |
| `partes-globo` | tocar la parte activa muestra el nombre |
| `menu-saltar` | «Saltar a sección» con las 10 partes |
| `ajustes` | «Ajustes» abre la tipografía de siempre (las hojas nuevas llegan en C3b y C3d) |

`comparativas/`: mockup **Partes** a la izquierda, captura a la derecha.

Provisional hasta C3b y C3d: la barra de notación y tono de C1 sigue bajo la tira, y los créditos (autor y traducción) siguen visibles bajo el subtítulo.
