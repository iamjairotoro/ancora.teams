> **EN PAUSA desde 2026-11-25: no ejecutar.**

# Plan · Chats por sala (General · Servicio · Mis equipos · Directos)

**Estado: PLAN CON LAS DECISIONES DE CLAUDIA CONFIRMADAS (21-nov-2026). No se cambió nada de la base de datos ni del código de chats.** Los SQL de este plan están en `docs/plan-chats-por-sala/` (fuera de `migrations/` a propósito) y no están corridos.

**Decisiones confirmadas por Claudia:**
1. La regla de «sirve» del punto 3, tal como está escrita.
2. Ventanas: el chat de un servicio **aparece desde 7 días antes de su inicio**; se puede escribir hasta **24 horas** después del fin y leer hasta **7 días** después.
3. Los mensajes de servicios pasados **se borran a los 90 días** (borrador `057d`, punto 4).
4. **La administración no tiene acceso a servicio, equipo ni directos**; solo al General (punto 5).
5. Los textos de las secciones son los propuestos: **General · Servicio · Mis equipos · Directos**.

**Pendiente de Claudia (antes de correr `057b`):** confirmar que el chat de `main` en producción usa la llave de servicio, cuál es la base real, y el resultado del diagnóstico `057-0` (incluye si el aviso push de `messages` está encendido).

Qué se pide: cuatro secciones en la pantalla Chats, en este orden — **General** (todas las personas de la organización), **Servicio** (solo quienes sirven ese servicio esa semana, de cualquier equipo), **Mis equipos** (un chat por equipo al que pertenezco, solo para sus miembros) y **Directos** (sin cambios). Las reglas de acceso deben cumplirse **en la base y en el servidor**, no escondiendo cosas en pantalla.

---

## 1 · Inventario de lo que hay hoy

### Tablas
| Tabla | Qué es | Dónde está definida |
|---|---|---|
| `messages` | **Todos** los mensajes: `member_id` (quien escribe), `service_id`, `recipient_member_id`, `content`, `created_at`. | **Reconstruida**: se creó a mano en el panel de Supabase; `test-schema/schema-consolidated.sql` la deduce del código. Sus políticas reales no están en el repo. |
| `chat_presence` | Qué chat está mirando cada persona ahora (`member_id`, `chat_id` texto, `updated_at`), para no duplicar el aviso push. | `supabase-schema-v16`. |

No existe una tabla de salas. **Una sala es una convención sobre `messages`:**
- **General** = `service_id` nulo **y** `recipient_member_id` nulo. En la app se llama `'team'`. `messages` **no tiene `organization_id`**: el servidor filtra por la organización de **quien escribió** (`app/api/portal/chat/route.ts`, `teamThread`).
- **Servicio o ensayo** = `service_id` con valor. En la app el id de la sala es el id del servicio.
- **Directo** = `recipient_member_id` con valor. Id de la sala: `dm_<idA>_<idB>` (ordenados).
- **De equipo: no existe.** El propio código lo dice («los chats por EQUIPO no existen en este punto», `ListaChats.tsx`).

Las salas **no se crean**: aparecen al escribir el primer mensaje. El servidor decide quién puede entrar en `lib/portal/chatScope.ts` (`loadChatScope`).

### Quién ve qué hoy, por el servidor (portal)
El navegador del portal **no toca `messages`**: usa `/api/portal/chat` (lectura de resumen, hilo, envío) y `/api/portal/chat/presencia`, que identifican a la persona en el servidor y consultan con la llave de servicio. El navegador **consulta cada ~5 s el hilo abierto y cada 45 s el resumen**; no usa tiempo real. Lo mismo hace `main` (ya tiene estas rutas).

Regla de servicio de hoy (`chatScope.ts`): servicios **futuros** donde la persona está **asignada** (`banda_assignments`) **y** tiene convocatoria **enviada** (`invitations.sent_at`), **más todos los ensayos futuros**. Un servicio desaparece de la lista en cuanto termina.

