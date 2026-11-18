# El líder en teléfono con las pantallas del administrador (Servicios)

Qué cambió (solo teléfono, solo `/home/servicios`; el escritorio y las pantallas del administrador no cambian):

1. **Lista de Servicios.** Usa la ficha del administrador (`FichaServicio`): el servicio más cercano va destacado (fecha de 27 px en vez de 20, «en N días», ficha más alta) y los siguientes son filas iguales. Mismo título, sección «Próximos» y esqueleto de carga.
2. **Pantalla de un servicio.** Ficha de la fecha (`HeroServicio`) con barra de avance y la **rejilla de equipos** (`RejillaEquipos`: etiquetas «Faltan N», avatares, herramientas), y **pantalla de equipo** (`VistaEquipo`). Son los mismos componentes que usa el administrador: se les pasan permisos como parámetros. Rutas nuevas: `?servicio=…&equipo=…`.
3. **Sin borde de énfasis.** Se quitó el borde grueso de «Tu equipo». El equipo del líder se marca solo con la etiqueta azul «Tu equipo» (en la tarjeta de la rejilla y en la cabecera de su pantalla). Si lidera dos equipos, los dos la llevan.

## Permisos del líder

| | Su equipo | Equipos ajenos |
|---|---|---|
| Ver voluntarios, posiciones, «Faltan N» | sí | sí |
| Abrir herramientas (checklist, horario, notas) | sí | se ven, no se abren (candado «Solo lectura») |
| Añadir herramienta | sí (si falta alguna) | no |
| Tocar una posición (asignar, cupos) | sí | no |
| «Gestionar equipo» | sí | no |
| Lápiz del horario, «Orden del servicio», «Notificar», «⋯», cambiar de servicio | no (el líder no los tiene hoy) | no |

La frase «Quien administra envía la convocatoria. Aquí solo preparas tu equipo.» se mantiene (en la ficha de la fecha y al pie de su equipo). Cada escritura la sigue autorizando el servidor (`/api/lider/*`); un equipo ajeno se dibuja con `EquipoAjeno`, que no importa nada que escriba.

## Decisiones que conviene que revises

- **Cambio en lo que el servidor le da al líder (sin tocar la base):** para dibujar un equipo ajeno como el del administrador, `/api/lider/servicio` ahora entrega de cada equipo ajeno, además de lo de antes, **las posiciones (solo nombre y cupos, sin ids)** y **los tipos de sus herramientas (sin ids, sin nombre, sin contenido)**. Sigue sin salir ningún id de persona, posición o herramienta de un equipo ajeno, ni correo, teléfono o motivos (la prueba `tests/auth/lider-servicios.test.js` lo comprueba con valores «canario»).
- **El contenido de las herramientas de otros equipos no se ve** (solo que existen): hoy el líder no podía verlo y no se lo abrí.
- **«Faltan N» ahora significa lo mismo que en el administrador:** cupos que nadie ocupa. Antes, en la tarjeta del líder, era «sin confirmar».
- **Nombre de la herramienta:** en las tarjetas y fichas ahora dice «Cronograma» (como en el administrador); la pantalla de esa herramienta del líder sigue titulándose «Horario». Si quieres un solo nombre, es un cambio de texto.
- **El primer servicio de la lista lleva la franja gris** (el administrador usa el color de un equipo; la lista del líder no trae equipos).
- **La pantalla Personas del líder** (otra pantalla) todavía usa el borde grueso en su tarjeta «Tu equipo». No la toqué porque no es parte de estas pantallas; dime si la alineamos igual.

## Cómo se probó

- Unitarias: `tests/portal/lider-pantallas-compartidas.test.js` (8 pruebas; un equipo ajeno no tiene ningún botón ni control de edición, el propio sí, los dos equipos propios llevan «Tu equipo», el borde ya no existe, la lista destaca solo el primero) y 14 mutaciones (`tests/mutaciones/lider-pantallas-compartidas.json`), todas detectadas. Ajustes a `lider-servicios` (campos nuevos), `lider-menu-telefono` y `servicio-movil`.
- Navegador real (Chrome por CDP, servidor simulado con datos inventados y una sesión de líder simulada; NO una cuenta real ni la base): `tests/e2e-menus/lider-pantallas.js`, 27 comprobaciones en 390 y 360 px, claro y oscuro, incluyendo tocar las tarjetas del equipo ajeno (no abre nada), dos equipos propios, el esqueleto de carga y que ninguna petición escribe.
- Pantallas del administrador: comparadas contra un build del commit anterior (`8c8e49a`) con `tests/e2e-menus/escenarios/admin-servicio-movil-comparar.json` (servicio, servicio vacío y tres equipos; 390 y 360, claro y oscuro): **20 de 20 idénticas al píxel**.

Capturas (`capturas/`): `1-lista`, `2-servicio`, `3-equipo-propio`, `3-equipo-propio-ventana`, `3-equipo-propio-anadir`, `4-equipo-ajeno` y `5-cargando`, cada una en `__390__light`, `__390__dark`, `__360__light` y `__360__dark`.

## Qué comprobar en un teléfono con un líder real (vista previa de dev)
1. Servicios: el más cercano se ve más grande, con «en N días»; los demás son filas.
2. Abrir un servicio: ficha de la fecha, tarjetas de equipo; la tuya con «Tu equipo» azul y sin borde negro; las demás con candado.
3. Abrir tu equipo: abres herramientas, «Gestionar equipo», tocas una posición y asignas; todo igual que antes.
4. Abrir otro equipo: dice «Solo lectura»; tocar tarjetas o herramientas no hace nada.
5. Atrás vuelve de la herramienta al equipo, del equipo al servicio, del servicio a la lista.
6. Claro y oscuro; recargar con la red lenta: debe verse el esqueleto, no la pantalla antigua.
