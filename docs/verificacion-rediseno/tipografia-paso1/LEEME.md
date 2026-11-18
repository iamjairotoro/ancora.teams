# Tipografía · paso 1: roles y superficies más suaves en teléfono

Base: `c577fd9` (dev). Tag previo: `pre-tipo-paso1-dev-2026-11-18`. Solo teléfono (`max-width:768px`); el escritorio sigue idéntico. Sin migraciones, sin tocar la base ni `main`. Cambio aparte del trabajo del líder.

## Cómo está hecho (un solo lugar)
- `app/ancora-tipo.css`: el bloque por defecto (escritorio) conserva cada valor de antes; el bloque `/* === TELÉFONO (paso 1) === */`, dentro de `@media (max-width:768px)`, define los **roles** y hace que cada token de valor apunte a uno. Para cambiar la tipografía de teléfono se edita ese bloque.
- **Tamaños** (antes de la escala 0,85): `minimo` 11 px (piso) · `etiqueta` 12 px (piso de etiquetas, chips y textos chicos) · `secundario` 15 · `cuerpo` 16 · `nombre` 17 · `seccion` 18 · `grande` 20 · `fecha` 24 · `cifra` 26 · `titulo` 34.
  Cada token de valor se asigna por su tamaño real: menos de 11 px → `minimo` (el calendario del admin, etiquetas de Personas, el chip de equipo suben a 11); de 11 a 12 px → `etiqueta` (las 11 px del piso suben a 12); y así hacia arriba. Los campos de texto (`--fs-16px`) no se tocan: no bajan de 16 px.
- **Pesos**: en teléfono 600, 700 y 800 valen 500 (títulos, fecha, nombres, botones, chips, días del calendario, etiqueta activa de la barra). El 600 queda solo en cifras (`--w-…--cifra`: cifras del Home, del líder, número del día de la ficha y de Inicio, pie de Orden) y botón principal (`--w-…--principal`: «Responder», «Reintentar», «Publicar», el principal de Nueva canción, `.botonPrincipal`). Etiqueta inactiva de la barra inferior 400 (`--w-fuerte--nav`), la activa 500, y los días de otro mes 400 (en el Home y en el calendario del admin).
- **Roles por selector** (14 variantes `--fs-…--rol` / `--w-…--rol`; en escritorio valen lo de antes): título de pantalla igual en todas (también el del líder y la pantalla de Orden); fecha del servicio 24 px (`.heroTit`, Inicio y Servicio del músico); nombre en tarjeta y fila igual en ~35 selectores (fichas, tarjetas de equipo, personas, canciones, chats, líder…).
- **Superficies** (solo teléfono, `:root:root:root` para ganar a los bloques de tema): `--anc-e1` = `0 0 0 1px var(--anc-ring)` (el aro sigue el tema; en oscuro se ve: el anillo claro al 16 %); `--anc-e2` = aro + `0 6px 18px -10px rgba(0,0,0,.28)`.
- **Chips**: los neutros pasan a texto sin relleno (`.chip` de la pantalla del servicio, «Tono/BPM» de la canción). Conservan fondo: «Faltan N» y «Todo cubierto» (`chipFalta`, `chipOk`), «Tu equipo», los de estado (`chipEstado` en el héroe del servicio; los de la ficha de la lista: «Sin convocar», «Convocado»…), «Modo Admin/Líder» y los filtros de Personas.
- **Calendario del admin** (`team-blocks-calendar.module.css`): ahora usa los tokens (entra a la lista de CSS de teléfono); letras y números suben al mínimo, pesos a 500 y los días de otro mes a 400 solo en teléfono.
- **Plus Jakarta Sans**: `preload:false` en `app/layout.tsx`. Medido con el navegador: antes el teléfono pedía 1 archivo de fuente (precargado) y no lo usaba (0 caras cargadas); ahora pide 0. En escritorio sigue pidiendo el mismo archivo y cargando los 4 pesos (400–700) cuando `PersonasPanel`/`TeamsAdminPanel` la usan, así que no se les quitó ningún peso.

## Verificación
- `verificar.sh` sobre el HEAD exacto: ver el resumen del commit.
- 44 parejas antes/después en `pares/` (antes a la izquierda, después a la derecha; 390 y 360 px, claro y oscuro): `p01-home`, `p02-servicios` (lista), `p03-ficha-servicio`, `p04-equipo`, `p05-personas`, `p06-canciones`, `p07-lectura`, `p08-perfil`, `p09-lider`, `p10-admin-movil`, `p11-calendario`. Escenario: `tests/e2e-menus/escenarios/tipografia-paso1.json`; se juntan con `tests/e2e-menus/par.js`.
- Desbordes: `DESBORDE=1 node tests/e2e-menus/cap.js …` busca texto cortado o fuera de la pantalla en cada captura. Resultado: **0 problemas nuevos** (los únicos 20 avisos son los botones «Semana anterior/siguiente» del Home, que ya salían igual antes).
- Escritorio idéntico (1280 px; y 820 px en dos escenarios): Home, Personas, calendario/Servicio/Personas del admin, líder, portal (Inicio, Servicios, Perfil, Servicio, Canciones), claro y oscuro, PNG y HTML normalizado: idénticos salvo dos manchas de ruido que también aparecen entre dos corridas del MISMO build (un rectángulo en Personas y 189 px del campo de fecha en «Mis datos») y la página del líder que a veces se captura a medio cargar.

## Lo que decidí y conviene revisar
- «Fecha del servicio 24 px» lo tomé como 24 antes de la escala (20,4 px reales): **más chica** que los 23,8 de antes. Si se quería 24 reales, es un cambio de un valor (`--t-fecha: 1.75rem`).
- El título de pantalla del líder sube de 23,8 a 28,9 px reales (igual que el resto).
- Las etiquetas y textos de 11–11,9 px (la mayor parte de los secundarios) pasan a 12 px: es lo que pide el piso de 12. Si se prefiere que los secundarios sigan en 11, se separa un rol.
- La pantalla de Orden del servicio y otras pantallas del portal heredan los mismos roles.

## Lo que queda pendiente
- **Aros hechos con `box-shadow`** (unos 110): 55 son aros de 1 px (ya iguales al nuevo `--anc-e1`), 35 de más de 1 px y 23 de otra forma (barras de selección, anillos de «hoy», de estado y de identidad del equipo). Son indicadores de estado, no superficies: no se tocaron.
- **No se tocó** `components/canciones/hoja-acordes.module.css` (una prueba la compara con el commit anterior) ni `linea-con-acordes.module.css`: el chip de tono de la lectura con acordes conserva su relleno. Tampoco los CSS compartidos con el escritorio ni los estilos en línea de TSX.
- Los chips de la lista de Servicios y de las fichas siguen con relleno porque son de estado; si se quiere texto plano, hay que separar los de estado en otra clase.
- Los 600 que quedan reservados se aplicaron a una lista de selectores (cifras y botón principal); si falta alguna cifra o botón principal, se agrega su variante `--cifra`/`--principal`.

Si hubiera que deshacerlo, se vuelve al tag `pre-tipo-paso1-dev-2026-11-18`.
