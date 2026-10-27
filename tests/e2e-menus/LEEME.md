# Verificación visual y de escritorio (herramientas guardadas)

Todo esto vive en el repo para que no se pierda con las carpetas temporales. Se necesita Google Chrome (la ruta se cambia con `CHROME=…`) y las dos herramientas de `scripts/verificacion/`.

## Antes de subir un commit
```bash
scripts/verificacion/verificar.sh          # tsc + next build del HEAD exacto + test:portal/auth/correo/textos
git checkout --detach <sha> && scripts/verificacion/verificar.sh   # un commit anterior; luego `git checkout dev`
```

## Capturas de teléfono (390 y 360 px, claro y oscuro)
```bash
scripts/verificacion/construir.sh 3168     # construye el árbol de trabajo y lo sirve (con /portal/t65)
ESC_JSON=tests/e2e-menus/escenarios/inicio.json node tests/e2e-menus/cap.js /tmp/capturas
```
Cada escenario es `{id, mock, ruta, pasos}`; `mock` = `inv5` (admin), `home`, `portal` (músico) o `homeadmin` (admin + resumen de servicios). Pasos: `c:<css>` clic, `t:<texto>` clic por texto, `e:<ms>` espera, `j:<js>` ejecuta JS, `l:<clave>=<valor>` interruptor en localStorage (recarga). Con `menu` (selector) además comprueba que la caja quede dentro del viewport y sin ancestro que la recorte (lo mismo hace `menus-recorte.js`, el arnés permanente de los menús ⋯).

## Escritorio idéntico (1280 px)
Se compara contra un build NUEVO del commit anterior (no contra capturas viejas: el navegador de capturas cambia de un día a otro).
```bash
# A = commit anterior (git archive <sha> | tar -x -C /tmp/A; build; next start -p 3171) · B = árbol de trabajo (construir.sh 3168)
BASE=http://127.0.0.1:3171 ESC_JSON=tests/e2e-menus/escenarios/desk-home.json MOCK_FILE=./homeadmin-mock.js node tests/e2e-menus/desk.js /tmp/A
BASE=http://127.0.0.1:3168 ESC_JSON=tests/e2e-menus/escenarios/desk-home.json MOCK_FILE=./homeadmin-mock.js PUERTO=9572 node tests/e2e-menus/desk.js /tmp/B
node tests/e2e-menus/pngdiff.js /tmp/A /tmp/B; cmp /tmp/A/html/home.html /tmp/B/html/home.html
```
`desk.js` guarda PNG y HTML normalizado (sin ids ni sufijos de CSS modules); `pngdiff.js` dice «idénticas» o el área y nivel máximo de la diferencia. Ruido conocido: dos corridas del MISMO build pueden diferir en unos cuantos píxeles (animaciones, `cargando`).

## Auditoría de campos (iOS no debe hacer zoom al escribir)

`campos.js` abre cada escenario (390 y 360 px) y mide el `font-size` REAL (px del navegador, no rem escalado) de todo `input`, `textarea` y `select`; sale con 1 si alguno mide menos de 16 px.
Escenarios de formularios: `escenarios/campos-admin.json`, `campos-portal.json` y `campos-orden.json`.

    ESC_JSON=tests/e2e-menus/escenarios/campos-admin.json,tests/e2e-menus/escenarios/campos-portal.json,tests/e2e-menus/escenarios/campos-orden.json BASE=http://127.0.0.1:3168 node tests/e2e-menus/campos.js /tmp/campos

`ANCHOS=390` mide un solo ancho; `VER_TODOS=1` lista también los campos de más de 16 px. La prueba sin navegador (que corre en `npm run test:portal`) es `tests/portal/campos-16px.test.js`.
