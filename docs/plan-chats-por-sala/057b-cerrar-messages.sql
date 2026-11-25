-- EN PAUSA desde 2026-11-25: no ejecutar.
-- 057b · Chats por sala — PARTE B: cerrar `messages` a la llave pública.  PARA REVISIÓN: no corrida.
--
-- QUÉ HACE: quita TODAS las políticas actuales de `messages` (hoy, según PENDIENTES del 3-nov, hay una «true» con rol público: cualquiera con la llave pública lee, escribe y borra todos los chats, directos incluidos,
--           y por tiempo real recibe cada mensaje nuevo), quita todos los permisos de anon y deja dos políticas mínimas para la moderación del panel de administración: leer y borrar SOLO el chat GENERAL de su organización.
-- COMPATIBLE CON `main` (con una condición, abajo): el chat del portal de main lee y escribe `messages` por rutas del servidor con la llave de servicio, que no depende de las políticas. Lo único que cambia en main es que el panel
--           «Chats» del administrador deja de ver los directos y los de servicio (verá solo el general): no da error, muestra menos.
-- CONDICIÓN: confirmar ANTES que el chat del portal de producción (main) funciona por el servidor (que `SUPABASE_SERVICE_ROLE_KEY` está en el proyecto de Vercel de main): en main, abrir Chats y enviar un mensaje con una cuenta de prueba.
-- NO afecta a: team_messages (parte A), chat_presence (la cierra 053b), ni a ninguna otra tabla.
-- IDEMPOTENTE: borra las políticas que existan y crea las dos; correrla dos veces deja lo mismo. Lo que se borra está en la salida de 057-0 (sección «2 política»): GUÁRDALA ANTES, es lo que habría que recrear para deshacer.
-- PIDE CONFIRMACIÓN: el editor de Supabase avisa de una operación «destructiva» (DROP POLICY). Es lo esperado en este archivo.
begin;

do $$
begin
  if to_regclass('public.messages') is null then raise exception 'No existe public.messages'; end if;
end $$;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'messages' loop
    execute format('drop policy %I on public.messages', p.policyname);       -- las políticas viejas quedaron registradas en la salida de 057-0 (sección «2 política»)
  end loop;
end $$;

alter table public.messages enable row level security;
revoke all on public.messages from anon;          -- authenticated conserva sus permisos de tabla: lo que puede hacer lo deciden SOLO las políticas de abajo

-- Moderación (panel «Chats» del administrador): solo el chat GENERAL de su organización (el de las personas que escriben en él). Nada de directos, de servicio ni de equipo.
create policy "org admins leen el chat general" on public.messages for select to authenticated
  using (service_id is null and recipient_member_id is null
         and exists (select 1 from public.members m where m.id = messages.member_id and public.is_org_admin(auth.jwt() ->> 'email', m.organization_id)));
create policy "org admins borran en el chat general" on public.messages for delete to authenticated
  using (service_id is null and recipient_member_id is null
         and exists (select 1 from public.members m where m.id = messages.member_id and public.is_org_admin(auth.jwt() ->> 'email', m.organization_id)));

commit;

-- ═════ Comprobación (el resultado que se copia): todas las filas deben decir OK ═════
with c(n, comprobacion, ok) as (values
  (1, 'RLS activo en messages', (select relrowsecurity from pg_class where oid = 'public.messages'::regclass)),
  (2, 'hay exactamente 2 políticas (las de moderación del chat general)', (select count(*) = 2 from pg_policies where schemaname = 'public' and tablename = 'messages')),
  (3, 'ninguna política abierta a todos (true)', (select count(*) = 0 from pg_policies where schemaname = 'public' and tablename = 'messages' and (qual = 'true' or with_check = 'true'))),
  (4, 'anon sin ningún permiso sobre messages', (select not has_table_privilege('anon', 'public.messages', 'select,insert,update,delete'))),
  (5, 'las dos políticas son solo para authenticated', (select count(*) = 2 from pg_policies where schemaname = 'public' and tablename = 'messages' and roles = '{authenticated}'))
)
select n as paso, comprobacion, case when ok then 'OK' else 'FALLA' end as resultado from c order by n;
