# 🎵 Ancora Teams — Guía de instalación completa

## ¿Qué hace esta app?

- Armas el setlist de cada domingo (canciones, banda, voces)
- Envías invitaciones por correo a cada músico asignado
- Cada músico recibe un email con botones **Confirmo / No puedo**
- Ves en tiempo real quién confirmó y sus comentarios
- Base de datos de músicos y canciones

---

## PASO 1 — Configurar Supabase (base de datos)

1. Ve a **supabase.com** → inicia sesión → **New project**
2. Ponle nombre: `ancora-setlist`, elige una contraseña y región (ej. South America)
3. Espera ~2 minutos a que se cree
4. Ve a **SQL Editor** (menú izquierdo) → **New query**
5. Copia y pega TODO el contenido del archivo `supabase-schema.sql` → clic en **Run**
6. Ve a **Project Settings** (ícono de tuerca) → **API**
7. Anota estos dos valores:
   - **Project URL** → `https://XXXXX.supabase.co`
   - **anon public key** → `eyJhbGci...`

---

## PASO 2 — Configurar Resend (correos)

1. Ve a **resend.com** → inicia sesión
2. En el menú: **API Keys** → **Create API Key**
3. Nómbrala `ancora` → clic en **Create** → copia la clave (`re_XXXXXXX`)
4. Ve a **Domains** → si tienes dominio propio agrégalo y verifica
5. Si no tienes dominio: puedes usar `onboarding@resend.dev` temporalmente para pruebas

---

## PASO 3 — Subir el código a GitHub

1. Ve a **github.com** → inicia sesión (o crea cuenta gratis)
2. Clic en **+** → **New repository** → nombre: `ancora-setlist` → **Create repository**
3. Descarga e instala **GitHub Desktop** desde desktop.github.com
4. En GitHub Desktop: **Add existing repository** → selecciona la carpeta `ancora-app`
5. Clic en **Publish repository** → asegúrate que sea **Private** → **Publish**

---

## PASO 4 — Desplegar en Vercel

1. Ve a **vercel.com** → inicia sesión con GitHub
2. Clic en **Add New Project** → selecciona el repo `ancora-setlist`
3. Antes de hacer deploy, clic en **Environment Variables** y agrega estas 5 variables:

| Nombre | Valor |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://XXXXX.supabase.co` (del paso 1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (del paso 1) |
| `RESEND_API_KEY` | `re_XXXXXXX` (del paso 2) |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` (o tu email verificado) |
| `NEXT_PUBLIC_APP_URL` | `https://ancora-setlist.vercel.app` (tu URL de Vercel) |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | La contraseña que quieras para entrar al admin |

4. Clic en **Deploy** → espera ~2 minutos

¡Listo! Tu app estará en `https://ancora-setlist.vercel.app`

---

## PASO 5 — Primera configuración

1. Entra a tu app → escribe la contraseña admin
2. Ve a **👥 Equipo** → agrega a cada músico con su email e instrumentos
3. Ve a **🎶 Canciones** → agrega las canciones con sus links
4. Ve a **🎵 Setlist** → crea un nuevo servicio → asigna banda/voces → arma el setlist
5. Clic en **Enviar invitaciones** → cada músico recibirá su correo

---

## Flujo semanal (ya con la app funcionando)

1. Crea un nuevo servicio (botón "+ Nuevo servicio")
2. Asigna músicos a cada posición
3. Agrega las canciones del setlist
4. Clic en **Enviar invitaciones**
5. Ves las confirmaciones en tiempo real en la misma pantalla

---

## Costos

| Servicio | Plan gratuito |
|----------|--------------|
| Supabase | Hasta 500MB de datos, 50,000 filas — más que suficiente |
| Resend   | 100 emails/día, 3,000/mes — perfecto para un equipo |
| Vercel   | Proyectos ilimitados en plan gratuito |
| **Total** | **$0 USD/mes** |

Si en el futuro quisieras un dominio propio (ej. `setlist.ancora.cl`): ~$12 USD/año

---

## Preguntas frecuentes

**¿Cómo cambio la contraseña del admin?**
En Vercel → tu proyecto → Settings → Environment Variables → edita `NEXT_PUBLIC_ADMIN_PASSWORD` → Redeploy

