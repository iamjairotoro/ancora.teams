# Animaciones M4 (tira de días a tokens) y M5 (avisos)

**M4.** `tira-dias.module.css` y `TiraDias.tsx` ya no tienen duraciones ni curva propias: la píldora (transform) y el alto de la tarjeta, y la entrada de la tarjeta, usan `--anc-dur-screen` (280 ms) y `--anc-ease-drawer`; los colores de estado, `--anc-dur-sheet`; presión y botones, `--anc-dur-press` / `--anc-dur-fast`. El temporizador que suelta el alto fijo (antes 380 ms) lee el token y le suma 100 ms. Con «reducir movimiento» la tarjeta nueva solo hace un fundido de 120 ms (el alto salta, las píldoras no se mueven). El archivo declara en la lista de movimiento por tokens las propiedades que ya se animaban y no son transform/opacity: `height` (la tarjeta), `color`, `font-weight`, `background-color` y `box-shadow` (estados de las píldoras y los chips).

**M5.** Solo los avisos que ya existían: `PersonToast` (el de TeamPanel y el de admin) y `PersonNotice` (el persistente). En teléfono suben desde abajo con un fundido (`--anc-dur-sheet`) y salen con un fundido, sin desplazamiento (`--anc-dur-fast`); con «reducir movimiento», fundido de 120 ms; escritorio con su entrada de siempre. No hay ningún aviso nuevo en la tira de días (lo vigila `tests/portal/avisos-m4m5.test.js`).

Verificación: `tests/portal/avisos-m4m5.test.js`, `tests/e2e-menus/avisos-m4m5.js` (navegador real) y `tira-comportamiento.js`.
