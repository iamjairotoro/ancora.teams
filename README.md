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

## PASO 2 — Configurar el correo (Gmail)

Los correos (invitaciones, recordatorios, ensayos) salen por **Gmail SMTP** con `nodemailer` (`lib/email.ts`). Resend NO se usa.

1. Usa una cuenta de Gmail para la app (será el remitente: `Ancora Setlist <esa cuenta>`)
2. Activa la **verificación en dos pasos** en esa cuenta de Google
3. Ve a **Cuenta de Google → Seguridad → Contraseñas de aplicaciones** y crea una llamada `ancora` (te da 16 letras)
4. Guárdala SOLO en las variables de entorno de Vercel (paso 4); nunca en el código ni en el chat

Cómo leer el resultado de una convocatoria: «aceptado por el servidor de correo» NO es «entregado». Un correo con un dominio
que no existe se bloquea antes de enviar; un buzón inexistente en un dominio real (p. ej. `zzzz@gmail.com`) lo acepta Gmail y
rebota más tarde a la bandeja de la cuenta remitente, donde la app no lo ve. Gmail tiene un límite diario de envíos (unos 500
en cuentas personales; lo fija Google). Cambiar a un proveedor con webhooks (Resend u otro) es un pendiente aparte (punto 61).

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
| `GMAIL_USER` | La cuenta de Gmail del paso 2 |
| `GMAIL_APP_PASSWORD` | La contraseña de aplicación de 16 letras (del paso 2) |
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
| Gmail SMTP | Gratis; límite diario de envíos que fija Google (unos 500 en cuentas personales) |
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

- **ADVERTENCIA: `test-schema/enable-notification-triggers.sql` (avisos por trigger).** En «Ancora - Teams»
  los triggers de aviso (`trg_notify_chat_message` y los demás) están comentados: los mensajes del chat
  NO generan push (es lo esperado). Ese archivo **NO debe ejecutarse tal cual**: apunta a
  `ancora-setlist.vercel.app` —la app VIEJA, con usuarios reales— y trae un secreto de relleno. Antes de
  activarlo hay que cambiar la URL por la de la plataforma nueva, poner un secreto real (el mismo
  `INTERNAL_API_SECRET` de Vercel) y probar con una persona de prueba. No se commitea.

- **Bloqueos de fecha por equipo (punto 51, versión B).** Las tres migraciones están **APLICADAS y VERIFICADAS en
  la base real** (octubre 2026), en este orden: `031-bloqueos-por-equipo-parte-a.sql` → desplegar →
  `032-bloqueos-por-equipo-parte-b.sql` (borra el índice único viejo y hace que «personas sin equipo» de
  `team_blocks_in_range` mire equipos ACTIVOS) → `033-bloqueos-por-equipo-parte-c.sql` (cierra el acceso público a
  `date_blocks`: 0 políticas, RLS activada SIN FORCE, permisos solo para postgres y service_role; con la clave
  pública se recibe «permission denied»). **Desde la 033, quien lea o escriba `date_blocks` debe usar la llave de
  servicio (servidor, `scripts/backup.js`) o las funciones `team_blocks_in_range` / `blocked_others_summary` /
  `set_date_blocks`; un lector olvidado fallaría con «permission denied».** Si alguna pantalla mostrara vacío, el
  REVERTIR comentado de la 033 reabre la tabla. `date_blocks.team_id` NULL = todos los equipos de la persona (también
  los que se sume después). `/api/portal/bloqueos` acepta `teamIds` (omitido = todos; lista = solo esos,
  deben ser suyos; `[]` = ninguno), devuelve `teams` y escribe con `set_date_blocks()`; DELETE con `teamId`
  quita solo un equipo. (Mientras la 032 no estaba aplicada, fallaba con 500, código 23505, un bloqueo que dejara DOS O MÁS
  equipos bloqueados pero no todos, porque el índice viejo no admitía dos filas por persona y fecha; ya no aplica.)
  En el calendario, apagar un equipo en un día ya
  bloqueado pide confirmación (`alertdialog`); encender no; la pantalla pinta las filas que devolvió la base. El motivo es uno por fecha. Quién ve qué lo decide la
  base, no la app: `team_blocks_in_range` (admin: todos los equipos; líder: SOLO los suyos, con el motivo) y
  `blocked_others_summary` (cuenta por equipo ajeno, sin contar a quien también es del equipo del líder). Home,
  administración (`AvailabilityPanel`, aviso al asignar) leen por esas funciones (`lib/teamBlocks.ts`); el aviso
  al asignar mira el bloqueo del equipo de ESA tarjeta. El calendario del portal (`DisponibilidadCalendar`) es
  PROVISIONAL: un interruptor por equipo, cuadro lleno = todos, esquina marcada = algunos (el punto 54 lo rehace).
