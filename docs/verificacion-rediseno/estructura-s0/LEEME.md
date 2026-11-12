# Estructura de «Nueva canción» · S0: la lectura ya soporta la misma sección varias veces NO seguidas

Solo pruebas, **ningún cambio de comportamiento ni de código de la app**. Rama `estructura-cancion`.

## Qué se comprobó
Un arreglo `V1, V2, C, V1, V2, C, Bd, V3, C` (9 entradas, la misma sección sin ir seguida) en `songs.default_arrangement`:
- `armarHojaAcordes` da **9 pasos** en ese orden, cada uno con la letra de su sección (no quita repetidas). Las repeticiones seguidas siguen siendo una entrada con `repeat`.
- `HojaAcordes` (lectura C3) dibuja 9 secciones con id `parte-0 … parte-8`, **sin ids duplicados**.
- `afectadasEnArreglo` cuenta cada aparición (CORO sale 3 veces: dar de baja la sección afecta 3 entradas).
- Una entrada que apunta a una sección que ya no existe se salta sin romper las demás.

## Pruebas
- `tests/portal/estructura-s0-lectura.test.js` (6 comprobaciones) y `tests/mutaciones/estructura-s0-lectura.json` (4 mutaciones: quitar repetidas, ignorar `repeat`, id por código, contar una sola aparición; todas detectadas).
- Navegador real (Chrome por CDP): `tests/e2e-menus/lectura-estructura-s0.js` + `correr-lectura-estructura-s0.sh`, a 390 y 360 px en claro y oscuro (10 comprobaciones cada una): tira de 9 círculos, 9 ids distintos, la letra de cada aparición, tocar el 2.º y el 3.er coro salta a SU aparición y la deja activa, sin scroll lateral. Capturas en esta carpeta.

## Lo que se vio
Con 9 pasos la pantalla se alarga (cada aparición pinta la letra completa). Anotado en `docs/PENDIENTES-code.md`: «plegar repeticiones en la lectura» (decisión: por ahora se repite completa).
