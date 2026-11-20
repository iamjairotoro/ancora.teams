# Animaciones M2 — hojas inferiores (entrada y salida)

Solo teléfono (≤ 768 px). Hojas: la del mes y la de «Bloquear esta fecha» (tira de días), la del día y la del rango (Disponibilidad) y «Escribirle a…» (Chats).

- **Entrada:** el velo (fondo oscuro) aparece con un fundido (`--anc-dur-sheet`, 240 ms) y la hoja sube con la curva de drawer `cubic-bezier(.32,.72,0,1)`, también en 240 ms.
- **Salida:** la hoja baja en el mismo sentido en 200 ms (`--anc-dur-sheet-out`) y el velo se desvanece. Se desmonta al terminar; mientras sale no recibe toques y está `inert`.
- **Interrupción:** si se vuelve a abrir a mitad de la salida, se cancela el desmontaje y la hoja regresa desde donde iba (misma hoja, sin reiniciar).
- **Reducir movimiento:** solo un fundido de 120 ms (`--anc-dur-reduced`), sin desplazamiento.
- **Foco:** vuelve al botón que abrió la hoja (también en iPhone, donde un toque no da foco al botón: se recuerda el último control tocado).
- **Escritorio (> 768 px):** sin cambios; las hojas se desmontan al instante y conservan su animación de siempre.

Se anima solo `translate` (propiedad de transformación suelta) y `opacity`, con transiciones, nunca con duraciones sueltas.

## Cómo se verificó
- `tests/portal/hojas-movimiento.test.js` (reglas del CSS y del hook) y `tests/e2e-menus/hojas.js` (navegador real: mide entrada, salida, interrupción, foco, reducir movimiento, formulario limpio y escritorio).
- Capturas de reposo (se espera a `document.getAnimations()`): `capturas/` guarda las del teléfono de 390 px, claro y oscuro. Contra la versión anterior: 28 de 28 idénticas al píxel con las hojas abiertas.