### Suscripciones en tiempo real
Solo `messages` está en la publicación `supabase_realtime` (`supabase-schema-v12`). El **único** suscriptor es el panel «Chats» del administrador (`components/ChatModerationPanel.tsx`): lee con la llave del navegador, escucha INSERT y DELETE de **toda** la tabla y borra mensajes. `chat_presence` y las demás tablas no se transmiten.

### ¿Hoy alguien puede recibir mensajes de salas a las que no pertenece? **Sí.** Cuatro caminos, de mayor a menor gravedad
1. **Cualquiera con la llave pública** (la `anon key`, que viaja dentro del JavaScript que baja el navegador) puede leer, escribir y borrar **toda** `messages`, **directos incluidos**, y suscribirse por tiempo real para recibir cada mensaje nuevo de todas las salas. Fuente: `docs/PENDIENTES-code.md` (hallazgo del 3-nov-2026 con consultas de Claudia: `messages` sigue abierta por una política `true` con rol público; la sección del punto 50 la deja pendiente) y `ChatModerationPanel` (que usa justo ese canal). **No lo he probado contra la base viva: por eso incluyo el diagnóstico `057-0`.**
2. **`chat_presence` también está abierta** (política `true`): cualquiera ve en qué chat está cada persona y cuándo. La migración `053b` (rama `cerrar-services-invitations`) la cierra; según PENDIENTES no está aplicada.
3. **Huecos en la regla del servidor:** (a) cualquier persona identificada puede leer y escribir en el chat de **cualquier ensayo futuro**, aunque no esté convocada; (b) `loadChatScope` lee `services` **sin filtrar por organización** (hoy hay una sola); (c) el chat de servicio **no excluye a quien declinó**.
4. **Avisos push:** `chat-notify` avisa en un servicio a **todas** las personas con asignación **o** con invitación a ese servicio, **incluso quien declinó o nunca recibió la convocatoria**; y en el general, a toda la organización (esto último es lo esperado). Nota: según PENDIENTES, en la base «Ancora - Teams» ese disparador está **apagado a mano** y apunta a la app vieja; hay que confirmar cuál base y estado aplican.

Además, **por diseño de hoy**, el panel de moderación del administrador ve todos los chats, directos incluidos (ver punto 5).

---

## 2 · Cómo calcular la pertenencia sin guardarla

**Nada de listas de miembros guardadas.** Funciones SQL (`057a`) que leen, en el momento de cada consulta, los datos que ya existen:

| Sala | Pertenece si… | Datos que lee |
|---|---|---|
| General | la persona tiene organización. (Se lee el hilo filtrando por la organización de quien escribió, como hoy.) | `members.organization_id` |
| Servicio | cumple la **regla de «sirve»** (punto 3) y el chat está dentro de su ventana de tiempo (punto 4). | `banda_assignments`, `invitations`, `services`, `members` |
| Equipo | está en `team_members` de un equipo **no archivado de su misma organización**. | `team_members`, `teams`, `members` |
| Directo | sin cambios: es una de las dos personas y ambas son de la misma organización. | — |

Como cada petición recalcula, **quien sale de un equipo (se borra su fila de `team_members`), es quitado de la nómina o declina la convocatoria pierde el acceso en la siguiente consulta** (≤ 5 s si tiene el chat abierto: el servidor responde 403 y la pantalla lo cierra). Quien sale **no se lleva** lo que ya escribió: sus mensajes siguen en el hilo para el resto.

**Dónde se hace cumplir (defensa en capas):**
1. **Base:** las funciones de pertenencia (`chat_*`) son `SECURITY DEFINER` y **solo `service_role` puede ejecutarlas**; `team_messages` (el chat de equipo) tiene RLS **sin ninguna política** y sin permisos para `anon` ni `authenticated`: nadie con llave pública lo lee ni lo escribe; un disparador `BEFORE INSERT` **rechaza** un mensaje de quien no es del equipo aunque una ruta del servidor tuviera un error; `messages` se cierra a la llave pública (`057b`) y recibe el mismo tipo de disparador (`057c`).
2. **Servidor:** cada ruta toma la identidad de la sesión (nunca del cuerpo de la petición), y **pregunta a esas mismas funciones** antes de leer, escribir o avisar. La regla vive en un solo lugar (la base).
3. **Pantalla:** solo muestra lo que el servidor devolvió. No esconde nada que antes llegara.