- **Panel del día de los bloqueos (punto 60, commit 1).** `components/DayBlocksPanel.tsx` es el panel compartido por el
  Home y la pestaña «Calendario» (Disponibilidad): «Por persona» (por defecto: un punto por equipo, lleno = bloqueado,
  aro = disponible, frase y motivo) y «Por equipo» («n de N bloquearon»). Se arma desde las filas POR EQUIPO de
  `team_blocks_in_range` conservando el `team_id` (`dayBlocks`, `lib/teamBlocks.ts`); las posiciones son solo las de los
  equipos bloqueados. El LÍDER ve solo los equipos que lidera —«Bloqueó {su equipo}», un punto por equipo bloqueado,
  nunca «Disponible en…» ni «Todos sus equipos»— y eso se resuelve también en el componente (no solo en la base). Una
  persona sin equipo activo la ve solo la administración, con punto neutro y «Sin equipo».
- **Calendario compartido (punto 60, commit 2).** `components/TeamBlocksCalendar.tsx` es la cuadrícula de días del Home y de
  la pestaña «Calendario» (reemplaza al cuadrito único `anc-day--blk`): un punto por equipo con bloqueos y, en gris, el
  número de PERSONAS DISTINTAS que bloquearon para ese equipo (`blocksByDate`, `lib/teamBlocks.ts`; admin: «Sin equipo» con
  punto neutro). Un LÍDER solo cuenta los equipos que lidera, también si la base le entregara filas de más. Los datos se
  recargan al volver a la pestaña (`lib/useRefreshOnVisible.ts`: `visibilitychange`/`focus`, máximo una vez cada 30 s); en
  administración, además, al abrir un día o un servicio.
