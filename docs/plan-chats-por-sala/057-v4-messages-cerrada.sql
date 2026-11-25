-- EN PAUSA desde 2026-11-25: no ejecutar.
-- 057-v4 · Verificación (después de 057b). `messages` quedó cerrada: quien no tiene acceso no ve NADA y la administración ve solo el chat general.
-- Cada prueba se hace con el rol simulado (anon, o una cuenta con sesión con el correo indicado) dentro de un bloque que SIEMPRE se revierte: lo que intenta escribir o borrar no queda. Seguro en la base compartida.
-- Un solo resultado: la columna «veredicto» debe decir OK en todas. «SIN DATOS» = no había un administrador con correo o mensajes de ese tipo para probar.
create temp table if not exists pruebas (orden integer, prueba text, resultado text, esperado text);
truncate pruebas;

create or replace function pg_temp.probar(p_orden integer, p_prueba text, p_rol text, p_claims text, p_sql text, p_esperado text)
returns void language plpgsql as
$$ declare r text; n bigint;
begin
  begin
    if p_claims is not null then perform set_config('request.jwt.claims', p_claims, true); end if;
    if p_rol is not null then execute format('set local role %I', p_rol); end if;
    execute p_sql into n;
    r := 'FILAS: ' || coalesce(n::text, 'null');
    raise exception 'deshacer';
  exception when others then
    if sqlerrm <> 'deshacer' then r := 'ERROR ' || sqlstate || ': ' || sqlerrm; end if;
  end;
  insert into pruebas values (p_orden, p_prueba, r, p_esperado);
end $$;

do $$
declare correo text; org uuid; claims text; generales bigint; un_general uuid;
begin
  perform pg_temp.probar(1, 'la llave pública (anon) NO puede leer messages', 'anon', null, 'select count(*) from public.messages', 'ERROR 42501%');
  perform pg_temp.probar(2, 'la llave pública (anon) NO puede escribir en messages', 'anon', null,
    'with i as (insert into public.messages (member_id, content) select id, ''x'' from public.members limit 1 returning 1) select count(*) from i', 'ERROR 42501%');
  perform pg_temp.probar(3, 'la llave pública (anon) NO puede borrar de messages', 'anon', null, 'with d as (delete from public.messages returning 1) select count(*) from d', 'ERROR 42501%');
  perform pg_temp.probar(4, 'una cuenta con sesión SIN rol de administración ve 0 mensajes', 'authenticated',
    '{"role":"authenticated","email":"nadie.sin.acceso@ejemplo.invalid"}', 'select count(*) from public.messages', 'FILAS: 0');

  select m.email, m.organization_id into correo, org from public.members m where m.email is not null and public.is_org_admin(m.email, m.organization_id) limit 1;
  if correo is null then insert into pruebas values (5, 'administrador real: no hay uno con correo para probar', 'SIN DATOS', 'SIN DATOS'); return; end if;
  claims := json_build_object('role', 'authenticated', 'email', correo)::text;
  select count(*) into generales from public.messages mm join public.members mb on mb.id = mm.member_id
   where mm.service_id is null and mm.recipient_member_id is null and mb.organization_id = org;
  select mm.id into un_general from public.messages mm join public.members mb on mb.id = mm.member_id
   where mm.service_id is null and mm.recipient_member_id is null and mb.organization_id = org limit 1;

  perform pg_temp.probar(5, 'un ADMINISTRADOR ve 0 mensajes directos', 'authenticated', claims, 'select count(*) from public.messages where recipient_member_id is not null', 'FILAS: 0');
  perform pg_temp.probar(6, 'un ADMINISTRADOR ve 0 mensajes de servicio', 'authenticated', claims, 'select count(*) from public.messages where service_id is not null', 'FILAS: 0');
  perform pg_temp.probar(7, 'un ADMINISTRADOR sí ve el chat general de su organización (cuántos hay: ' || generales || ')', 'authenticated', claims, 'select count(*) from public.messages', 'FILAS: ' || generales);
  perform pg_temp.probar(8, 'un ADMINISTRADOR no puede borrar directos ni de servicio (borra 0)', 'authenticated', claims,
    'with d as (delete from public.messages where recipient_member_id is not null or service_id is not null returning 1) select count(*) from d', 'FILAS: 0');
  if un_general is null then insert into pruebas values (9, 'un ADMINISTRADOR puede borrar un mensaje del chat general', 'SIN DATOS', 'SIN DATOS');
  else perform pg_temp.probar(9, 'un ADMINISTRADOR puede borrar un mensaje del chat general (se deshace)', 'authenticated', claims,
         format('with d as (delete from public.messages where id = %L returning 1) select count(*) from d', un_general), 'FILAS: 1');
  end if;
end $$;

select orden as paso, prueba, resultado, esperado,
       case when resultado = 'SIN DATOS' then 'SIN DATOS' when resultado like esperado then 'OK' else 'FALLA' end as veredicto
  from pruebas order by orden;