Aclaración técnica importante: **las personas del portal no tienen sesión de Supabase** (entran por enlace/identidad que valida el servidor), así que la base no puede distinguirlas por RLS; por eso lo correcto es: llave pública **sin acceso a ninguna tabla de chat** + servidor con la llave de servicio + funciones y disparadores en la base como red de seguridad.

**Por qué el chat de equipo va en una tabla aparte (`team_messages`) y no en `messages` con una columna `team_id`:** el código de `main` lee el chat general como «`service_id` y `recipient_member_id` nulos». Un mensaje de equipo guardado en `messages` tendría esos dos campos nulos y **aparecería en el chat general de todos** mientras `main` siga con el código de hoy. Con una tabla aparte, `main` ni la ve. (Más adelante se puede unificar; no hace falta ahora.)

---

## 3 · La regla de «sirve ese servicio» — **PROPUESTA: CONFÍRMALA**

> **Una persona sirve un servicio cuando…**
> - **servicio normal:** está **asignada a alguna posición** de ese servicio (`banda_assignments`) **y** tiene una **convocatoria enviada** (`invitations.sent_at` con valor) que **no declinó**;
> - **ensayo:** tiene una convocatoria enviada que **no declinó** (los ensayos no llevan nómina);
> - y el servicio es de **su misma organización**.
>
> «No declinó» = existe al menos una convocatoria enviada de esa persona a ese servicio con estado distinto de `declinado` (si está en dos equipos y declina uno, sigue sirviendo por el otro).

**Por qué exigir la convocatoria enviada (y no solo «asignada»):** hasta que el administrador envía la convocatoria, la persona no sabe que está en la nómina; con solo «asignada», el chat le mostraría el servicio (y quién más sirve) antes de que se le avise, y los cambios de nómina en borrador abrirían y cerrarían chats. Es lo que hoy hace el servidor. Si prefieres tu ejemplo literal (asignada y sin declinar, sin exigir envío), es quitar una línea de la función `chat_sirve_servicio`.

**Qué cambia respecto de hoy:** (1) los **ensayos** dejan de ser de todos y pasan a ser de los convocados; (2) quien **declina** pierde el chat; (3) la regla vive en la base.

**«Esa semana»:** el chat de un servicio **aparece desde 7 días antes de su inicio** (parámetro `chat_dias_antes_servicio()`, valor 7, en `057a`) y no antes; así una persona asignada a un servicio de dentro de dos meses no ve ese chat todavía. Si alguien sirve dos servicios en la semana (domingo y ensayo del viernes), ve dos salas en la sección «Servicio».

**Valores reales que la regla da por supuestos (verificados en el código de `main` y `dev`, ver el reporte):** `invitations.status` solo admite `pendiente` (por defecto), `confirmado` y `declinado` (CHECK, NOT NULL); `services.tipo` solo `servicio` o `ensayo` (el disparador de la migración 024 lo deriva de `services.kind`: `rehearsal` ⇒ `ensayo`); `sent_at` se completa al publicar la convocatoria; y no hay otra marca de «persona inactiva» fuera de `members` (ni siquiera ahí: no existe una columna de activo/inactivo). Las comparaciones del SQL son a prueba de nulos (`coalesce(i.status, '') <> 'declinado'`). El diagnóstico `057-0` (sección «9 datos») muestra los valores que hay de verdad en la base.

---

## 4 · Chats de servicios pasados — propuesta

Hoy el chat de un servicio **desaparece de la lista en cuanto termina**, aunque los mensajes quedan en la base. Propuesta (dos números que se cambian en una función, sin tocar el código):

