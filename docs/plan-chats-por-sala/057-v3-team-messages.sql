-- EN PAUSA desde 2026-11-25: no ejecutar.
-- 057-v3 · Verificación (después de 057a). El chat de equipo (team_messages) es privado: quien no es del equipo no puede escribir y la llave pública no ve nada.
-- Escribe SOLO en la tabla nueva y vacía team_messages, y lo deshace al instante (cada prueba corre en un bloque que siempre se revierte). Seguro en la base compartida.
-- Un solo resultado: la columna «veredicto» debe decir OK en todas. «SIN DATOS» = no había una persona o equipo adecuados para probar.
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
declare t uuid; miembro uuid; ajeno uuid;
begin
  select tm.team_id, tm.member_id into t, miembro
    from public.team_members tm join public.teams x on x.id = tm.team_id and x.archived_at is null and x.organization_id = tm.organization_id limit 1;
  select m.id into ajeno from public.members m where t is not null and not public.chat_es_miembro_equipo(m.id, t) limit 1;
  if t is null or ajeno is null then insert into pruebas values (1, 'sin datos para probar team_messages', 'SIN DATOS', 'SIN DATOS'); return; end if;

  perform pg_temp.probar(1, 'una persona DEL equipo sí puede guardar un mensaje', null, null,
    format('with i as (insert into public.team_messages (team_id, member_id, content) values (%L, %L, ''prueba 057'') returning 1) select count(*) from i', t, miembro), 'FILAS: 1');
  perform pg_temp.probar(2, 'una persona que NO es del equipo: la base lo rechaza', null, null,
    format('with i as (insert into public.team_messages (team_id, member_id, content) values (%L, %L, ''no debe entrar'') returning 1) select count(*) from i', t, ajeno), 'ERROR 42501%');
  perform pg_temp.probar(3, 'la llave pública (anon) NO puede leer team_messages', 'anon', null, 'select count(*) from public.team_messages', 'ERROR 42501%');
  perform pg_temp.probar(4, 'la llave pública (anon) NO puede escribir en team_messages', 'anon', null,
    format('with i as (insert into public.team_messages (team_id, member_id, content) values (%L, %L, ''x'') returning 1) select count(*) from i', t, miembro), 'ERROR 42501%');
  perform pg_temp.probar(5, 'una cuenta con sesión (authenticated) NO puede leer team_messages', 'authenticated',
    '{"role":"authenticated","email":"nadie.sin.acceso@ejemplo.invalid"}', 'select count(*) from public.team_messages', 'ERROR 42501%');
  perform pg_temp.probar(6, 'una cuenta con sesión (authenticated) NO puede escribir en team_messages', 'authenticated',
    '{"role":"authenticated","email":"nadie.sin.acceso@ejemplo.invalid"}',
    format('with i as (insert into public.team_messages (team_id, member_id, content) values (%L, %L, ''x'') returning 1) select count(*) from i', t, miembro), 'ERROR 42501%');
end $$;

select orden as paso, prueba, resultado, esperado,
       case when resultado = 'SIN DATOS' then 'SIN DATOS' when resultado like esperado then 'OK' else 'FALLA' end as veredicto
  from pruebas order by orden;