- **Acceso a la biblioteca de canciones por equipo (punto 59).** `teams.library_access` (migración 034, cierra por defecto):
  owner/admin siempre, y quien esté en al menos un equipo ACTIVO con el campo (`lib/auth/libraryAccess.ts`). Se hace
  cumplir en el SERVIDOR: `/api/all-songs` y `/api/portal/favoritos` responden 403 sin acceso, y `/api/portal/me` y
  `/api/member-portal` devuelven, sin acceso, solo el detalle del servicio y de cada canción id, nombre y artista (lista
  blanca en `setlistWithoutLibrary`, `lib/portal/songColumns.ts`: sin `service_blocks.tono`, tono, BPM, compás, enlaces,
  carátula ni notas de la canción; las notas del BLOQUE siguen). El portal oculta «Canciones» y las favoritas con
  `libraryAccess`. El interruptor vive en Equipos › Ajustes y se guarda por `PUT /api/admin/teams/library-access`
  (`requireOrgAdmin`). `GET /api/service-blocks` ahora exige administración (antes no pedía identidad).
  **LÍMITE:** el Home, la administración (`CancionesPanel`, `app/home/page.tsx`, `app/admin/page.tsx`) y el portal en
  el navegador leen canciones, adjuntos y secciones DIRECTO con la clave pública hasta el punto 50 (RLS abierto): quien
  tenga esa clave podría leer `songs` sin pasar por estas rutas. Lo de este punto protege al portal, no cierra la base.
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
  avisa por push a todos los `members`. **Mitigación sin migración:** `/api/portal/chat` devuelve
  del general SOLO los mensajes cuyo REMITENTE pertenece a la organización de la persona (unión
  interna en la base; si esa consulta falla, el mismo filtro sobre los últimos mensajes), y sin
  organización conocida no devuelve ni acepta nada. Compuerta para una segunda organización:
  `messages.organization_id` (migración con relleno desde `members`), filtrar el aviso de
  `chat-notify` por ella y el cierre de RLS del punto 50 (ver `docs/PENDIENTES-code.md`).
  **Invitaciones y cierre (commit 7).** `/confirm/<token>` (enlace del correo) pasa por
  `/api/confirm/<token>`: GET devuelve SOLO nombre y apellido, fecha y título del servicio y el estado
  (nunca la fila de la persona; una convocatoria no enviada es 404); POST responde por el mismo
  camino que `/api/confirm-rsvp` (`lib/portal/rsvp.ts`: valida, exige convocatoria enviada y escribe
  `responded_at`, que `confirm-rsvp` antes no escribía). `/api/member-portal`, `/api/confirm-rsvp`,
  `/api/all-songs` y `/api/all-services` usan el cliente de servicio y validan lo que reciben;
  `all-songs` y `all-services` exigen identidad del portal (cookie o `x-portal-token`) o sesión de
  administración (`lib/auth/requirePortalOrAdmin.ts`), y `all-songs` ya no hace `select *` (solo las
  columnas que usa el portal). Las invitaciones no tienen vencimiento: un token de un servicio ya
  pasado sigue respondiendo, como antes. Las canciones del setlist que devuelve `/api/portal/me` llevan
  columnas explícitas (`lib/portal/songColumns.ts`: las del catálogo más `spotify_url`, `apple_music_url` y
  `caratula_url`, que es lo que lee el detalle del servicio), ya no `songs(*)`. `app/portal/**` y los componentes del portal ya no usan
  `supabase.from`, `.channel` ni `.storage` (solo `supabase.auth.signOut`).
  Pendiente de este punto: el modo «Ver portal» para administración (sin escribir `last_seen`).
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
- **Pendiente menor (punto 53):** el alto del chat usa la constante 130px; con el banner Beta en dos líneas puede excederse ~12px; se resuelve en el punto 54.

- **`browserslist` explícito en `package.json` (iOS/Safari ≥ 15, Chrome/Edge/Firefox ≥ 100).**
  Sin él, Next/autoprefixer usan los valores por defecto (Safari reciente) y
  borran del CSS compilado los prefijos que consideran obsoletos. El caso que
  lo destapó: `-webkit-backdrop-filter`, que Safari de iOS anterior a 18 sigue
  necesitando; el fuente lo declaraba pero el CSS compilado solo traía
  `backdrop-filter`, y el menú del portal (y las tarjetas, barras y velos del
  admin) quedaban sin desenfoque en iOS 16/17. Con la lista explícita
  autoprefixer vuelve a emitir el prefijo y quita los de Firefox/Opera que ya
  no hacen falta. También acota el JS que compila SWC (un 1–2 % menos) y deja
  la reescritura de colores del minificador (`transparent` → `#0000`) dentro de
  lo que esos navegadores entienden. Subir el piso (p. ej. a Safari 18) sin
  mirar el CSS compilado volvería a quitar el prefijo. Si se baja el piso por
  un teléfono viejo, revisá `.next/static/css` después del build. Los
  `/* autoprefixer: ignore next */` de `portal-nav.module.css` se dejan a
  propósito: protegen el prefijo del menú aunque alguien cambie esta lista.