- **Aparece 7 días antes del inicio** (nuevo, parámetro `chat_dias_antes_servicio`): antes de eso el servicio no tiene chat para nadie.
- **Se puede escribir hasta 24 horas después del fin** (agradecer, avisar de algo olvidado).
- **Sigue visible, solo para leer, hasta 7 días después del fin.** Pasado ese tiempo desaparece de la lista y el servidor deja de devolverlo.
- **Retención de los mensajes: DECIDIDO, se borran a los 90 días del fin del servicio** (solo los mensajes de servicio y ensayo; no los generales, ni los directos, ni los de equipo). Borrador `057d`: la función `chat_purgar_servicios(90)`, que solo ejecuta el servidor. **Cómo se ejecuta queda por decidir**: recomiendo `pg_cron` de Supabase una vez por semana (no agrega una ruta pública ni un cron en la app); también puede correrse a mano. Antes de la primera vez, una consulta de solo lectura dice cuántos mensajes borraría. No está programada.

El fin del servicio se calcula en **hora de Chile** (`America/Santiago`) a partir de `fecha` y `hora_fin` (14:00 si falta). Hoy el servidor compara con su propia hora (UTC en Vercel), así que el cierre actual se corre entre 3 y 4 horas: el cálculo nuevo lo corrige.

---

## 5 · ¿Un administrador o dueño ve los chats a los que no pertenece? — propuesta: **no**

**Mi opinión: de acuerdo, no.** Razones: (1) es lo que hace creíble la promesa de privacidad que quieres hacer a los voluntarios, sobre todo en los **directos**; (2) hoy el panel de moderación es en la práctica una lectura de todo, y justamente eso es lo que cuesta explicar si alguien pregunta; (3) un administrador **no deja de ver** lo suyo: ve el General (porque está en él) y los chats de los equipos y servicios en los que está.

**Qué se conserva de la moderación, y qué no:**
- **General:** el administrador puede **leer y borrar** mensajes del chat general de su organización (es una sala de todos, incluido él). Es lo que deja `057b`.
- **Servicio y equipo:** **sin acceso de administración**. Moderación = las personas del propio equipo/servicio (un líder está dentro de su sala y puede pedir que se borre algo). Si más adelante hace falta una vía de «denuncia», se diseña aparte (el mensaje denunciado queda a la vista de quien modera, no la sala entera).
- **Directos:** nunca.
- **Rotura de cristal:** el dueño de la base (con la llave de servicio, fuera de la app) siempre puede leer; eso es inherente y queda fuera de la app a propósito.

Consecuencia visible: el panel «Chats» del administrador pasa a mostrar solo el general. Los filtros «Servicios» y «Directos» del panel desaparecen.

### ¿Rompe `057b` hoy el panel de moderación del administrador en `main`? **No lo rompe; lo reduce al chat general.**
Lo comprobé leyendo el código de `main` (`components/ChatModerationPanel.tsx`, idéntico en `dev`) y las políticas de las tablas que usa; **no lo he probado contra una base** (ver «Qué falta comprobar»).
- **Qué hace el panel:** con la sesión del administrador (rol `authenticated`, no la llave de servicio) consulta `messages` con tres uniones (`member`, `recipient` y `service`), escucha INSERT y DELETE por tiempo real y borra por id.
- **Con `057b`:** la política de lectura devuelve solo las filas del chat general de su organización. Las uniones no dan error: `member` sigue resolviéndose (el administrador lee `members` de su organización por la política de la migración `050d`), y `recipient` y `service` salen vacías para el general. El panel solo muestra un error cuando la consulta falla, y esta no falla. El borrado del general sigue permitido; el de otras salas ya no se ofrece porque esas filas no llegan.
- **Lo que se nota:** los directos y los chats de servicio **desaparecen del panel**, y los filtros «Servicios» y «Directos» quedan vacíos. Es exactamente lo que decidiste, pero en `main` esos dos botones **quedarán visibles y vacíos** hasta que el paso de código (punto 7, paso 5) los quite. Es solo cosmético.
- **Tiempo real del panel:** sigue funcionando para el general (la política se evalúa con la sesión del administrador). Los eventos DELETE de Realtime no se filtran por RLS y solo llevan el id; `057c` saca `messages` de la publicación y el panel pasa a consultar cada pocos segundos.
- **Si en la prueba apareciera un error en el panel,** lo más probable es que `050d` no esté aplicada en la base (el administrador no podría leer `members`): el diagnóstico (sección «2 política», tabla `members`) y la verificación `057-v4` lo dicen antes. La propuesta sería entonces correr `050d` primero o dejar el panel sin la unión `member`.
- **Qué falta comprobar:** correr `057-v4` después de `057b` (un administrador ve 0 directos y 0 de servicio) y abrir el panel de `main` con una sesión de administrador.

