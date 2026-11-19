# Tira de días del Home (teléfono)

Reemplaza al calendario semana/mes de los dos Home en teléfono (el del usuario y el del administrador/líder) por la tira de días del prototipo `docs/mockups/index.html`. Solo en `dev`.
Tag previo: `pre-tira-dias-dev-2026-11-19`.

## Qué cambió

| Pieza | Archivo |
| --- | --- |
| Reglas puras (días de la tira, punto de cada día, acciones por persona, cuerpo del bloqueo, quién bloqueó) | `lib/home/tira.ts` |
| Textos | `lib/textos/tiraDias.ts` |
| La tira, la tarjeta animada y el mes completo | `components/home/TiraDias.tsx`, `tira-dias.module.css` |
| La tarjeta del día y la hoja inferior | `components/home/PanelDia.tsx`, `HojaBloqueo.tsx`, `HojaInferior.tsx` |
| Home de usuario (portal) | `app/portal/_components/inicio/InicioTelefono.tsx`, `PanelDiaUsuario.tsx` (+ props en `Inicio.tsx` y `PortalApp.tsx`) |
| Home de administración y líder | `components/home/HomeAdminMovil.tsx` (+ `app/home/page.tsx`) |
| Pruebas | `tests/portal/tira-dias.test.js` (19), `tests/e2e-menus/tira-comportamiento.js` (navegador), `tests/e2e-menus/tira-mock.js` y `escenarios/tira-dias.json` (capturas) |

## Reglas que se respetaron

- **Desplazamiento táctil nativo**: `overflow-x:auto`, sin snap ni páginas, sin JavaScript para el toque. El arrastre con inercia del prototipo solo corre con mouse y lápiz (`pointerType ≠ touch`).
- **Datos que ya existían**: el usuario bloquea y quita con `/api/portal/bloqueos` (POST de un día sin `teamIds` = todos sus equipos; DELETE por fecha), con las filas que ya guarda `PortalApp`. Administración y líder leen `team_blocks_in_range`, que ya recorta por rol (el líder, solo su equipo). No hay tablas, rutas, permisos ni migraciones nuevas. La base no se tocó.
- **Quién bloqueó**: administración y líder lo ven en la tarjeta con la frase del panel «Por persona» de siempre (`personPhrase`): el líder lee «Bloqueó {su equipo}» y nunca otros equipos; la administración, «Bloqueó todos sus equipos» o «Bloqueó A. Disponible en B.». El músico solo ve lo suyo.
- **No cambiaron**: el calendario mensual de Servicios, Disponibilidad, el escritorio del Inicio y del Home. `CalendarioHome` y `lib/home/calendario.ts` siguen en el repositorio (el segundo se sigue usando).

## Decisiones a revisar

1. **Bloquear desde el Home de administración o líder no existe**: ese Home usa la sesión del administrador, no la identidad del portal que exige `/api/portal/bloqueos`, y no había forma ya construida de que ahí se escriba un bloqueo propio. Ahí la tarjeta solo lee (servicio, quién bloqueó, «Abrir servicio»). Un administrador o líder que quiere bloquear su propia fecha lo hace en su Inicio de usuario («Modo Usuario»), que es la misma tira con «Bloquear esta fecha».
2. **El punto**: el usuario ve primero su bloqueo (ámbar) y después el servicio (azul); administración y líder ven primero el servicio (azul) y, sin servicio, el ámbar si alguien bloqueó.
3. **Bloquear un día de un servicio** se permite (como en Disponibilidad); la tarjeta avisa «Hay un servicio este día: habla con tu líder.». Un día que ya pasó no se puede bloquear, pero su bloqueo sí se puede quitar.
4. **Bloqueo de algunos equipos** (hecho en Disponibilidad): la tarjeta dice «Solo {equipos}» y «Quitar bloqueo» quita la fecha completa, igual que el botón «Quitar» de Disponibilidad.
5. **Si los bloqueos no cargaron** no se ofrece bloquear ni quitar y se dice «No pudimos cargar tus bloqueos.» con «Reintentar».

## Verificación

Ver `capturas/` (390 y 360 px, claro y oscuro; `t*` = usuario, `a*` = administración y líder) y el informe de la sesión. El escritorio quedó idéntico al píxel a 1280 y 820 px (y con el HTML normalizado igual) contra el tag previo.
