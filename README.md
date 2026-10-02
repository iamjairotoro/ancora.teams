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
  `ancora-tokens-v4.css`. Por eso siguen con la paleta anterior aunque
  Canciones/Home ya migraron. Punto 21 de `docs/PENDIENTES-code.md` tapó el
  síntoma con una capa de alias al final de `ancora-tokens-v4.css` (redefine
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