---

## 6 · SQL de migración (para que lo revises y lo ejecutes)

### Hay UNA sola base, y no hay una de prueba
Corrección de Claudia, confirmada con el repo (`CLAUDE.md`): existe **una sola base para esta plataforma, el proyecto Supabase «Ancora - Teams»** (antes «TEST», cargado desde un respaldo anonimizado con `scripts/seed-test-db.js`). La usan dev y main, el desarrollo local y Vercel; **no hay entorno de pruebas separado y toda escritura es real.** Qué más existe:
- **`test-schema/` no es una base:** son archivos SQL para *construir* un proyecto de prueba (el esquema consolidado «reconstruido», disparadores con los avisos comentados). Ese proyecto de prueba fue «Ancora - Teams»: es la misma base de hoy. Además `test-schema/enable-notification-triggers.sql` es **peligroso**: apunta a la app vieja con usuarios reales; no se ejecuta.
- **La base de la app vieja** (`ancora-setlist`, con usuarios reales) existe, pero es de otra app: **no es una base de prueba y nada de este plan la toca.**
- **En este Mac no hay Postgres** (no hay `psql` ni servidor local), así que no pude ejecutar ni probar el SQL. Un proyecto de Supabase de pruebas nuevo sería posible, pero cargarle el esquema real exige correr las 50+ migraciones en orden (el esquema consolidado llega solo hasta v25 y es una reconstrucción): no lo propongo para este cambio.
- Pendiente que ya estaba en PENDIENTES: confirmar si los datos de «Ancora - Teams» son reales o anonimizados. **Se trata como real.**

Consecuencia: **todo se corre en la base real.** Por eso cada pieza queda clasificada por su peligro y se pide respaldo solo donde hace falta.

### Qué es seguro y qué necesita respaldo
| Pieza | Qué toca | Peligro en la base compartida | Respaldo antes |
|---|---|---|---|
| `057-0` diagnóstico | Nada (solo lectura) | **Ninguno** | No. Su salida, guardada, es el respaldo de las políticas, los permisos y el tiempo real actuales. |
| `057-v1` regla y permisos | Nada (solo lectura) | **Ninguno** (puede tardar unos segundos) | No. |
| `057a` | **Solo agrega** funciones, una tabla nueva y vacía (`team_messages`) y su disparador. No cambia ni borra nada existente. Va en una transacción: si algo falla, no queda nada a medias. | **Bajo.** `main` no usa nada de esto. | No hace falta. Sí: haber guardado la salida de `057-0` y que la sección «7 YA EXISTE» salga vacía. |
| `057-v3` team_messages | Escribe **solo en la tabla nueva y vacía** y lo deshace al instante | **Bajo** | No. |
| `057-v2` salir de equipo / declinar / nómina | **Borra o cambia filas reales** (`team_members`, `invitations`, `banda_assignments`) dentro de un bloque que siempre se revierte | **Medio-bajo:** si hubiera avisos activos en esas tablas correrían dentro del bloque (según PENDIENTES están apagados; `057-0` lo confirma). Es opcional: `057-v1` ya cubre la regla. | **Sí: el respaldo de datos (abajo), y un horario tranquilo.** |
| `057-realtime-anon.mjs` | Un UPDATE sin cambios de un mensaje viejo y un insert + delete en `team_messages` | **Bajo** (revisar en `057-0` que `messages` no tenga disparadores de UPDATE) | Sí, el de datos. |
| `057b` cerrar `messages` | **Cambia el acceso de una tabla existente** (quita políticas y permisos de `anon`) | **Medio:** si el chat de producción no usara la llave de servicio, se caería. Se deshace recreando las políticas, y no toca datos. | **Sí:** el de datos **y la salida de `057-0` (sección «2 política»)**, que es lo que se recrearía. Más la comprobación previa en `main`. |
| `057c` validar `messages` y sacarla del tiempo real | Agrega un disparador a una tabla existente y cambia la publicación | **Medio:** si fuera más estricto que el código, rechazaría mensajes legítimos. Se desactiva con una línea y no toca datos. | **Sí:** el de datos y la salida de `057-0` (sección «4 tiempo real»). Solo cuando el código nuevo esté en `main`. |
| `057d` crear la función de purga | Solo agrega una función | **Ninguno** (no borra nada al crearla) | No. |
| **Ejecutar** `chat_purgar_servicios(90)` | **Borra mensajes reales de forma definitiva** | **Alto: es lo único destructivo del plan** | **Sí, obligatorio:** el respaldo de datos hecho el mismo día y el conteo en seco (consulta de solo lectura que trae el archivo). La primera vez, a mano; programarla (pg_cron) viene después. |

