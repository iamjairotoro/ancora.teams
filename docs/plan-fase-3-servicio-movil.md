# Plan · Fase 3: Servicio en teléfono (Servicio-C, Equipo-A, Equipo-C) — con la 2b por delante

**Estado: APROBADO con ajustes (20 de octubre de 2026).** Se implementa primero solo el **bloque A (A1 y A2)**, en local; el **bloque B espera un nuevo OK**. Los mockups de `docs/mockups/` están versionados con el plan (commit de documentación aparte); **`Servicio-C.png` y `Equipo-C.png` serán reemplazados por los que pase Claudia** (sin «Añadir equipo» y sin «Otras personas» / «Crear persona nueva»).

**Ajustes aprobados (resumen):** `?servicio=` y `?equipo=` también en escritorio (solo seleccionan; el escritorio idéntico al píxel, con las 46 capturas del área 1); la lista y el servicio dicen **«confirmados»** (la lista sobre **convocados** y el servicio sobre **asignados**, cubierto por la prueba de paridad); «Gestionar posiciones» = hoja de cupos con el enlace «Editar las posiciones del equipo»; «Añadir equipo» fuera de esta fase; hoja de asignar sin «Otras personas» ni «Crear persona nueva»; «Subir archivo» fuera del carrusel; **B3:** las herramientas llevan solo ícono y nombre, sin subtítulo ni resumen, y **no se agregan lecturas del navegador** a `team_tools`, checklists ni cronogramas (si algún día hay resúmenes, van por una ruta del servidor); **B2:** el botón «Notificar a N nuevos» de la cabecera se limita al equipo del líder cuando quien usa la pantalla es líder, y mantiene la confirmación que ya existe antes de enviar.

**Reglas que respeta todo el plan:** sin porcentaje de cumplimiento individual (en el mockup la barra y los chips son del servicio entero, no de una persona); los músicos nunca ven quién declinó (esto es solo `/admin`, que hoy exige ser administrador o propietario; un líder no entra, y sus datos seguirán saliendo ya recortados por `lib/home/recorteLider.ts`); tuteo chileno; escritorio sin cambios (solo ≤ 768 px, por `useMediaQuery` como el Home móvil); textos en `lib/textos/servicio.ts` (nuevo) con `contar()`/`plural()`.

## Lo que encontré (los hechos que mandan en el plan)

- `/admin?tab=setlist` hoy muestra **la misma pantalla de escritorio en el teléfono**: `AdminServiceView` (≈1250 líneas, un solo componente) con el servicio elegido en un `useState` de `app/admin/page.tsx` (`selectedService`). **No existe `?servicio=`** en `/admin` (el portal sí tiene `?servicio=&equipo=`, con `usePortalUrl`).
- Dentro de `AdminServiceView` ya hay: selector de servicio (`picker`, con «Ver historial»), cabecera con horario editable (dos `<input type=time>` que llaman a `/api/update-service`), botones Historial / Duplicar / Nuevo servicio / «⋯» (solo «Eliminar servicio»), pestañas por equipo (`activeTeamTab`), y por equipo: la nómina (`renderColumn`: grupos por posición, **−1+** de cupos, filas con estado, «⋯ Ver persona», punto de bloqueo, «!» del correo, «Aceptaron en otro equipo») y las herramientas.
- **La «Orden del servicio» no es un componente:** son ≈380 líneas dentro de `AdminServiceView` (bloques, plantillas, `EditPanel` deslizable, ≈15 estados). Es **del servicio, no del equipo** (`service_blocks`), aunque cuelgue de la herramienta «setlist» de un equipo. Checklist, Cronograma y Notas **sí** son componentes aparte (`ChecklistTool`, `ScheduleTool`, `FreeTextTool`) y cargan sus propios datos.
- «Subir archivo» (`file_upload`) hoy solo dice «Todavía no está disponible».
- Hay **dos reglas de conteo distintas**: `computeTeamStats`/`colConfirmed` dentro de `AdminServiceView` (confirmados **de asignados**; «nuevos» = asignados sin convocatoria enviada) y `lib/admin/resumenServicios.ts` (confirmados **de convocados**; es lo que usan el Home móvil y `/api/admin/servicios-resumen`). El mockup («0 de 2 confirmados» con dos personas «Por notificar») usa la primera.
- «Notificar» hoy es **por equipo** (`sendInvites(teamId)`); `/api/send-invites` sin `teamId` convoca a todos los equipos.
- Las dos acciones del «Gestionar»: cupos (−1+) escriben `service_position_slots`; asignar escribe `banda_assignments` (`assignBanda`), ambos desde el navegador (ya están en la lista de PENDIENTES del punto 50).