- **Contraste del menú del portal (`portal-nav.module.css`).** La etiqueta
  inactiva (9 px) debe dar ≥ 4,5:1 contra el relleno translúcido del menú
  sobre los fondos REALES que pasan por debajo. Claro: blanco, `#FAFAFA` y la
  tarjeta negra del servicio (`--anc-hero`, `#0A0A0A`). Oscuro: `#1E1E1E`,
  `#2C2C2C`, la tarjeta (`#404040`) y texto claro desenfocado (~`#4A4A4A`).
  Con el vidrio al 50 % (claro) y al 55 % (oscuro), medido: claro 19,8 / 19,4 /
  5,33:1 (el piso de opacidad es ~45 % sobre la tarjeta negra); oscuro 10,25 /
  9,42 / 8,28 / 7,73:1. Para que el claro llegue a 50 % la etiqueta inactiva
  usa `--anc-ink` (con `--anc-ink-2` hacía falta ≥ 65,6 %); la activa se
  distingue por el círculo y el peso. **Excepción a revisar:** NO se exige
  blanco puro bajo el menú en oscuro (da 2,30:1 al 55 %; hace falta ≥ 77,2 %)
  ni negro puro bajo el menú en claro (daría 4,98:1 al 50 %, pasaría), porque hoy
  no existen detrás del menú. Cuando haya carátulas o fotos bajo el menú
  (puntos 54 y 55) hay que volver a medir y, si falla, subir `--glass-alpha`.

- **Deuda: `--anc-ink-2` (y los demás `--anc-ink*`) está definido en dos
  archivos.** `app/globals.css` (≈ línea 482) lo declara como alias
  `--anc-ink-2: var(--v3-ink-2)` (valores viejos `#4E5860` claro / `#A8B2BA`
  oscuro) y `app/ancora-tokens-v5.css` lo declara con el valor real (`#404040`
  claro / `#D4D4D4` oscuro, líneas 41, 77 y 111). Gana `ancora-tokens-v5.css`:
  `app/layout.tsx` importa primero `globals.css` y después `ancora-tokens-v5.css`,
  ambos en `:root` con la misma especificidad, así que el último manda (medido
  en el navegador: `#404040` / `#D4D4D4`). Además `ancora-tokens-v5.css` (≈
  línea 245) vuelve a apuntar `--v3-ink-2` a `--anc-ink-2`, por lo que los
  valores viejos de `globals.css` nunca se aplican. Riesgo: si alguien invierte
  ese orden de imports, `--anc-ink-2` y `--v3-ink-2` se referencian entre sí
  (ciclo) y quedan inválidos. Pendiente: dejar UNA sola definición y borrar el
  alias duplicado de `globals.css`.

- **La canción en el portal (punto 55) — qué NO se puede probar sin un iPhone real.** Se construye en 6 commits (letra → YouTube
  → visor de PDF → audio propio y migración 036 → reproductor flotante → limpieza y cabeceras). Lo verificado desde el escritorio
  son las rutas del servidor, la lógica y el aspecto en 390×844 claro y oscuro. Lo que solo se comprueba en un iPhone (punto 56):
  el menú que se esconde al desplazar la letra y vuelve al subir (y que no tape el último renglón); la tipografía «Aa» con la fuente
  del sistema; el pellizco, el doble toque y la nitidez a zoom alto del visor de PDF (Safari limita el lienzo a ~16 millones de
  píxeles) y la memoria con PDFs de muchas páginas; YouTube en línea (autoplay tras el toque, la app instalada en la pantalla de
  inicio, que no falle por la referencia); el audio propio con la pantalla bloqueada y los controles de `Media Session`; el MIME
  que declara iOS para un `.m4a`; el reproductor flotante contra la barra de inicio y la zona segura; «Abrir en el visor del
  teléfono» (↗); y los enlaces firmados tras más de una hora con la pantalla abierta.