**Cómo se respalda.** (1) **Datos:** `node scripts/backup.js` (en la carpeta del proyecto). Copia en JSON las 38 tablas, incluidas `messages` y `chat_presence`, a `backup/<fecha>/` (carpeta ignorada por git) y debe decir «llave de servicio: sí» y no mostrar «⚠️». **Limitación:** son los datos; **no** las políticas, funciones ni la publicación (eso lo cubre la salida de `057-0`), y **no hay un script de restauración** para la base real (el de carga, `seed-test-db.js`, es para una base de prueba): si hubiera que recuperar filas, se haría a mano desde esos JSON. (2) **Copias de Supabase:** en el panel, Database → Backups, ver si el plan incluye copias automáticas y de cuándo es la última; no puedo verlo desde aquí. Si no las hay, el respaldo (1) es la única copia.

**Cómo corre cada archivo.** El editor de Supabase muestra **solo el resultado de la última consulta** y **no muestra los avisos (`RAISE NOTICE`)**. Por eso cada archivo está escrito para terminar en **una sola tabla**: el diagnóstico devuelve «sección / detalle», cada migración termina con una tabla «comprobación / resultado» y las verificaciones con una columna «veredicto» que debe decir OK. Ver `docs/plan-chats-por-sala/ORDEN-DE-EJECUCION.md`.

### Archivos
| Archivo | Cuándo | Qué hace | Compatible con `main` |
|---|---|---|---|
| `057-0-diagnostico-chats.sql` | **Antes de todo** (solo lectura) | Confirma en la base viva: columnas reales de `messages`, políticas, permisos, publicación de tiempo real, disparadores y requisitos. | Sí, no cambia nada. |
| `057a-chats-por-sala-parte-a.sql` | Primero | **Solo agrega**: funciones de pertenencia y de listas, la tabla privada `team_messages` con su disparador, y bloquea las funciones a todo menos el servidor. | **Sí.** `main` no usa nada de esto. Debe correrse **antes** de desplegar el código nuevo de `dev`. |
| `057-v1`, `057-v3`, `057-v2` | Después de `057a` | Verificaciones (ver abajo). | — |
| `057-realtime-anon.mjs` | Antes y después de `057b` | Prueba de tiempo real con la llave pública. | — |
| `057b-cerrar-messages.sql` | Después de confirmar la condición | Quita todas las políticas de `messages`, quita los permisos de `anon` y deja solo «el administrador lee y borra el chat general de su organización». | **Sí, con una condición:** el chat de producción debe usar la llave de servicio (el código de `main` ya lo hace; confirmarlo abriendo Chats en producción y enviando un mensaje). Lo único que se nota en `main` es que el panel del administrador muestra solo el general. |
| `057-v4-messages-cerrada.sql` | Después de `057b` | Verificación de que `messages` quedó cerrada. | — |
| `057c-validar-messages-y-quitar-tiempo-real.sql` | **Después** de que el código nuevo esté en `main` | Disparador que rechaza escrituras inválidas en `messages` y saca `messages` del tiempo real. | **No hasta entonces:** es más estricta que el código de hoy. |
| `057d-purga-chats-de-servicio.sql` | Después de `057a` | Crea la función del borrado a los 90 días (no la ejecuta ni la programa). | **Sí.** Solo agrega una función. |