---

## 1. Orden con la 2b: dos bloques, ocho commits

Recomiendo **dos bloques** para poder subir y probar el primero con Claudia en el iPhone (la 2b lleva esperándola) y soltar el Home móvil a `main`.

**Bloque A · 2b (la lista de servicios y `?servicio=`)**

| # | Commit | Contenido |
|---|---|---|
| A1 | `feat(admin): ?servicio= en /admin` | `lib/admin/urlServicio.ts` (funciones puras, ver punto 2); `urlConPestana` borra estos parámetros fuera de la pestaña Servicio; la página lee `?servicio=` y `?equipo=` al entrar (en escritorio también elige el servicio y el equipo, sin cambio visual: arregla de paso «Abrir servicio» del Home de escritorio); el Home móvil (`VistaHoy`, filas de «Próximos») abre `/admin?tab=setlist&servicio=…&equipo=…`. Pruebas de las URL y del atrás. |
| A2 | `feat(admin): lista de servicios en teléfono (2b)` | `components/servicio-movil/ListaServicios.tsx`, solo ≤ 768 px y solo cuando no hay `?servicio=`, con el diseño de `Admin-A.png`: título «Servicios», botón «+» (hoja de «Nuevo servicio»), filtros «Todos / un equipo por chip», «Próximos» y «Ver historial» (N = 10), y una fila por servicio y equipo (franja del color del equipo, día y mes, «10:00 – 14:00 · 9 de 10 confirmados» —**confirmados sobre convocados**—, y el chip «Faltan N» / «Completo» / «N sin responder», o «Convocar» si aún no se convocó, que abre ese equipo). Vacío, cargando y error con «Reintentar». Usa `useResumenServicios`, `/api/admin/servicios-resumen` y `filasProximos` (ya existen). Con `?servicio=` muestra `AdminServiceView` tal cual, con una barra «‹ Servicios» arriba (solo teléfono). Reglas compartidas (`convocatoriaEstado`, `convocatoriaCerrada`, `servicioTerminado`); la organización sale de la sesión de administrador. |

Al terminar el bloque A actualizo `docs/PENDIENTES-code.md` (el Home móvil ya no depende de la 2b).

**Bloque B · Fase 3**

| # | Commit | Contenido |
|---|---|---|
| B0 | `refactor(admin): una sola regla del estado de un equipo en un servicio` | `lib/admin/estadoEquipoServicio.ts` + `lib/textos/servicio.ts` (ver punto 4). `resumenServicios` pasa a usarla **con los mismos resultados** (sus 12 pruebas y las 19 del Home móvil lo vigilan). Prueba de paridad contra `computeTeamStats`. |
| B1 | `refactor(admin): la Orden del servicio como componente` | Se saca de `AdminServiceView` a `components/OrdenDelServicio.tsx` (movimiento de código, mismas props/estados). **El escritorio debe quedar idéntico al píxel** (comparo las 46 capturas del área 1). |
| B2 | `feat(admin): pantalla del servicio en teléfono (Servicio-C)` | Cabecera, chips, dos botones, tarjetas por equipo, «⋯», hoja de horario, hoja de cambiar de servicio/historial, Nuevo/Duplicar/Eliminar. Ensayos: `EnsayoPanel` dentro del mismo marco. **«Notificar a N nuevos» de la cabecera: si quien usa la pantalla es líder, solo cuenta y convoca a su equipo; mantiene la confirmación que ya existe antes de enviar.** |
| B3 | `feat(admin): pantalla del equipo y sus herramientas en teléfono (Equipo-A)` | Encabezado del equipo, carrusel de herramientas (**solo ícono y nombre**, sin subtítulo ni resumen y **sin lecturas nuevas del navegador**), tarjetas de voluntarios por posición, «Notificar a N nuevos», y la pantalla de cada herramienta (Orden, Cronograma, Checklist, Notas). |
| B4 | `feat(admin): hoja para asignar y «Gestionar posiciones» (Equipo-C)` | Hoja de asignar con búsqueda y avisos; hoja de cupos (reemplaza −1+). |
| B5 | *(descartado por ahora)* «Otras personas» y «Crear persona nueva» de la hoja: **fuera de esta fase**. |