- **El enlace de YouTube de la canción (punto 55).** Vive en `songs.link_spotify` (nombre heredado; no hay columnas nuevas). De lo que se
  pega SOLO se extrae el id de 11 caracteres (`lib/youtube.ts`: acepta watch, youtu.be, embed, shorts y live, y rechaza otros dominios,
  esquemas raros y listas sin video); la URL del reproductor (`youtube-nocookie.com`), la miniatura (`i.ytimg.com`) y «Abrir en YouTube» se
  ARMAN con ese id, nunca se usa lo pegado. En el portal (`YouTubeAudio.tsx`) el iframe no existe hasta pulsar la miniatura, suena un solo
  reproductor a la vez (`reproductor.ts`) y se destruye al salir de la canción (sin aviso). Un enlace que no es de YouTube se conserva pero
  no se muestra. AL GUARDAR en el formulario de administración se consulta oEmbed por el servidor (`/api/admin/youtube-oembed`, solo
  owner/admin, 4 s de límite) y SOLO se avisa: «no es de YouTube», «no existe o es privado» (404) o «no se puede incrustar» (401/403); con
  «Guardar de todos modos» se guarda igual, y si YouTube no responde no se bloquea nada. Falta confirmar con videos reales que YouTube
  responde 401 cuando el dueño no permite incrustar (es lo que se espera, pero no está verificado desde aquí).

- **Pendiente tras el paso (6) del punto 55: revisar que sigan coherentes el `Referrer-Policy` del sitio y el `referrerpolicy` del iframe de
  YouTube.** El iframe (`YouTubeAudio.tsx`) declara `referrerpolicy="strict-origin-when-cross-origin"` y el paso (6) fija esa misma política
  en todo el sitio con una cabecera explícita. YouTube necesita la referencia (el origen) del sitio para el reproductor incrustado: si alguien
  endurece una de las dos (`no-referrer`, `same-origin`, `strict-origin` sin origen cruzado...), el video puede dejar de arrancar o mostrar un
  error. Cualquier cambio de cabeceras o de CSP (`frame-src https://www.youtube-nocookie.com`) debe repasar los dos lugares juntos y probar un
  video en un iPhone.

- **Visor de PDF de las canciones (punto 55, paso 3).** La sección «Adjuntos» (entre la letra y el audio) lista los PDF de la canción; «Ver»
  abre el visor DENTRO de la app (`VisorPdf.tsx`), con pdf.js. Cómo funciona y por qué:
  - **Firmado al pulsar.** La lista trae solo nombre, tamaño, quién y cuándo (nunca rutas ni URLs). Al pulsar «Ver» el cliente pide
    `POST /api/portal/cancion/firmar`, que exige acceso a la biblioteca (punto 59), comprueba que el adjunto sea DE ESA canción y firma 5
    minutos con la llave de servicio (que solo vive en el servidor). El PDF se descarga ENTERO al abrir; si la URL venció (400/401/403) se
    vuelve a firmar UNA sola vez.
  - **pdf.js (`pdfjs-dist` 6.3.289, build `legacy` para iOS 15/16)** se carga con `import()` solo al abrir el visor: no está en el JS inicial
    del portal. **El worker se sirve desde `public/pdfjs/pdf.worker.<versión>.min.mjs`**, que copia `scripts/copy-pdfjs-worker.js` en
    `prebuild` y `predev` (no se versiona; la versión del nombre sale de la librería cargada, así siempre coinciden; caché larga por cabecera
    en `next.config.js`). Se probó antes la forma `new URL('pdfjs-dist/…/pdf.worker.min.mjs', import.meta.url)` y **FALLA en el build de
    producción** (el minificador de Next procesa el worker como script: «import.meta cannot be used outside of module code»; en `next dev`
    no se ve). Si se actualiza `pdfjs-dist`, correr `npm run build` y mirar que siga copiando el worker.
  - **Límites:** más de 30 MB no se abre en la app (solo ↗; también se corta la descarga si pesara más de lo declarado); el lienzo de cada
    página tiene un tope de ~12 millones de píxeles (a mucho zoom sale menos nítido, no falla) y solo se dibujan las páginas visibles. Sin
    `wasm`, `cmaps` ni `standard_fonts`: las fuentes no incrustadas usan las del sistema; un PDF con imágenes JPEG2000/JBIG2 puede verse sin
    ellas; si un PDF no se puede dibujar el visor lo dice y ↗ («Abrir en el visor del teléfono») siempre está disponible.
  - **Sin scripting:** esta versión de pdf.js ya no tiene la opción `isEvalSupported` (no usa `eval` ni `new Function`; se comprobó en el
    código del paquete) y el sandbox de scripting de PDF no se carga.
  - **Accesibilidad:** `role="dialog"` con nombre, foco atrapado, Escape y ✕, el foco vuelve al botón «Ver»; capa 28 (`--z-pdf`), con zona
    segura. Pellizco, doble toque y Ctrl+rueda solo hacen zoom del PDF (`touch-action` y eventos `gesture*` controlados); − / + / Ajustar
    funcionan siempre. Verificado con toques emulados (CDP) contra la compilación de producción; la sensación real del pellizco y la nitidez
    a zoom alto van en la lista de «qué no se puede probar sin un iPhone».

