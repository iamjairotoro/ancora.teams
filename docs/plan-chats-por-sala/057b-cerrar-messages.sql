-- 057b · Chats por sala — PARTE B: cerrar `messages` a la llave pública.  PARA REVISIÓN: no corrida.
--
-- QUÉ HACE: quita TODAS las políticas actuales de `messages` (hoy, según PENDIENTES del 3-nov, hay una «true» con rol público: cualquiera con la llave pública lee, escribe y borra todos los chats, directos incluidos,
--           y por tiempo real recibe cada mensaje nuevo), quita todos los permisos de anon y deja dos políticas mínimas para la moderación del panel de administración: leer y borrar SOLO el chat GENERAL de su organización.
-- COMPATIBLE CON `main` (con una condición, abajo): el chat del portal de main lee y escribe `messages` por rutas del servidor con la llave de servicio, que no depende de las políticas. Lo único que cambia en main es que el panel
--           «Chats» del administrador deja de ver los directos y los de servicio (verá solo el general): no da error, muestra menos.
-- CONDICIÓN: confirmar ANTES que el chat del portal de producción (main) funciona por el servidor (que `SUPABASE_SERVICE_ROLE_KEY` está en el proyecto de Vercel de main): en main, abrir Chats y enviar un mensaje con una cuenta de prueba.
-- NO afecta a: team_messages (parte A), chat_presence (la cierra 053b), ni a ninguna otra tabla.
-- IDEMPOTENTE: borra las políticas que existan y crea las dos; correrla dos veces deja lo mismo. Las políticas borradas se imprimen como NOTICE (guárdalas: son lo que habría que recrear para deshacer).
begin;

do $$
begin
  if to_regclass('public.messages') is null then raise exception 'No existe public.messages'; end if;
end $$;

do $$
declare p record;
begin
  for p in select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'messages' loop
    raise notice 'política borrada: "%" cmd=% roles=% using=% with_check=%', p.policyname, p.cmd, p.roles, p.qual, p.with_check;
    execute format('drop policy %I on public.messages', p.policyname);
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