Cada commit: `tsc`, `next build` del HEAD exacto, `test:portal`, `test:auth`, `test:correo`, `test:textos`, y capturas a 390 px. Nada se sube sin tu OK.

---

## 2. Navegación (URL y botón atrás)

`/admin?tab=setlist` → **lista** · `&servicio=<id>` → **servicio** · `&servicio=<id>&equipo=<teamId>` → **equipo** · `…&herramienta=<orden|id de la herramienta>` → **herramienta**.

- `herramienta=orden` es una sola (la Orden es del servicio, aunque se abra desde la tarjeta de cualquier equipo); Cronograma, Checklist y Notas usan el id de `team_tools` (del que sale el equipo si falta `equipo`).
- Las hojas (asignar, «⋯», horario, cupos) **no** llevan URL; se cierran con su «✕»/arrastre y con el atrás del teléfono no se pierden pantallas.
- **`lib/admin/urlServicio.ts`** (puras, hermanas de `urlPestana`): `servicioDeUrl(params)`, `urlConServicio(href, {servicio, equipo, herramienta})` (al subir de nivel quita lo de abajo), y `urlConPestana` suma `servicio/equipo/herramienta` a los parámetros que se borran fuera de Servicio.
- **Atrás:** entrar a un nivel **empuja** una entrada (`history.pushState(null, …)`, la misma idea de `usePortalUrl`); el «‹» de la app hace `history.back()` si ese nivel lo empujó la propia pantalla y, si se llegó por enlace o recarga, reemplaza la URL por la del nivel de arriba (nunca saca a la persona del sitio). Un `popstate` vuelve a leer la URL. Resultado: atrás va herramienta → equipo → servicio → lista → lo que había antes (p. ej. el Home, si se entró desde «Abrir servicio»). Tocar «Servicios» en la barra inferior estando dentro de un servicio vuelve a la lista.
- Se mantiene la regla de la fase 2a-fix: la URL se calcula sobre la URL **actual** (no sobre `useSearchParams`) para no perder la carrera con otros parámetros.

## 3. Qué se reutiliza y qué se parte

| Pieza | Decisión |
|---|---|
| `ChecklistTool`, `ScheduleTool`, `FreeTextTool` | **Se reutilizan tal cual** en la pantalla de herramienta (cargan sus datos, ya muestran «No se pudo cargar…» con «Reintentar»). Se revisa su ancho a 390 px; si algo se corta, se ajusta solo con CSS de teléfono. |
| `AdminServiceView` | **No se toca** salvo B1 (sacar la Orden). El escritorio sigue usándolo igual. |
| Orden del servicio (+ `EditPanel`, plantillas, estados) | **Se parte:** `OrdenDelServicio.tsx` (B1); lo usan escritorio y teléfono. |
| Nómina (`renderColumn`) | **No se reutiliza** (el diseño es otro: tarjetas). Se comparten solo las reglas: estado por persona, «aceptó en otro equipo», bloqueos (`blockedIdsForTeam`), `ProblemaCorreo` y `MensajeConvocatoria` (se reutilizan los componentes). |
| `AssignPicker` (desplegable) | Se reemplaza en teléfono por la hoja; `buildAssignOptions` (`lib/assignHints.ts`) se **reutiliza** para los avisos y el orden. |
| `EnsayoPanel` | Se reutiliza dentro de la pantalla del servicio cuando el servicio es un ensayo. |
| Formularios «Nuevo servicio» y «Duplicar» | Hoja nueva con los mismos campos y la misma función `createService`/`duplicateService` de la página (sin duplicar reglas). |
| Props | Un tipo común `ServicioAdminProps` (hoy son ≈40 props) en `components/servicio-movil/tipos.ts`; `AdminServiceView` mantiene el suyo. |
| Resúmenes de herramientas | **No hay.** Las tarjetas del carrusel llevan solo ícono y nombre. No se agregan lecturas desde el navegador a `team_tools`, checklists ni cronogramas (la lista del punto 50 ya es larga). Si después se quieren resúmenes, irán por una ruta del servidor. |
| «Subir archivo» | **Se omite** del carrusel mientras diga «Todavía no está disponible». |

## 4. Datos: «0 de 2 confirmados», «Faltan 3», «sin cubrir»

Hoy **no hay una regla compartida**: son dos (ver arriba). Propongo `lib/admin/estadoEquipoServicio.ts` (pura), que recibe las posiciones del equipo, los cupos, la banda, las invitaciones y los bloqueos, y devuelve por equipo:

| Dato | Regla (la misma del panel de escritorio) | Dónde se ve |
|---|---|---|
| `asignados` | personas distintas con alguna posición del equipo | «Sin asignar» si es 0 |
| `confirmados` | de esos asignados, los que tienen invitación **de ese equipo** en «confirmado» (un «aceptó en otro equipo» no cuenta como respuesta) | «0 de 2 confirmados» (en la tarjeta y en el encabezado del equipo) |
| `vacantes` | por posición: `max(0, cupos − ocupados)`, con `cupos = slots_needed \|\| 1` | «Faltan 3» / «Falta 1» y «Falta Drums» |
| `nuevos` | asignados sin convocatoria enviada (`sent_at` vacío) | «Notificar a N nuevos» y «Por notificar» |
| `rechazos`, `sinResponder` | como en `resumenServicios` (con `convocatoriaCerrada`/`servicioTerminado`) | solo texto de estado de cada persona (el administrador sí ve a quien declinó) |

El encabezado del servicio suma los equipos: «0 de 2 confirmados» = Σ confirmados / Σ asignados; «5 sin cubrir» = Σ vacantes; «Notificar a 2 nuevos» = Σ nuevos (llama a `sendInvites()` sin equipo, que ya convoca a todos). `resumenServicios` pasa a calcular con esta función **sin cambiar sus números** (guardias: sus pruebas actuales) y se agrega una prueba de paridad con `computeTeamStats`. **Diferencia a conocer (documentada):** la lista (2b) y el Home móvil cuentan «N de M **confirmados**» con M = **convocados** (`resumenServicios`); la pantalla del servicio cuenta «N de M **confirmados**» con M = **asignados** (`estadoEquipoServicio`). **Los dos textos dicen «confirmados»**, no se rotulan distinto. La diferencia queda **cubierta por la prueba de paridad** (`estado-equipo-servicio.test.js`): con las mismas filas, `convocados ≤ asignados` salvo en los casos conocidos (alguien convocado y ya sin posición; alguien asignado y aún sin convocar), y cada regla coincide con su implementación de origen (`resumenServicios` y `computeTeamStats`).

Las vacantes de la tarjeta se dibujan como círculos punteados (máximo 5 y «+N»), para que 12 cupos no rompan la fila.

## 5. «Historial», «Duplicar», «Nuevo servicio», −1+

- **«⌄» junto al título** (el selector): hoja «Cambiar de servicio» con los próximos y «Ver historial» (los 10 últimos).
- **«⋯»:** *Nuevo servicio*, *Duplicar servicio* (no en ensayos, como hoy), *Ver historial* y, en rojo, *Eliminar servicio* (con su confirmación de hoy). **Un solo acceso a «Nuevo servicio» por pantalla:** en la pantalla del servicio, solo en el «⋯»; en la lista (2b), el botón «+ Nuevo servicio».
- **−1+ de cada posición** pasan a **«Gestionar posiciones»** (el enlace azul junto a «Voluntarios»): una hoja con cada posición del equipo y su cupo para **este servicio** (mínimo: las personas ya asignadas, como hoy), con `updateSlotsNeeded`. Abajo, el enlace «Editar las posiciones del equipo» a `?tab=personas&gestion=equipo&team=…` (aprobado).
- Horario: el lápiz abre una hoja con los dos campos de hora y guarda con `/api/update-service` (la ruta de hoy).

## 6. «Añadir equipo» y la hoja de asignar

- **«Añadir equipo» queda fuera de esta fase** (ya salió del mockup). Existe, pero no por servicio: es «Gestionar equipos → Agregar equipo» (Personas), y un servicio muestra **todos los equipos activos**. Si no hay equipos, el vacío dirá «Todavía no hay equipos. Créalos en Gestionar equipos.» con enlace a Personas (texto desde `lib/textos`; el de hoy, «créalos en Personas → Equipos», quedó viejo).
- **Hoja de asignar (B4):** «Del equipo» + búsqueda + los avisos de hoy, **sin «Otras personas» ni «Crear persona nueva»**. Avisos: «Disponible», «Bloqueó este día», **«Ya asignada en {equipo}»** (el código dice «Ya asignado en…»; se concuerda con «persona») y **«Toca {posición}»** (no «Suele tocar») para quien tiene esa posición en su perfil. Si **nadie** tiene esa posición en su perfil, mensaje vacío con enlace a Personas («Nadie tiene la posición {posición} en su perfil. Agrégala en Personas.», en `lib/textos/servicio.ts`).

