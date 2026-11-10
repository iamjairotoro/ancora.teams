# Lectura con acordes · C3d («Previsualizar tonalidad»)

Rama `lectura-c3`. La píldora del tono (barra de arriba) abre la hoja **Previsualizar tonalidad**, que reemplaza al selector de tono de C1:

- «Original X» y «Tono del servicio X» (este solo si la canción se abrió desde un servicio con un tono del mismo modo y distinto del original); tocarlos elige ese tono.
- Las letras C a B; en una canción en menor se ven con «m» (Cm … Bm).
- ♭ y ♯: se alternan sobre la letra elegida y se apagan donde el tono no existe (no hay Cb, Fb, B♯ ni E♯).
- La pantalla de atrás cambia al tocar. **«Guardar»** deja el tono elegido; cerrar de cualquier otra forma (✕, Escape, tocar fuera, atrás) vuelve al tono con que se abrió.
- El aviso dice que cambiar aquí solo cambia lo que ve la persona (con el tono del servicio, si lo hay). **No se escribe nada** (ni parches ni preferencias): vale mientras la pantalla esté abierta, como en C1.
- Solo tonos del mismo modo que la canción (lib/tonalidad.ts, sobre lib/tonos.ts).
- **Sin Cejilla** (queda para después).
- La barra de notación y tono de C1 desaparece de la lectura nueva (la notación está en Preferencias y el tono, aquí). La hoja de C1 sin la lectura nueva la conserva.

Prueba en navegador real (Chrome por CDP, servidor simulado en la página, datos inventados): `tests/e2e-menus/lectura-c3d.js`, 390 y 360 px, claro y oscuro; cubre la canción abierta desde la lista, desde un servicio y en menor.

```bash
scripts/verificacion/construir.sh 3168
BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones.sh tests/e2e-menus/lectura-c3d.js docs/verificacion-rediseno/lectura-c3d/capturas
```

| Archivo (`capturas/<vista>__<ancho>__<tema>.png`) | Qué muestra | Mockup |
|---|---|---|
| `tonalidad` | la hoja abierta sobre la canción (sin servicio) | Tonalidad |
| `tonalidad-a` | tocar «A»: los acordes de atrás cambian | Tonalidad |
| `tonalidad-servicio` | con «Tono del servicio C» y su aviso | Tonalidad |
| `cancion-en-d` | tras «Guardar»: la canción en D | — |
| `tonalidad-menor` | una canción en Em: letras menores | — |

`comparativas/`: mockup a la izquierda, captura a la derecha (390 px). El mockup trae además el control de Cejilla, que no se dibuja.