- **Licencias de terceros: pdf.js (Mozilla Foundation) — Apache License 2.0.** El visor usa `pdfjs-dist` sin modificarlo. La licencia
  completa se copia junto al worker en `public/pdfjs/LICENSE-pdfjs.txt` (se publica en `/pdfjs/LICENSE-pdfjs.txt`) y está en
  `node_modules/pdfjs-dist/LICENSE`. La Apache-2.0 permite el uso comercial y privado; obliga a conservar el aviso de copyright y la
  licencia al redistribuir el código. Si se agrega otra pieza de terceros, anotarla aquí.

- **Audio propio de las canciones (punto 55, paso 4).** `migrations/036-audio-de-canciones.sql` (la corre quien administra Supabase; el
  bloque OPCIONAL de topes de los buckets actuales vive aparte en `migrations/036b-topes-de-buckets-actuales.sql`):
  - Bucket PRIVADO `song-audio`: 20 MB y solo mp3 / m4a / aac, impuestos por el almacenamiento. Ruta de los archivos nuevos:
    `{organization_id}/{song_id}/{marca}-{nombre}` (la organización va por delante; las políticas comparan esa carpeta con la organización
    de quien pide, sin fijar ningún id). Leer exige `has_library_access`; subir, reemplazar y borrar exigen `can_manage_library_files`
    (owner/admin o LÍDER de un equipo con acceso; ser integrante no alcanza). Las dos son `security definer` y solo las ejecutan
    `authenticated` y el servidor. `song_attachments.bucket` dice en qué bucket está cada adjunto (los existentes quedan en `song-attachments`).
  - La 036 se ejecutó contra un Postgres de prueba (PGlite) con tablas simuladas y RLS real: 40 comprobaciones (permisos por rol, otra
    organización, equipo archivado, ruta sin uuid, idempotencia y REVERTIR). No sustituye correrla en Supabase y subir un audio de verdad.
  - **Tipos MIME.** iOS declara los `.m4a` casi siempre como `audio/x-m4a` (otras plataformas, `audio/mp4`; algunos navegadores,
    `application/octet-stream`), y en iOS Safari `accept="audio/*"` mezclado con `image/*` oculta los `.m4a`. Por eso la pantalla
    (`lib/subidaArchivos.ts`) NO depende de lo que declare el navegador: valida la extensión y los primeros bytes del archivo, usa solo
    extensiones en el `accept`, y sube SIEMPRE con un tipo canónico (`audio/mpeg`, `audio/mp4` o `audio/aac`). El bucket acepta además
    `audio/x-m4a`, `audio/m4a`, `audio/mp3` y `audio/x-aac` por si alguien sube a mano. `.aac` está permitido; para quitarlo, sacar
    `audio/aac` y `audio/x-aac` del bucket y `aac` de `AUDIO_POR_EXTENSION`.
  - **Administración:** valida tipo, contenido y tamaño ANTES de subir (audio ≤ 20 MB; PDF e imágenes ≤ 25 MB), borra el archivo si no pudo
    registrarlo, y «Quitar» borra también el archivo del almacenamiento. Los enlaces de los adjuntos se firman AL PULSAR (antes se firmaban
    todos al cargar la lista). Sin la migración, la subida de audio dice «falta correr la migración 036» y todo lo demás funciona igual.
  - **Firmado del audio:** `POST /api/portal/cancion/firmar` firma el audio por 60 minutos (el PDF, 5). `lib/audioFirma.ts` pide la firma AL
    DAR PLAY, la reutiliza mientras le quede margen y, si el `<audio>` falla a mitad, vuelve a firmar UNA vez (otro fallo en menos de 20 s: se
    rinde, sin bucles). El reproductor flotante que lo usa es el paso 5.

