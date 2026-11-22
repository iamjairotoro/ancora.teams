-- 057 · Verificación de los chats por sala. Córrela por partes, en este orden, DESPUÉS de cada migración. Cada bloque dice qué debe salir.
-- Las pruebas que escriben (V4, V5) van dentro de una transacción que SIEMPRE se deshace (rollback). Hazlas primero en la base de PRUEBA con el respaldo anonimizado, no en la de producción.
-- El SQL Editor de Supabase corre como `postgres`; para probar lo que ve una cuenta sin acceso se simula el rol con `set local role` y los datos del JWT con `set_config('request.jwt.claims', …)`.

-- ═════ V0 · (después de 057a) las funciones existen y SOLO el servidor puede ejecutarlas ═════
-- Debe salir: anon = false y authenticated = false en TODAS las filas; service_role = true.
select p.oid::regprocedure as funcion,
       has_function_privilege('anon', p.oid, 'execute')         as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       has_function_privilege('service_role', p.oid, 'execute')  as service_role
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and (p.proname like 'chat\_%' or p.proname = 'team_messages_valida')
 order by 1;

-- ═════ V1 · (después de 057a) la regla de pertenencia contra los datos reales. CADA consulta debe devolver 0 filas ═════
-- 1.1 «sirve» un servicio normal sin estar asignada a ninguna posición
select m.id as persona, s.id as servicio from public.members m join public.services s on s.organization_id = m.organization_id
 where s.tipo <> 'ensayo' and public.chat_sirve_servicio(m.id, s.id)
   and not exists (select 1 from public.banda_assignments b where b.service_id = s.id and b.member_id = m.id);
-- 1.2 «sirve» sin convocatoria enviada
select m.id as persona, s.id as servicio from public.members m join public.services s on s.organization_id = m.organization_id
 where public.chat_sirve_servicio(m.id, s.id)
   and not exists (select 1 from public.invitations i where i.service_id = s.id and i.member_id = m.id and i.sent_at is not null);
-- 1.3 «sirve» habiendo declinado todas sus convocatorias
select m.id as persona, s.id as servicio from public.members m join public.services s on s.organization_id = m.organization_id
 where public.chat_sirve_servicio(m.id, s.id)
   and not exists (select 1 from public.invitations i where i.service_id = s.id and i.member_id = m.id and i.sent_at is not null and i.status <> 'declinado');
-- 1.4 «sirve» un servicio de OTRA organización
select m.id as persona, s.id as servicio from public.members m join public.services s on s.organization_id <> m.organization_id
 where public.chat_sirve_servicio(m.id, s.id);
-- 1.5 miembro de un equipo archivado, de otra organización o que no existe
select tm.member_id, tm.team_id from public.team_members tm
  left join public.teams t on t.id = tm.team_id
 where public.chat_es_miembro_equipo(tm.member_id, tm.team_id)
   and (t.id is null or t.archived_at is not null or t.organization_id <> tm.organization_id);
-- 1.6 chat_equipos_de debe coincidir EXACTAMENTE con los equipos vivos de cada persona (diferencias en cualquier sentido)
(select tm.member_id, tm.team_id from public.team_members tm join public.teams t on t.id = tm.team_id and t.archived_at is null and t.organization_id = tm.organization_id
 except select m.id, e.team_id from public.members m, lateral public.chat_equipos_de(m.id) e)
union all
(select m.id, e.team_id from public.members m, lateral public.chat_equipos_de(m.id) e
 except select tm.member_id, tm.team_id from public.team_members tm join public.teams t on t.id = tm.team_id and t.archived_at is null and t.organization_id = tm.organization_id);
-- 1.7 informativo (no debe sorprender): quién pierde HOY el chat de un servicio con el que contaba — personas asignadas a un servicio de ventana sin convocatoria enviada
select b.member_id, b.service_id from public.banda_assignments b join public.services s on s.id = b.service_id
 where b.member_id is not null and s.fecha >= current_date - 1 and not public.chat_sirve_servicio(b.member_id, b.service_id) limit 50;

-- ═════ V2 · (después de 057a) salir de un equipo o declinar quita el acceso SOLO; volver a entrar lo devuelve ═════
-- Cada bloque se deshace solo. Debe imprimir: «OK». (Úsalos en la base de PRUEBA: borrar una fila de team_members/invitations puede disparar avisos si hay disparadores activos.)
begin;
do $$
declare tm record; antes boolean; despues boolean;
begin
  select x.* into tm from public.team_members x join public.teams t on t.id = x.team_id and t.archived_at is null and t.organization_id = x.organization_id limit 1;
  if tm.id is null then raise notice 'SIN DATOS: no hay team_members vivos para probar'; return; end if;
  antes := public.chat_es_miembro_equipo(tm.member_id, tm.team_id);
  delete from public.team_members where id = tm.id;
  despues := public.chat_es_miembro_equipo(tm.member_id, tm.team_id);
  if antes and not despues then raise notice 'OK: al salir del equipo pierde el acceso (antes %, después %)', antes, despues; else raise notice 'FALLA: antes %, después %', antes, despues; end if;
end $$;
rollback;

