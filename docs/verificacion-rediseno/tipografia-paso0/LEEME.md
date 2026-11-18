# Tipografía · paso 0 (neutral): los tamaños y pesos pasan a tokens

Base: `e40aba7` (dev). Tag previo: `pre-tipo-paso0-dev-2026-11-18`. **No cambia nada de lo que se ve**: cada token vale exactamente lo que valía el valor suelto al que reemplazó. Sin migraciones, sin tocar la base ni `main`.

## Qué se hizo
- `app/ancora-tipo.css` (nuevo, importado en `app/layout.tsx` después de `ancora-tokens-v5.css`): pesos `--w-normal` 400, `--w-medio` 500, `--w-fuerte` 600, `--w-negrita` 700, `--w-negra` 800 (los dos últimos existen solo mientras no se cambien) y **63 tokens de tamaño**, uno por cada valor que había (`--fs-p75rem` = `.75rem`; `--fs-calc-13px-esc` = `calc(13px * var(--esc, 1))`; `--fs-max-11px-p75rem` = `max(11px, .75rem)`…). El nombre es el valor a propósito: en este paso un token con nombre de rol habría tenido que cambiar de valor.
- Codemod `scripts/verificacion/tipografia-codemod.js` (guardado; no vuelve a pisar `ancora-tipo.css` si ya está aplicado) sobre **72 CSS de teléfono** (lista en `scripts/verificacion/css-telefono.js`): **449 `font-weight` y 688 `font-size`** sustituidos.
- Prueba nueva `tests/portal/tipografia-tokens.test.js` (en `npm run test:portal`): ni un `font-weight` ni `font-size` suelto en esos archivos; ningún token se apoya en otra variable que no sea `--esc`; todo token usado está definido y todo definido se usa; los CSS compartidos no tienen tokens; el layout los importa.
- `tests/portal/_tokens.js` (lo carga `_banco.js`): las pruebas que leen el TEXTO de esos CSS con una regex siguen viendo los valores de siempre (los tokens se sustituyen al leer). Ninguna prueba existente se cambió.
- Plus Jakarta Sans **no se tocó**: `PersonasPanel` y `TeamsAdminPanel` la usan en escritorio y los CSS de escritorio usan 400, 500, 600 y 700; quitar pesos podría cambiarlo. En teléfono se descarga sin usarse; se decide en el paso 1 con una captura de escritorio.

## Qué quedó FUERA del codemod (para el paso 1)
- **Los tokens de roles** (micro, pequeño, cuerpo, fila, sección, título) **no existen todavía**: sus valores dependen de lo que decida Claudia y habrían roto la regla de «todo vale lo de hoy». Se crean en el paso 1 agrupando los 63 tokens actuales.
- **El piso de 11 px** (`max(11px, …)`): **192 de los 688 tamaños** pasan por él (el más repetido, `max(11px, .75rem)`, 52 veces). Está tokenizado tal cual, pero sigue siendo la razón de que muchos secundarios midan todos 11 px; hay que decidir si el piso baja de 11 px o si se sube el tamaño de los secundarios.
- **Calendario del administrador:** `components/team-blocks-calendar.module.css` (pestaña Calendario, tamaño `roomy`, y el Home de escritorio) no está en la lista: 6 `font-weight` y 5 `font-size` sueltos, con letras de la semana de 7,65 px y números con puntos de 8,5 px, por debajo del piso. Es CSS compartido con escritorio.
- **Los aros hechos con `box-shadow`** (`inset 0 0 0 1px …`, bordes dibujados con sombra): unos **103** en esos archivos según un conteo automático. No se tocaron: no son tipografía y el paso de superficies (`--anc-e1` plano en teléfono) es otra decisión.
- **CSS compartidos con el escritorio, sin tocar:** `globals.css`, `songs.css`, `app.module.css`, `ui.module.css`, `ancora-tokens-v5.css`.
- **`components/canciones/linea-con-acordes.module.css`**: dos pruebas del editor v2 la comparan byte a byte con el commit anterior; no se toca.
- **6 `font-size` que dependen de otra variable o de `em`**, a propósito: `--anc-letra-size` (3), `--nav-label-size`, `.9em` y `var(--ac-fs, 1em)`.
- **Estilos en línea de TSX:** unos 270 `fontSize` y 135 `fontWeight`, casi todos de escritorio; sin tocar.
- **`font:` abreviado:** ninguno en esos archivos.

## Verificación
Ver el resumen del commit: `verificar.sh` sobre el HEAD exacto (exit 0) y capturas contra un build nuevo de `e40aba7` (390 y 360 px, claro y oscuro): admin (servicio, servicio vacío y tres equipos), Home admin, Inicio del músico, Perfil, Personas, Tipografía y las pantallas del líder, comparadas con `pngdiff.js`.

Si hubiera que deshacerlo, se vuelve al tag `pre-tipo-paso0-dev-2026-11-18` (el commit no toca nada más que CSS de teléfono, `layout.tsx`, tests y este documento).