**Idempotentes:** todos usan `create or replace`, `if not exists`, `drop … create` y revisan lo existente antes de cambiar; correrlos dos veces deja el mismo resultado. Para deshacer `057b` o `057c` se recrea lo que `057-0` registró (te lo describo en texto si lo necesitas; no dejo comandos de deshacer listos para ejecutar).

**Limitación honesta:** **no pude correr el SQL contra ninguna base.** Lo validé con un analizador de sintaxis de PostgreSQL: los 9 archivos y los cuerpos de sus funciones pasan; **las dos funciones de disparador** no pude analizarlas (la herramienta falla incluso con un disparador trivial) y las revisé a mano. Eso no prueba que haga lo correcto: lo prueban las verificaciones, ya en la base real, de a una y deteniéndose ante el primer «FALLA». Las columnas usadas las confirmé en las migraciones (`members.organization_id`, `services.organization_id`, `teams.name/color/sort_order/archived_at`, `team_members.organization_id`, `invitations.status/sent_at`, `banda_assignments.member_id`); la sección «8 requisitos» de `057-0` las confirma en la base.

`chat_presence` (abierta) la cierra `053b`, que ya existe en la rama `cerrar-services-invitations`; conviene correrla junto con esto.

### Plan de verificación (que alguien sin acceso no ve nada, tiempo real incluido)
Cada verificación termina en una tabla con la columna «veredicto» (OK / FALLA / SIN DATOS = no había datos para probar, no es falla):
- **`057-v1`** (solo lectura) — los permisos (ni `anon` ni `authenticated` ejecutan las funciones) y la regla contra tus datos reales: 7 pruebas que deben dar **0** casos (sirve sin estar asignada, sin convocatoria enviada, habiendo declinado todo, de otra organización; equipos archivados; diferencias entre `chat_equipos_de` y los datos), más una fila informativa.
- **`057-v2`** (revierte lo que escribe; **con respaldo**) — salir de un equipo, declinar y ser quitada de la nómina quitan el acceso solos.
- **`057-v3`** (solo la tabla nueva) — `team_messages`: la base rechaza a quien no es del equipo; `anon` y `authenticated` no pueden leer ni escribir.
- **`057-v4`** (después de `057b`) — con el rol simulado: `anon` **no puede leer, escribir ni borrar** `messages`; una cuenta con sesión sin rol de administración ve **0** mensajes; un administrador ve **0** directos y **0** de servicio, **sí** el general, y no puede borrar los demás.
- **Tiempo real** — `057-realtime-anon.mjs`: un cliente con la **llave pública** se suscribe a `messages` y `team_messages` mientras el servidor toca una fila de cada una; debe imprimir «OK: la llave pública no recibió nada». **Antes de `057b` debe FALLAR** (confirma el problema de hoy); después pasa. Salvedad conocida de Realtime: los eventos DELETE no se filtran por RLS y solo llevan el id; por eso `057c` saca `messages` de la publicación.
- **Pruebas de código** (en el paso de código): por cada ruta, una persona sin acceso recibe 403 y **ningún** dato, probado contra las funciones con casos de equipo, servicio (asignada / sin enviar / declinó / otra organización / ventana) y directo.

---

## 7 · Qué cambia en el código, en qué orden y con qué riesgos