- **Reproductor flotante del audio propio (punto 55, paso 5).** `ReproductorFlotante.tsx` vive UNA vez en `PortalApp`: sigue sonando al
  cambiar de pestaña y se ve en cualquier pantalla, también sobre la letra y el visor de PDF. Capa 29 (`--z-player`): sobre el menú (20) y el
  visor (28). En el teléfono flota justo encima del menú (`PortalNav` publica `--portal-nav-top`, MEDIDO, así sigue bien si se afinan las
  medidas del menú o cambia la zona segura), BAJA con él cuando se esconde al desplazar la letra, y SUBE al borde superior con un chat abierto
  (para no tapar el campo de escribir). Contraído: play/pausa, título, tiempo y ✕; expandido: barra, −10 / +10 y velocidad 1× → 1,25× → 0,75×.
  La tarjeta «Audio» de la canción (`AudioCancion.tsx`) junta el video de YouTube y los archivos propios; `/api/portal/cancion` devuelve
  `audios` (metadatos, nunca rutas).
  - `<audio preload="none">`; la URL se firma AL DAR PLAY (`lib/audioFirma.ts`, 60 min) y, si falla a mitad (firma vencida o red), se firma de
    nuevo UNA vez y se retoma donde iba; si vuelve a fallar en menos de 20 s se avisa con «Reintentar» (sin bucles).
  - **Un solo reproductor a la vez** (`reproductor.ts`): el turno se toma en el evento `play` (botón, bloqueo de pantalla, auriculares), así
    que reanudar el archivo detiene el video y al revés. Al pulsar un video de YouTube el archivo se PAUSA y queda a mano.
  - **Media Session:** título, artista, ±10 s, posición, `seekto` y parar; se limpia al cerrar con ✕.
  - **iOS:** solo deja iniciar un audio DENTRO del toque, pero hay que esperar la firma; por eso el toque inicia ya una reproducción silenciosa
    de 0,1 s del mismo `<audio>` (lo «desbloquea») y al llegar la URL se le cambia la fuente y se le da play (sin esperar el silencio: un WAV
    vacío nunca termina y su `play()` queda pendiente). **Esto, la pantalla bloqueada, los controles del bloqueo y la barra de inicio solo se
    comprueban en un iPhone real** (punto 56). Verificado en Chrome sin ventana contra la compilación de producción, con clics reales y una
    falla de red real a mitad de la reproducción; para que ese Chrome avance el reloj del audio hace falta `--disable-audio-output` (sin eso el
    `play()` queda mudo hasta pausar y reanudar, también con un `new Audio()` pelado: es de ese entorno, no del reproductor).