## 7. Riesgos, pruebas y capturas

**Riesgos**
1. **B1 (sacar la Orden):** la pieza más grande y la que toca el escritorio. Mitigación: commit propio, movimiento de código sin cambios y comparación al píxel de las 46 capturas del área 1 (más sus textos).
2. **Dos reglas de conteo** (convocados en la lista, asignados en el servicio): si se confunden, el Home dice una cosa y el servicio otra. Mitigación: B0 con la prueba de paridad que documenta y fija la diferencia (punto 4).
3. **Lecturas desde el navegador:** no se agrega ninguna nueva (se descartó el resumen de herramientas); solo se reutilizan las que la página ya hace.
4. **Navegación con `pushState` y Next:** misma técnica que el portal; pruebas del atrás, recarga y enlace directo.
5. **Cambio de ancho (768 px):** una tablet vertical usa la versión de teléfono; con el hueco de medición del Home móvil para no pintar la equivocada.
6. **Paridad de funciones:** no se puede perder nada del servicio de hoy: «!» del correo con «Reintentar correo», «Aceptaron en otro equipo», cambio de rol pendiente de confirmar, punto de bloqueo, «Ver persona», quitar a alguien de un cupo, plantillas, ensayos. Lista de comprobación en la prueba de capturas.
7. **Texto largo en las tarjetas:** el subtítulo «N herramientas» se recortaba en el mockup anterior; ahora las herramientas llevan solo ícono y nombre. Verifico los nombres largos a 360 px.
8. **Botón fijo «Notificar» sobre la barra inferior:** respeto el alto de la barra inferior y el teclado.

**Pruebas (todas nuevas, en `tests/`)**
- `urlServicio.test.js`: cada URL ↔ pantalla, subir de nivel, `urlConPestana` y el enlace viejo; atrás con y sin entrada empujada.
- `estado-equipo-servicio.test.js`: los casos del mockup (0 de 2, Faltan 3, Falta 1, sin cubrir 5, Por notificar), «aceptó en otro equipo», cupos con más gente que cupos, y **paridad** con `computeTeamStats` y con `resumenServicios`.
- `servicio-movil.test.js`: solo ≤ 768 px, escritorio idéntico (guardia de `AdminServiceView` salvo B1), un solo acceso a «Nuevo servicio», sin porcentaje por persona, sin lo que ve el músico, textos solo desde `lib/textos`.
- `textos/`: extender `voz`, `plural` y `compartidos` a `lib/textos/servicio.ts`.
- Prueba en el navegador (como `errores.js`): navegar lista → servicio → equipo → herramienta y volver con atrás, asignar y desasignar, cupos, «Notificar», y las fallas de carga con «Reintentar».

**Capturas a 390 px** (claro y oscuro; ancho 360 aparte para los textos largos): lista (con datos, vacía, cargando, error, historial), servicio (con equipos, sin equipos, ensayo, «⋯», horario, cambiar de servicio), equipo (con vacantes, sin gente, todo cubierto), cada herramienta (Orden, Cronograma, Checklist, Notas, con y sin falla de carga), hoja de asignar (con avisos, buscando, sin resultados), hoja de cupos, y las mismas a 1280 px **para demostrar que el escritorio no cambió**.

## Decisiones tomadas (20 de octubre de 2026)

1. Dos bloques y ocho commits; ahora **solo el bloque A** (A1, A2), en local, sin subir.
2. `?servicio=` y `?equipo=` también en escritorio (solo seleccionan); escritorio idéntico al píxel.
3. «Confirmados» en la lista y en el servicio (convocados vs. asignados, documentado y cubierto por la prueba de paridad).
4. «Gestionar posiciones» = hoja de cupos, con «Editar las posiciones del equipo».
5. «Añadir equipo» fuera; sin equipos, enlace a Personas.
6. Hoja de asignar sin «Otras personas» ni «Crear persona nueva»; «Toca {posición}», «Ya asignada en {equipo}», «Bloqueó este día»; vacío con enlace a Personas.
7. «Subir archivo» fuera del carrusel.
8. Mockups y plan versionados en un commit de documentación aparte (sin las capturas de verificación).
9. B3 sin subtítulos ni lecturas nuevas; B2 con «Notificar» limitado al equipo del líder y con la confirmación existente.