**Orden (cada paso, un commit en `dev`, con `verificar.sh` en 0):**
0. **Tú**, en la base real y siguiendo `ORDEN-DE-EJECUCION.md`: respaldo de datos; `057-0` y me pasas el resultado (confirma o corrige este plan); `057a` y sus verificaciones `057-v1` y `057-v3` (y `057-v2` si quieres).
1. **Servidor, lectura:** `chatScope.ts` pasa a preguntar a `chat_servicios_de`, `chat_equipos_de` y `chat_puede_servicio` (se va el cálculo duplicado en TypeScript y el hueco de los ensayos). `/api/portal/chat` (resumen) devuelve cuatro grupos: `general`, `servicio[]`, `equipo[]` (con nombre y color), `dm[]`, y por cada servicio si se puede escribir.
2. **Servidor, hilo y envío de equipo:** nuevo id de sala `eq_<idEquipo>`; el hilo y el envío usan `team_messages` (con la misma validación de identidad y largo de hoy); el servicio valida la ventana de escritura. `presencia` acepta el id de equipo.
3. **Avisos push:** `chat-notify` usa `chat_destinatarios` (deja de avisar a quien declinó). El aviso del chat de equipo lo manda **el propio servidor al guardar el mensaje** (sin disparador nuevo en la base compartida, que además apuntaría a otra app).
4. **Pantalla:** `ListaChats` con las cuatro secciones **General · Servicio · Mis equipos · Directos**, en ese orden, con el mismo diseño de filas; el General se muestra con el nombre de la organización (hoy «Áncora»). `PortalApp` deja de deducir los servicios de la lista de tarjetas y usa el resumen; los no leídos y las vistas previas pasan a ser genéricos por id de sala.
5. **Moderación:** `ChatModerationPanel` pasa a consultar al servidor (ruta de administración con la llave de servicio) **solo el chat general**, sin tiempo real (consulta cada pocos segundos).
6. **Borrado a los 90 días:** correr `057d` y elegir cómo ejecutarla (recomendado `pg_cron`); sin cambios de código.
7. **Pruebas:** unitarias de las rutas con funciones simuladas y la prueba en navegador de la lista de cuatro secciones.
8. **Cierre en la base (tú, con mi guía):** `057b` (tras confirmar la condición) y, **cuando el código nuevo ya esté en `main`**, `057c`.

**Riesgos y cómo se cubren**
- **La base es una sola:** `057a` solo agrega (nadie de `main` la nota). El código nuevo de `dev` **necesita** `057a` aplicada antes de desplegarse (si no, las llamadas a las funciones fallan en `dev`): por eso es el paso 0.
- **`057b` y el chat de `main`:** si la llave de servicio no estuviera en el proyecto de `main`, el chat de producción dejaría de funcionar al cerrar `messages`. Mitigación: la comprobación previa descrita; el cambio es reversible (recrear las políticas que el `NOTICE` imprimió).
- **Pérdida de acceso que alguien notará:** los ensayos dejan de ser de todos; quien declina pierde el chat; el servicio termina de verse a los 7 días. Es la intención, pero conviene avisarlo.
- **Aviso push de servicios:** al alinear destinatarios con la regla, quien hoy recibe avisos sin poder leer el chat dejará de recibirlos.
- **Rendimiento del resumen:** hoy pide la última línea de cada sala con una consulta por sala (N+1); con equipos suma salas. Con decenas de salas sigue siendo aceptable; si molesta, una función `chat_resumen` lo resuelve en una consulta.
- **Zona horaria:** el cierre del chat de servicio pasa de la hora del servidor a la de Chile. Es una corrección, pero cambia cuándo desaparece.
- **Datos viejos de `messages`:** `057c` solo valida inserciones nuevas; no toca mensajes antiguos.
- **Cuándo quitar el panel de diagnóstico del viewport:** no tiene relación con este plan; sigue la nota de PENDIENTES.

---

## Qué falta de Claudia
1. **La condición de `057b`:** confirmar que el chat de `main` en producción funciona por el servidor (variable de servicio en Vercel de `main`): abrir Chats y enviar un mensaje.
2. **Cuál es la base real** donde se correrá (la de producción compartida) y si el disparador `trg_notify_chat_message` está encendido o apagado ahí (el diagnóstico `057-0` lo dice).
3. **Cómo ejecutar el borrado de los 90 días** (`057d`): recomiendo `pg_cron` semanal.
4. **El OK final para empezar el paso de código** (punto 7), después de correr `057-0` y `057a` con sus verificaciones en la base real, siguiendo `ORDEN-DE-EJECUCION.md`.