**¿Qué pasa si un músico no tiene email?**
Simplemente no recibirá invitación. Puedes agregarle el email después editándolo en la pestaña Equipo.

**¿Puedo usar la app desde el celular?**
Sí, está diseñada para funcionar bien en móvil tanto para el admin como para los músicos que responden.

**¿Los músicos necesitan crear cuenta?**
No. Reciben un link único en su correo y con un clic responden. Sin registro, sin contraseña.

---

## Notas técnicas (deuda pendiente)

- **`team_positions.default_slots` está sin uso real desde la Fase 15.** La
  fuente de verdad para "cuántos cupos necesita esta posición en este
  servicio" es `service_position_slots.slots_needed` (con `1` como default
  cuando no hay fila para ese `service_id`+`team_position_id`). La columna
  `default_slots` quedó de antes de esa migración y hoy no se lee en ningún
  lado fuera de su propio `select`. No se borró — solo queda anotado acá para
  no reinventarla por error ni asumir que todavía manda.

- **`ui.module.css` y `app.module.css` no consumen `--anc-*`.** Equipos
  (`TeamsAdminPanel.tsx` → `ui.module.css`) y la barra/contenedor de todo
  `/admin` + Servicios (`AppShell.tsx` y `AdminServiceView.tsx` →
  `app.module.css`) están escritos contra dos generaciones de tokens propias
  — la más vieja (`--surface`/`--ink`/`--pine`/`--brass`...) y "v3"
  (`--v3-*`/`--panel`/`--ring`/`--accent`...) — que nunca se conectaron con
  `ancora-tokens-v5.css`. Por eso siguen con la paleta anterior aunque
  Canciones/Home ya migraron. Punto 21 de `docs/PENDIENTES-code.md` tapó el
  síntoma con una capa de alias al final de `ancora-tokens-v5.css` (redefine
  esos nombres viejos apuntando a `--anc-*`) para no reescribir los dos
  `.module.css` — sus propios headers dicen "NO EDITAR para adaptar a una
  pantalla". Migración real pendiente: reescribir `ui.module.css` y
  `app.module.css` para que usen `--anc-*` directamente, y borrar entonces
  ese bloque de alias.

- **Dos archivos huérfanos, candidatos a borrar juntos en una limpieza
  aparte** (confirmar antes que siguen sin uso — no se tocaron acá):
  - `components/service-admin.module.css` — nadie lo importa (`grep` en
    todo el repo no encuentra ningún `import`); es de la misma generación
    vieja de tokens que `ui.module.css`, probablemente una versión anterior
    de los estilos de `AdminServiceView.tsx` que quedó sin borrar cuando ese
    componente pasó a usar `app.module.css`.
  - `components/ServicePanel.tsx` — mismo caso: ningún archivo lo importa.
    Tiene un `🗑 Eliminar` visible en su barra superior que viola la regla
    del punto 2 (destructivas van en el `⋯`), pero como no se renderiza en
    ningún lado (el tab Servicio usa `AdminServiceView.tsx`), arreglarlo no
    tendría efecto visible — se anota acá en vez de tocar código muerto.

- **Punto 16 (tipos de servicio) — la convocatoria de ensayo NO hereda del
  servicio padre, a propósito, por decisión explícita.** `migrations/024-
  service-kind.sql` agrega `services.kind` (`service`/`rehearsal`/`other`)
  y `parent_service_id`. En la vista de admin (`AdminServiceView.tsx` →
  `EnsayoPanel.tsx`, ahora embebido, ya no es un tab propio) un ensayo SÍ
  muestra de solo lectura las canciones y la banda del servicio del que
  depende. Pero la convocatoria — a quién se invita, el checklist de
  "Banda y Voces", el botón de enviar, `app/api/send-ensayo-invites` — se
  dejó **intacta y totalmente independiente** del padre: sigue siendo su
  propia lista de `invitations`, exactamente como antes de esta fase. Lo
  mismo el portal del músico (`app/portal/[token]/**`,
  `app/api/portal-by-member`, `app/api/member-portal`, el chat por
  servicio): no se tocó ni una línea, sigue mostrando el ensayo como una
  convocatoria separada con su propio estado de confirmación y su propio
  chat.
  **Por qué se dejó así:** el portal es la pantalla que el equipo usa en
  vivo el domingo — tocar esa cadena (invitación + chat + notificaciones)
  sin poder probarla contra producción es exactamente donde algo se rompe
  cuando más duele. Fue una decisión explícita del dueño de la app, no un
  olvido.
  **Consecuencia asumida a propósito:** durante un tiempo un ensayo hereda
  setlist y nómina en la vista de admin, pero al músico le sigue llegando
  como invitación aparte — inconsistente, pero no rompe nada.
  **Lo que falta para cerrar el punto 16 del todo** (sesión aparte, con
  forma de probarlo contra producción o al menos una base de prueba con
  datos reales):
  - Que confirmar/declinar la invitación del servicio padre cubra también
    el ensayo enlazado (o decidir explícitamente que seguirán siendo dos
    convocatorias separadas y sacar esa ambigüedad del roadmap).
  - Unificar (o no) el chat del ensayo con el del servicio padre.
  - `app/api/send-ensayo-invites` hoy sigue leyendo member por member;
    revisar si conviene que tome la lista de convocables desde la banda
    heredada del padre en vez de "todos los convocables a ensayo".

