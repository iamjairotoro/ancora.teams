# Animaciones M3 — ventanas, menús flotantes, pantalla Adjuntos y hojas del admin móvil

Solo teléfono (≤ 768 px). Mecanismo: `components/Presente.tsx` (sobre `lib/usePresencia.ts`, de M2) y los atributos que lee `app/ancora-movimiento.css`.

- **Ventanas centradas (avisar y confirmar, y las confirmaciones controladas):** fundido con escala de .96 a 1 en 240 ms; salida de 200 ms. En `VentanasProvider` cada ventana es un elemento de una lista con su propio `<Presente>`: si se abre otra justo después de cerrar una, conviven un instante (la que sale está inert) y la nueva queda encima. La respuesta a quien llamó (`confirmar`/`avisar`) se da al cerrar, no al terminar la animación.
- **Menús flotantes (⋯, Tipografía, saltar a sección):** crecen desde su botón (origen calculado; 160 ms, `--ease-out`). Solo entrada: quien los usa es dueño del estado y los desmonta al instante (una salida diferida podría cerrar un menú nuevo abierto en ese lapso).
- **Menú ⋯ de la ficha de canción y pantalla Adjuntos (admin y músico):** suben desde abajo como una hoja y bajan al salir. En reposo no queda ningún `translate`/`scale` (el visor de PDF, que va dentro de Adjuntos, sigue cubriendo toda la pantalla).
- **Hojas con entrada y salida:** `HojaBase` y todas las que cuelgan de ella (Preferencias, Tonalidad, Orden del servicio, Bloque del orden, las del líder y las de servicio-movil), pasadas a `<Presente>`.
- **Foco:** vuelve al botón que abrió; si se cierra una hoja y a la vez se abre una ventana encima (p. ej. «Quitar del equipo»), el foco se queda en la ventana y, al cerrarla, vuelve al botón de la hoja que ya no está (la fila de la lista).
- **Reducir movimiento:** solo un fundido de 120 ms.

Verificación: `tests/portal/presente-m3.test.js`, `tests/portal/hojas-entrada.test.js` (todas las hojas de `hoja.module.css` pasan por `<Presente>` o caen en la entrada por defecto), `tests/e2e-menus/hojas-m3.js` y `tests/e2e-menus/ventanas-m3.js` (navegador real). `capturas/` guarda las de reposo del teléfono de 390 px.
