# Ancora Teams — reglas de trabajo para Claude Code

Plataforma multi-organización para equipos de alabanza (Next.js + Supabase +
Vercel). Se trabaja en español. Respuestas cortas y con rutas de archivo exactas.

## Contexto que no hace falta redescubrir
- La rama `dev` está conectada a producción en Vercel. Hay UNA sola base para esta
  plataforma: el proyecto Supabase «Ancora - Teams» (antes TEST), cargado desde un
  backup anonimizado con `scripts/seed-test-db.js`. La usan el desarrollo local y
  Vercel; no hay un entorno de pruebas separado, así que toda escritura es real
  sobre esa base.
- Nadie del equipo usa todavía la plataforma nueva. Se compartirá cuando esté
  terminada y revisada en versión responsive.
- `docs/PENDIENTES-code.md` es el archivo vivo de pendientes y los mockups de
  referencia están en `docs/`. Leé solo el punto que te pidan, no el archivo entero.
- Las migraciones están en `migrations/`, numeradas (los `supabase-schema-v*.sql`
  de la raíz son esquema histórico). Las ejecuta la persona en Supabase; nada del
  build las corre. No ejecutes ni apliques migraciones.
- Roles: owner, admin y miembro (`organization_members`). El líder
  (`team_members.is_leader`) administra su equipo; el integrante ve y confirma.
- Las posiciones asignadas en cada equipo son la única fuente de verdad de lo que
  hace una persona. Los instrumentos salieron de la interfaz de admin; la columna
  `members.instrumentos` se conserva porque la leen los ensayos y el portal.
- Los ensayos están en pausa: no trabajar en ellos ni quitar el tipo «Ensayo».

## Reglas que NO se negocian
1. `lib/chords.ts`, `lib/parseChart.ts` y `lib/parseLyrics.ts`: nunca
   reimplementarlos (`chords.ts` y `parseChart.ts` están inactivos: la vista
   muestra solo letra).
2. Sin colores `#RRGGBB` sueltos en JSX ni CSS: solo tokens `--anc-*`.
3. No escribir a mano el JSX de pantallas que llegan ya como componente.
4. No tocar `app/portal/**` ni el flujo de invitaciones salvo que la tarea lo
   pida expresamente (el portal se rediseña en la fase del lado del músico).
   El punto 48 (identidad del músico) levanta esta regla SOLO para ese punto.
5. Las plantillas nunca guardan personas ni canciones.
6. Sin porcentajes de cumplimiento individual (son voluntarios, no empleados).
7. No cambiar permisos ni RLS sin consultar. Hay políticas abiertas conocidas:
   no ampliar la exposición.
8. No crear migraciones ni columnas sin plan aprobado. Lo que toca el esquema
   lleva plan antes de implementar.
9. Si un dato no calza con los tipos, avisar antes de tocar el componente.
10. El color de equipo nunca lleva texto: el nombre del equipo va en gris de la
    escala neutra. El estado (confirmado, pendiente, declinado) se lee siempre
    por su forma, nunca solo por color.
11. Las tarjetas no llevan borde extra: el anillo de 1px ya viene dentro de
    `--anc-e1`. (Campos, botones secundarios e interruptores sí llevan borde.)
12. Texto secundario con `--anc-ink-3`; `--anc-ink-4` solo sobre blanco o en
    texto grande.
13. La llave de servicio (`SUPABASE_SERVICE_ROLE_KEY`) nunca sale del servidor
    (ni a un componente cliente ni a una variable `NEXT_PUBLIC_*`) y no se
    imprime.
14. Los enlaces firmados de archivos se firman AL PULSAR, no al cargar una lista.
15. Un menú con indicador animado se construye UNA vez; no se redibuja al
    navegar.

## Flujo de trabajo
- Sin `git push` salvo que se pida. Nunca `--force`. Antes de un push, mostrar:
  `git rev-parse origin/dev`, `git log --oneline origin/dev..HEAD`, `git status`
  y un `next build` limpio.
- Un commit por punto, con mensaje en español.
- `next build` y `next dev` comparten `.next`. Antes de construir, comprobá si
  hay un `next dev` corriendo (puerto 3000). Si lo hay, construí en una copia
  aislada o avisá, y NUNCA borres `.next` bajo el servidor de la persona. Si
  corriste un build, borrá `.next` solo cuando no haya servidor activo.
- Colores sueltos: `grep -rnE "#[0-9a-fA-F]{3,6}" components/ --include=*.tsx`
  (hoy hay ~78 coincidencias heredadas: no sumar nuevas).
- Ante un error estructural, `grep` primero; no pidas capturas.
- No imprimas valores de claves, tokens ni secretos: informá solo si existen.

## Datos de prueba y avisos
- Correos de prueba: `@example.com` para las personas creadas a mano (dominio
  reservado que nunca entrega correo) y `@test.local` para las del backup
  anonimizado. Nunca correos reales.
- NUNCA ejecutes `scripts/seed-test-db.js` ni nada de `test-schema/` salvo que se
  pida expresamente: sobrescribe datos.
- No dispares avisos reales: el botón «Notificar» (`components/AdminServiceView.tsx`)
  manda mensajes de verdad.
- `test-schema/enable-notification-triggers.sql` lleva un marcador que se
  reemplaza por el secreto real en el editor de Supabase. No pegues el secreto
  en el archivo ni lo commitees.