- **Punto 14 (roles de organización) — `/admin` sigue gateado solo para
  Admin/Owner, no distingue tabs por rol todavía.** Un líder de equipo
  (que no es también admin/owner) ya entra a `/home` y ve lo de su equipo
  (nómina, el panel de bloqueos del calendario separado en "tu equipo" vs.
  conteo del resto), pero los enlaces de `/home` hacia `/admin` (Servicio,
  Canciones, Calendario) todavía redirigen a `/login` para ese líder — por
  eso `app/home/page.tsx` se los oculta del menú en vez de dejarlos rotos.
  Falta: que `/admin` acepte también a un líder y muestre ahí solo lo que
  la matriz del punto 14 le permite (Canciones para subir adjuntos — la
  política RLS ya lo permite desde `migrations/023-organization-roles.sql`
  — y, a futuro, una vista de nómina de su equipo dentro de Servicio sin
  poder tocar fecha/setlist/estructura ni otros equipos). Mismo límite
  ahora en la pestaña Equipos de Personas (ver más abajo): un líder
  tampoco llega ahí, aunque administrar su propio equipo es justo el tipo
  de acción que el punto 14 le da. No resuelto a propósito.

- **Punto 25 (plantillas por herramienta) — pendiente decidir si un líder
  de equipo puede aplicar plantillas en su propio equipo.** Hoy
  `canManageTemplates` (quién ve el menú de plantillas en
  `ChecklistTool.tsx`, y a futuro `ScheduleTool.tsx`/Orden del servicio)
  es únicamente owner/admin (`is_org_admin`), tanto en la interfaz como en
  la RLS de `tool_templates`/`service_applied_templates`
  (`migrations/025-tool-templates.sql`). El punto 25 lo pide así
  explícitamente ("los líderes de equipo no — no tocan la estructura del
  servicio"), pero aplicar una plantilla de Checklist o Cronograma dentro
  de SU equipo no cambia fecha/setlist/estructura ni a otros equipos —
  es exactamente el tipo de acción que el punto 14 sí les da (administrar
  su propio equipo). Queda sin resolver a propósito: no se abrió esa
  puerta sin que alguien lo decida explícitamente.

- **`AuthGateContext` comparte sesión/rol entre `/home` y `/admin`, pero
  cada página sigue montando su propio `AppShell`.** Antes de esto, cada
  página repetía `getSession()` + `is_org_admin`/`is_org_owner`/
  `is_any_team_leader` desde cero al montarse — navegar de una a la otra
  se veía como una recarga completa ("Verificando acceso..." tapando
  todo). `lib/AuthGateContext.tsx` resuelve esos hechos una sola vez por
  sesión de pestaña (perezoso: no dispara nada hasta que `useAuthGate()`
  se llama por primera vez, así que rutas públicas como `/login` y
  `/portal/**` no pagan ningún costo) y ambas páginas lo consumen en vez
  de repetir las consultas. Pero `/home` y `/admin` siguen siendo dos
  árboles de React separados, cada uno con su propio `<AppShell>` — la
  barra superior se sigue montando de nuevo al cruzar entre ellas
  (mismos props, mismo resultado visual, pero es un componente nuevo).
  En la práctica esto puede verse como un parpadeo breve de la barra
  aunque el contenido ya no se reemplace por una pantalla completa.
  Arreglo real: que `/admin` deje de ser una sola página con pestañas
  por `?tab=` y pase a rutas de verdad (`/admin/servicio`, `/admin/
  equipos`, etc.) bajo un layout común con `/home` que monte `AppShell`
  una sola vez — no se hizo en esta pasada, es un cambio de estructura de
  rutas más grande que el bug puntual que se pidió arreglar.

- El login aterriza en `/home`; abrir `/admin` directo con sesión abierta
  (un marcador, un ícono guardado) cae en Servicios, a propósito — el
  destino por defecto tras el login solo se decide en `/auth/callback` y
  en `/`, no en cada visita a `/admin`.

- **Instrumentos retirados de la interfaz de admin (punto 40) — dos deudas
  que quedan.** La columna `members.instrumentos` (`text[] not null default
  '{}'`) y el tipo `Member.instrumentos` siguen existiendo: el pop-up de
  alta/edición ya no los pide ni los envía, y las filas, el perfil y el
  Calendario muestran en su lugar las posiciones asignadas por equipo
  (`team_member_positions`).
  - **La convocatoria a ensayo por instrumento queda obsoleta.**
    `esConvocableAEnsayo` (`lib/equipos.ts`), `EnsayoPanel` y
    `api/send-ensayo-invites` siguen decidiendo a quién convocar según
    `instrumentos`, así que una persona dada de alta desde ahora (sin
    instrumentos) nunca sería convocada. Está bien mientras los ensayos
    estén en pausa; al retomarlos, la convocatoria debe derivarse de
    equipos y posiciones, no de instrumentos.
  - **Las APIs del portal pisan `instrumentos` con vacío si no llega el
    campo.** `api/member-portal` (PATCH) y `api/portal-by-member` escriben
    `instrumentos: instrumentos || []`: una llamada que no mande el campo
    borra los instrumentos guardados. Hoy el portal siempre lo manda (su
    panel «Mis instrumentos» parte de lo que ya tiene la persona), pero
    ANTES de quitar ese panel del portal hay que cambiar las dos rutas
    para que escriban `instrumentos` solo cuando el campo llegue.

- **Tema Sistema / Claro / Oscuro (punto 42) — cuatro deudas que quedan.**
  El tema vive en `members.theme` (`null` = Sistema) y en la cookie espejo
  `anc-theme` (`lib/useDarkMode.ts`, `app/layout.tsx`).
  - **El tema salta en la primera carga de un dispositivo nuevo (o con cookie
    vieja)** hasta que llega `members.theme`: sin cookie el servidor pinta
    `<html>` sin `data-theme` y el hook corrige cuando responde la base.
    Solución prevista: escribir la cookie desde el servidor en
    `/auth/callback` tras el login. NO hacerlo sin plan: toca el inicio de
    sesión.
  - **El portal conserva su propio sistema de dos estados.** Ignora «Sistema»
    (sale claro), lee `localStorage['ancora-dark-mode']`, y sus subpáginas
    (`disponibilidad`, `servicio/[id]`) solo leen `localStorage`: con la cookie
    en oscuro quedan con el `<html>` oscuro y los colores en línea claros. Se
    resuelve en la fase del lado del músico, junto con el control «Apariencia»
    en Perfil.
  - **`components/Sidebar.tsx` todavía tiene su propio botón de alternar tema**
    (lo usa el portal), que no pasa por el menú «Apariencia» de `AppShell`.
  - **La cookie del tema hace dinámicas todas las rutas:** `app/layout.tsx` la
    lee en el servidor (`cookies()`), así que ninguna página se genera
    estática.

- **Color de equipo (punto 43) — tres notas.** El color vive en `teams.color`
  (migración 028): el NOMBRE de la paleta, nunca el hex; el hex está solo en
  `app/ancora-tokens-v5.css` y las claves en `lib/teamColors.ts`.
  - **Si cambia la paleta** (se agrega, quita o renombra un color) hay que
    modificar TAMBIÉN el check `teams_color_check` de `teams.color` (una
    migración nueva: `drop constraint` + `add constraint` con las claves
    nuevas), además de `lib/teamColors.ts` y los `[data-team]` del CSS.
  - **El calendario del Home queda para la fase del músico.** Sus puntos
    (`CalendarDay`) y las filas de bloqueados (`BlockedPerson`) no traen datos
    de equipo hoy, así que no llevan color; hace falta ese dato en el
    calendario antes de pintarlo. «Mis equipos y posiciones» tampoco existe
    todavía (es de la fase del músico).
  - **`components/team-color.module.css` duplica las formas de `.anc .anc-team*`**
    (monograma, banda, chip) de `app/ancora-tokens-v5.css`, porque `/admin` no
    tiene el ancestro `.anc` y esas reglas no le llegan (la banda de Servicio
    está en `components/app.module.css`, como `.panelHeadTeam`). Unificar
    cuando `ui.module.css` y `app.module.css` pasen a `--anc-*`.

- **Personas: lista + ficha fija (puntos 44 y 46).**
  - **La «vista de perfil» (`?profile=`) se retiró (punto 46):** ya no hay dos
    vistas de persona, solo la ficha (`components/persona/PersonDetail.tsx`:
    panel fijo en Personas con 1024px o más; cajón en pantallas chicas y desde
    Home). `?person=<id>` es la persona seleccionada de la lista (Home enlaza ahí).
    Lo que hacía la vista de perfil: quitar posiciones y «Sacar del equipo» →
    Equipos › el equipo; agregar a un equipo → el menú de la ficha, el pop-up de
    «Editar» y «Agregar integrante» de Equipos; editar y eliminar → la ficha y el
    `···` de la lista; la **corona de administrador**, «🔗 Portal» y la
    **disponibilidad por equipo** se retiraron (ver abajo).
  - **`team_members.availability` quedó SIN USO.** Las 12 filas valían
    `unrestricted` y ninguna regla de la app la leía; su única edición (la vista
    de perfil) y todas las lecturas (columna de Equipos, línea de la ficha) se
    quitaron. La columna NO se borró (sin migración). La disponibilidad real vive
    en `date_blocks` (fechas bloqueadas) y, por equipo, en la fase del músico.
  - **«Asignar a un servicio» NO está en la ficha:** el mockup lo muestra, pero
    no hay un flujo detrás (asignar vive dentro de cada servicio; `onAssign` del
    cajón no lo conecta nadie). Pendiente de un flujo propio.
  - **La corona de administrador se retiró (punto 46)** sin tocar los datos de
    `team_admins`. La etiqueta «Admin» / «Propietario» de la lista y de la ficha
    (punto 44c, solo lectura) lee `organization_members` (`role` owner/admin), que
    es lo que manda en `is_org_admin` desde la migración 023. Dar o quitar rol
    llega con el punto 45 (`setOrgRole`), que también debe sincronizar
    `team_admins` (ver la deuda de abajo). La etiqueta y «En la app» viven
    dentro de `PersonDetail`: salen en el panel fijo y en el cajón (solo
    owner/admin).
  - **Rol de administrador desde «Editar» (punto 45):** solo el **propietario** ve
    la píldora «Rol» del pop-up (un administrador no); elegir no escribe nada, y al
    guardar con el rol cambiado sale PRIMERO la alerta «¿Estás seguro…?» (foco en
    «Cancelar»). Orden de escrituras: datos, equipos, rol (`updatePerson` en
    `app/admin/page.tsx`); se detiene en el primer fallo y el reintento no repite lo
    guardado ni vuelve a preguntar. La píldora y la pestaña Admins son piezas
    delgadas sobre `setOrgRole`: retirar una es borrar esa pieza (la píldora vive
    en `AddPersonDialog`, `roleControl`). «Hacer líder» / «Quitar liderazgo» está en
    la banda de cada equipo de la ficha del panel fijo (no en el cajón;
    `lib/setTeamLeader.ts`, detecta 0 filas).
  - **Agregar a un equipo:** el menú de la ficha, el pop-up de «Editar» y
    «Agregar integrante» usan `lib/addToTeam.ts` (un duplicado 23505 es «ya
    estaba»; otros errores o 0 filas quedan visibles con «revisá permisos» si
    parece RLS). La ficha solo lo ofrece a quien puede editar (owner/admin).
    **Que un líder agregue gente a SU equipo** (la política de `team_members` lo
    permite para su propio equipo) depende del acceso de líderes a `/admin`; no
    está hecho todavía.

- **DEUDA: avisos de RSVP a administradores (`team_admins`).**
  `app/api/rsvp-notify/route.ts` (lo llama el trigger de la base cuando alguien
  confirma o declina) decide a quién avisar leyendo `team_admins` (`team_id`
  null), no `organization_members`. **`team_admins` se mantiene sincronizada por
  `setOrgRole`** (`lib/setOrgRole.ts`: la usan la pestaña Admins y la píldora del
  pop-up de «Editar»): al dar o quitar el rol de administrador escribe
  `organization_members` y deja `team_admins` igual. Si el rol se aplica pero esa
  sincronización falla, queda un aviso PERSISTENTE con «Reintentar avisos»; y
  «Sincronizar avisos» en la pestaña Admins (idempotente) recorre a todos los
  administradores actuales. **Retirar `team_admins` cuando `rsvp-notify` lea
  `organization_members` con la llave de servicio** (hoy esa ruta usa la clave
  pública y la política de lectura de `organization_members` es solo de admins:
  va con la fase de seguridad).
- **«Ver portal» NO está en la ficha, a propósito (punto 46).** Abrir
  `/portal/member_<id>` ESCRIBE `members.last_seen` (`app/portal/[token]/page.tsx`
  en `loadData`, línea ~200, también para el portal por persona): un enlace en
  «En la app» falsearía justo el dato «Última conexión» que esa sección muestra.
  El enlace «🔗 Portal» de la vista de perfil, que se retiró, tenía ese mismo
  efecto. Para la fase del músico: un modo de vista para administradores, SIN
  escrituras (ni `last_seen` ni `instalado_pwa_at`), y recién ahí el enlace.

- **Llave de servicio (punto 47, S1).** `SUPABASE_SERVICE_ROLE_KEY` es solo del
  servidor: jamás con prefijo `NEXT_PUBLIC_`, y no se imprime ni se escribe en
  archivos del repo. `lib/supabase/admin.ts` (`createAdminSupabase()`, con
  `import 'server-only'`) es el único lugar que la usa: sirve para `app/api/**` y
  server components, y un componente cliente que lo importe hace fallar el build.
  El cliente se crea al llamar a la función, no al importar el archivo.
  - **Comprobar que existe:** `node scripts/check-service-key.mjs` imprime solo
    «definida: sí/no» (y «REVISA: nombre con prefijo público» si hay una variable
    `NEXT_PUBLIC_` con `SERVICE_ROLE`). **Solo mira el entorno LOCAL.** La variable
    de Vercel (Production y Preview) se verifica a mano en el panel de Vercel; el
    script no puede verla.

- **Cron de recordatorios (`/api/reminder`) y `CRON_SECRET`.** La ruta exige
  `Authorization: Bearer <CRON_SECRET>`; Vercel envía esa cabecera sola, con el valor de
  la variable `CRON_SECRET` del proyecto, en cada invocación del cron
  (`vercel.json`). **Cierra por defecto:** sin `CRON_SECRET` definida responde 401 y
  no envía nada (solo en `next dev` se deja pasar para probarla a mano). Los crons
  **solo corren en producción** (la rama `main`; Vercel llama a la URL del despliegue de
  producción, no a Preview). **Definir `CRON_SECRET` en Production ANTES de desplegar a
  `main`**, si no los recordatorios dejan de salir. El valor lo crea quien administra
  Vercel (≥16 caracteres aleatorios); no se escribe en el repo ni se imprime.
  **En local:** abrir `/api/reminder` SIN `CRON_SECRET` ENVÍA recordatorios reales (a
  quienes estén en la base a la que apunta tu `.env.local`); definir `CRON_SECRET` en
  `.env.local` la cierra: con la variable definida se exige la cabecera siempre,
  también en `next dev`.

- **Portal por rutas de servidor (punto 49) — avance.** Lo que el portal escribía con la
  llave pública pasa a `app/api/portal/**`, que identifica a la persona con
  `lib/auth/requirePortalIdentity.ts` (solo la usan esas rutas): la cookie del enlace de
  acceso o Google, o —en el portal por token de invitación, `/portal/<token>`— la cabecera
  `x-portal-token` que añade `lib/portal/portalFetch.ts` (token inválido = 401; si viene,
  manda ese token). Hecho: `visita` (el servidor escribe `last_seen` e `instalado_pwa_at`),
  `preferencias` (tema; el hook `useDarkMode` lo usa SOLO con la opción `portal`, la
  administración conserva su guardado directo), `avatar` (solo JPG/PNG/WebP comprobados por
  sus primeros bytes, máx. 2 MB, nombre aleatorio `<id>/<uuid>.<ext>`; la foto anterior se
  borra solo si era de esa persona) y `salir` (borra la sesión del enlace y la cookie; el botón
  llama además a `signOut` de Google). El portal ya no usa `localStorage['ancora-dark-mode']`.
  `favoritos` (GET lista, PUT agrega, DELETE quita; el `member_id` sale de la identidad).
  `bloqueos` (misma forma de datos que tenía `/api/date-blocks`, que se borró: GET → `{blocks}`,
  POST → `{block}`, DELETE → `{ok}`; el `member_id` sale de la identidad y las fechas se validan;
  el punto 51 le agrega `team_id` al mismo contrato).
  `push` (POST agrega o actualiza, DELETE quita una o todas; sustituye a `/api/push-subscribe`,
  borrada; solo acepta endpoints https con nombre de servidor, sin IP ni localhost).
  `chat` (commits 3 y 4): `GET /api/portal/chat` da el resumen y `?chat=<id>` un hilo; `POST` envía.
  El servidor devuelve y acepta SOLO los chats de la persona (`lib/portal/chatScope.ts`): el
  general, los servicios FUTUROS donde está asignada y ya convocada (más los ensayos) y sus
  mensajes directos; un chat ajeno es 403. El remitente sale de la identidad, nunca del cuerpo;
  texto recortado, de 1 a 2000 caracteres; un directo solo con alguien de su misma organización.
  `POST /api/portal/chat/presencia` escribe la presencia con la identidad. Las personas devueltas
  (id, nombre, apellido, foto) son sus interlocutores directos, quienes comparten un servicio con
  ella y quienes comparten un EQUIPO (team_members, equipo no archivado, de su organización);
  nunca toda la organización ni otra. El hilo trae los ÚLTIMOS 100 mensajes. El navegador sondea
  el hilo abierto cada ~5 s y el resumen cada 45 s, solo con la pestaña visible; se quitó el canal
  realtime. El aviso push sigue saliendo del trigger `AFTER INSERT` de `messages`, que no depende de
  quién inserta (ver supabase-schema-v15-dm-chat.sql).
  **Límite conocido del chat:** `messages` NO tiene `organization_id` (la organización solo se deduce
  de `member_id` → `members.organization_id`, o de `service_id`), así que el chat general «team»
  (`service_id` y `recipient_member_id` nulos) es UN solo hilo para toda la base, y `chat-notify`
  avisa por push a todos los `members`. Hoy hay una sola organización; antes de una segunda hace
  falta `messages.organization_id` (migración con respaldo desde `members`), filtrar el hilo y el
  aviso por ella, y el cierre de RLS del punto 50.
  Falta: invitaciones y el cierre (commit 7).
  **Límite de seguridad vigente:** hasta los puntos 50 y 52, los tokens de invitación siguen
  siendo una credencial legible con la llave pública, y las rutas `/api/portal/**` los
  aceptan por la cabecera `x-portal-token`: la seguridad de esas rutas depende de cerrar el
  punto 50.

- **Identidad del músico (punto 48) — diseño y límites.** El portal se identifica
  EN EL SERVIDOR (`lib/auth/portalIdentity.ts`): por sesión de Google (correo sin
  distinguir mayúsculas, `lib/findMemberByEmail.ts`) o por un **enlace personal
  secreto** (`member_access_links`, migración 029): 32 bytes aleatorios de los que
  solo se guarda el hash, con vencimiento (7 / 30 / 90 días, 30 por defecto) y
  revocación; el administrador lo ve UNA vez al generarlo. El token se canjea una
  sola vez por una **sesión opaca** (`member_portal_sessions`): la cookie
  (`httpOnly`, `Secure`, `SameSite=Lax`) guarda un identificador aleatorio, no el
  token, y cada petición se comprueba en la base contra su enlace, así que revocar
  o vencer el enlace corta la sesión de inmediato. No hay secretos nuevos.
  - **iOS (punto 56):** una cookie puesta en Safari NO la ve la app instalada en la
    pantalla de inicio (otro almacenamiento). Hay que resolverlo al probar en un
    iPhone real: p. ej. abrir el enlace dentro de la app instalada o canjear el
    token de nuevo allí.
  - `members.email` tiene además un índice único sobre `lower(email)`; la
    migración 029 falla con un mensaje claro si hay correos repetidos que solo
    cambian en mayúsculas (no reescribe datos).

  - **Generar el enlace (commit b):** en la ficha de una persona, «En la app» →
    «Enlace de acceso» (solo owner/admin; `components/persona/AccessLinkControl.tsx`,
    pieza delgada). Habla con `/api/admin/member-access-link` (`POST` genera o
    regenera, `GET` da solo metadatos, `DELETE` revoca), que exige
    `requireOrgAdmin` y usa la llave de servicio. El enlace completo se muestra UNA
    vez, solo en memoria del componente (no queda en URL, almacenamiento ni logs);
    si se pierde, se regenera y el anterior deja de valer. Regenerar y revocar
    borran las sesiones del enlace. Hace falta `SUPABASE_SERVICE_ROLE_KEY` definida
    (local y en Vercel) para que funcione.
  - **Cómo entra la persona (commit c):** `/portal/acceso/<token>`
    (`app/portal/acceso/[token]/route.ts`) canjea el token por la sesión opaca,
    pone la cookie `ancora-portal` (`httpOnly`, `Secure`, `SameSite=Lax`) y manda a
    `/portal` SIN el token en la URL (`Referrer-Policy: no-referrer`). Vencido →
    «Este enlace venció. Pide uno nuevo a tu líder»; revocado o inexistente →
    «Enlace no válido». `/portal` (sin id) decide en el servidor quién es (Google o
    enlace) y muestra la pantalla de `app/portal/_components/PortalApp.tsx`, la misma
    del portal por token de invitación (`/portal/<token>`, enlace del correo, sin
    cambios). Los datos salen de `/api/portal/me` (sin `memberId` en la petición),
    que reemplaza a `/api/portal-by-member`; las invitaciones que crea llevan un
    token aleatorio de 32 bytes (ya no `auto_<memberId>_…`). `/portal/member_<id>`
    (y sus subrutas) muestran «Enlace no válido»; `/portal/member/[id]` y
    `/portal/by-member/[id]` se borraron. El callback de Google manda a `/portal`.
  - **Frontera con la administración:** `lib/auth/portalIdentity.ts` y la cookie
    `ancora-portal` los usan SOLO `app/portal/**` y `app/api/portal/**`. `/admin`, el
    AuthGate y `requireOrgAdmin` siguen dependiendo únicamente de la sesión de Google:
    un enlace de acceso da el portal del músico, jamás la administración. La
    administración solo comparte `lib/auth/secrets.ts` (hash y aleatorios) y
    administra la tabla (generar, revocar y borrar sus sesiones).
  - **El token queda en los registros de Vercel.** La dirección
    `/portal/acceso/<token>` (con el token en la ruta) aparece en los registros de
    peticiones de Vercel. Por eso el enlace tiene vencimiento y se puede revocar: un
    token que se filtre deja de servir. La sesión posterior usa la cookie, no el
    token.
  - **Probar en Chrome en local.** La cookie es `Secure`; Safari la rechaza en
    `http://localhost` (Chrome la acepta). En Safari hay que probar con `https`.
  - **Tokens `auto_…` ya creados:** la migración `030-rotate-auto-invitation-tokens.sql`
    los reemplaza por 64 hex aleatorios (ya corrida y verificada: 0 tokens `auto_`
    restantes; no se puede revertir; los enlaces ya enviados con ese token dejaron de
    funcionar).
  - **Deuda que sigue:** un visor de enlaces (vista previa de un chat) que abra
    `/portal/acceso/<token>` crea una sesión más y marca «último uso». (`/api/date-blocks`
    y `/api/push-subscribe`, que recibían `memberId`, ya se borraron: punto 49.)