- **Subida con progreso real (punto 55, ajuste de Claudia).** En administración (Canciones → Adjuntos) el indicador va DENTRO de la sección, arriba
  de la lista: nombre, «4,2 de 9,8 MB · 43 %», barra y «Cancelar». supabase-js no expone el progreso (usa `fetch`), así que `lib/subirAdjunto.ts`
  pide una URL firmada de subida (`createSignedUploadUrl`: se concede solo a quien ya podría subir, mismas políticas) y `lib/subidaConProgreso.ts`
  la sube con `XMLHttpRequest` (`upload.onprogress`, reescalado al tamaño del archivo; hace falta mandar la cabecera `apikey`). Se conservan la
  validación de tipo y tamaño ANTES de firmar (audio > 20 MB nunca sale), el tipo canónico (va en el Blob que se sube), la ruta
  `{organization_id}/{song_id}/…` del audio y el borrado del archivo si falla el registro de la fila. Cancelar aborta el XHR y borra por si el
  servidor alcanzó a guardar. La cola (`lib/colaSubida.ts`, sin React) sube de uno en uno («2 de 3»); la barra solo aparece si tarda > 300 ms; «Subido»
  y «Cancelado» se van solos a los 3 s; el error es PERSISTENTE (motivo + «Reintentar»/«Descartar»); `beforeunload` avisa mientras hay subidas.
  Accesibilidad: `role="progressbar"` + `aria-valuenow`, y una región `aria-live="polite"` que anuncia solo los cambios de estado (si en el mismo
  instante termina uno y empieza otro se anuncian juntos). Con `prefers-reduced-motion` no hay animaciones. Verificado con un servidor de prueba
  con límite de velocidad (contrapresión real) en Chrome sin ventana; no se ejecutó nada contra Supabase: el flujo real contra Storage
  (`createSignedUploadUrl` + PUT con `apikey`) solo se confirma subiendo un archivo en la app ya con la migración 036 corrida.
- **Spotify y Apple Music fuera (punto 55, paso 6, commit A).** Las columnas `songs.spotify_url` y `songs.apple_music_url` NO se borran ni se migran:
  solo dejan de editarse (el formulario de Canciones ya no tiene esos campos y `saveSong` ya no envía esas claves: enviarlas vacías pisaba lo
  guardado) y dejan de mostrarse y de viajar al portal (`SONG_SETLIST_COLUMNS` y `/api/member-portal`). `songs.link_spotify` es el enlace de YOUTUBE
  (nombre heredado) y sigue siendo la columna que se guarda; en el portal solo se muestra si es de YouTube (se arma con el id): un enlace viejo de
  Spotify guardado ahí simplemente no aparece. La vista de administración del servicio (`AdminServiceView`) no se tocó.
- **Cabeceras (punto 55, paso 6, commit B).** `next.config.js`: `Referrer-Policy: strict-origin-when-cross-origin` explícita en todo el sitio (YouTube
  necesita la referencia del origen: sin ella el video incrustado da «error 153») y `Content-Security-Policy-Report-Only` SOLO en `/portal/:path*`
  (nunca bloqueante todavía; sin endpoint de reportes: las infracciones se ven en la consola del navegador). Cada origen de la política está
  justificado en el comentario de `next.config.js`; el de Supabase sale de `NEXT_PUBLIC_SUPABASE_URL` al construir. Tras publicar: abrir el portal
  con una canción con PDF, audio y YouTube y revisar la consola; cuando no haya avisos se puede pasar a una CSP bloqueante (idealmente con nonce
  en vez de `'unsafe-inline'`). `middleware.ts` no toca estas cabeceras.
  **Deuda menor:** la fuente «Dancing Script» se carga desde Google Fonts (`app/globals.css:5`, `@import`), lo que obliga a permitir
  `fonts.googleapis.com` y `fonts.gstatic.com` en la política. Opción futura: servirla con `next/font` (alojada aquí) y quitar esos dos orígenes.
