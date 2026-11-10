# Lectura con acordes · C3b (hoja «Preferencias»)

Rama `lectura-c3`. «Ajustes» (la barra de arriba) abre la hoja **Preferencias**: Vista de canción (Ambos / Acordes / Letras), Notación (Americano / Números), «Fuente y tamaño», «Detalles de la canción» (muestra u oculta el subtítulo y los créditos) y «Vista compacta». Todo se guarda al instante en el perfil de la persona (`members.chart_prefs.lectura`, por `/api/portal/preferencias`).

- **«Exportar canción» no existe todavía**: queda fuera.
- **«Fuente y tamaño»** abre por ahora la ventana de tipografía de siempre; la pantalla propia (mockup Fuente) llega en C3c.
- **«Detalles de la canción»** apagado oculta solo la línea «artista · bpm · Original X» y los créditos (autor y traducción); **el título se queda siempre**. Campo nuevo `detalles` dentro de `lectura` (sin migración: es un jsonb); vale `true` salvo que se apague.
- **Notación**: la barra ABC/123 de C1 ya no se dibuja en la lectura nueva (vive en Preferencias).

Prueba en navegador real (Chrome por CDP, servidor simulado en la página, datos inventados): `tests/e2e-menus/lectura-c3b.js`, 24 comprobaciones por combinación (390 y 360 px, claro y oscuro). Se corre una combinación por proceso:

```bash
scripts/verificacion/construir.sh 3168
BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones.sh tests/e2e-menus/lectura-c3b.js docs/verificacion-rediseno/lectura-c3b/capturas
```

| Archivo (`capturas/<vista>__<ancho>__<tema>.png`) | Qué muestra | Mockup |
|---|---|---|
| `preferencias` | la hoja con los valores por omisión | Preferencias |
| `vista-acordes` | «Acordes»: solo los acordes | Solo-Acordes |
| `vista-letras` | «Letras»: solo la letra | Solo-Letra |
| `notacion-numeros` | «Números» | — |
| `sin-detalles` | «Detalles» apagado: el título se queda, sin subtítulo ni créditos | — |
| `compacta` | «Vista compacta» | — |
| `preferencias-guardadas` | tras recargar, la hoja refleja lo guardado | — |

`comparativas/`: mockup a la izquierda, captura a la derecha (390 px). Los mockups traen las píldoras antiguas de partes; ya no hay que seguirlas.

(La píldora del tono abre «Previsualizar tonalidad» desde C3d.)