begin;
do $$
declare inv record; antes boolean; despues boolean;
begin
  select i.* into inv from public.invitations i join public.services s on s.id = i.service_id
   where i.sent_at is not null and i.status <> 'declinado' and public.chat_sirve_servicio(i.member_id, i.service_id)
     and not exists (select 1 from public.invitations o where o.service_id = i.service_id and o.member_id = i.member_id and o.id <> i.id and o.sent_at is not null and o.status <> 'declinado')
   limit 1;
  if inv.id is null then raise notice 'SIN DATOS: no hay una persona que sirva un servicio con una sola convocatoria vigente'; return; end if;
  antes := public.chat_sirve_servicio(inv.member_id, inv.service_id);
  update public.invitations set status = 'declinado' where id = inv.id;
  despues := public.chat_sirve_servicio(inv.member_id, inv.service_id);
  if antes and not despues then raise notice 'OK: al declinar pierde el acceso al chat del servicio'; else raise notice 'FALLA: antes %, después %', antes, despues; end if;
end $$;
rollback;

-- ═════ V3 · (después de 057a) team_messages: nadie con llave pública lo ve y la base rechaza a quien no es del equipo ═════
begin;
do $$
declare t uuid; miembro uuid; ajeno uuid; n integer;
begin
  select tm.team_id, tm.member_id into t, miembro from public.team_members tm join public.teams x on x.id = tm.team_id and x.archived_at is null and x.organization_id = tm.organization_id limit 1;
  select m.id into ajeno from public.members m where not public.chat_es_miembro_equipo(m.id, t) limit 1;
  if t is null or ajeno is null then raise notice 'SIN DATOS para probar team_messages'; return; end if;
  insert into public.team_messages (team_id, member_id, content) values (t, miembro, 'prueba 057 (se deshace)');
  raise notice 'OK: una persona del equipo SÍ puede guardar';
  begin insert into public.team_messages (team_id, member_id, content) values (t, ajeno, 'no debe entrar');
        raise notice 'FALLA: la base aceptó un mensaje de alguien que no es del equipo';
  exception when insufficient_privilege then raise notice 'OK: la base rechazó a quien no es del equipo'; end;
  execute 'set local role anon';
  begin execute 'select count(*) from public.team_messages' into n; raise notice 'FALLA: anon pudo leer team_messages (% filas)', n;
  exception when insufficient_privilege then raise notice 'OK: anon no puede leer team_messages'; end;
  execute 'reset role'; execute 'set local role authenticated';
  begin execute 'select count(*) from public.team_messages' into n; raise notice 'FALLA: authenticated pudo leer team_messages (% filas)', n;
  exception when insufficient_privilege then raise notice 'OK: authenticated no puede leer team_messages'; end;
  execute 'reset role';
end $$;
rollback;

-- ═════ V4 · (después de 057b) `messages` cerrada: quien no tiene acceso no ve NADA ═════
begin;
do $$
declare n integer; correo text;
begin
  -- anon (la llave pública): debe rechazar
  execute 'set local role anon';
  begin execute 'select count(*) from public.messages' into n; raise notice 'FALLA: anon leyó % mensajes', n;
  exception when insufficient_privilege then raise notice 'OK: anon no puede leer messages'; end;
  begin execute 'insert into public.messages (member_id, content) select id, ''x'' from public.members limit 1'; raise notice 'FALLA: anon pudo escribir en messages';
  exception when insufficient_privilege then raise notice 'OK: anon no puede escribir en messages'; end;
  execute 'reset role';

  -- una cuenta con sesión que NO es administradora: la política no le devuelve ninguna fila
  perform set_config('request.jwt.claims', '{"role":"authenticated","email":"nadie.sin.acceso@ejemplo.invalid"}', true);
  execute 'set local role authenticated';
  execute 'select count(*) from public.messages' into n;
  if n = 0 then raise notice 'OK: una cuenta sin rol de administración ve 0 mensajes'; else raise notice 'FALLA: una cuenta sin acceso vio % mensajes', n; end if;
  execute 'reset role';

  -- un administrador real: solo el chat general (ni directos ni de servicio)
  select m.email into correo from public.members m where public.is_org_admin(m.email, m.organization_id) and m.email is not null limit 1;
  if correo is null then raise notice 'SIN DATOS: no hay un administrador con correo para probar'; return; end if;
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'email', correo)::text, true);
  execute 'set local role authenticated';
  execute 'select count(*) from public.messages where recipient_member_id is not null or service_id is not null' into n;
  if n = 0 then raise notice 'OK: el administrador no ve directos ni chats de servicio'; else raise notice 'FALLA: el administrador vio % mensajes que no son del general', n; end if;
  execute 'reset role';
end $$;
rollback;

-- ═════ V5 · TIEMPO REAL ═════
-- (a) Qué se transmite. Después de 057a NO debe aparecer team_messages; después de 057c tampoco messages.
select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('messages', 'team_messages', 'chat_presence');
-- (b) La prueba viva está en docs/plan-chats-por-sala/057-realtime-anon.mjs (un cliente con la llave pública suscrito a messages y team_messages mientras el servidor toca una fila): debe imprimir «OK: la llave pública no recibió nada».
--     Antes de 057b esa prueba DEBE fallar (confirma el problema de hoy); después de 057b debe pasar.
