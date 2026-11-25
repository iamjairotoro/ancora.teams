-- EN PAUSA desde 2026-11-25: no ejecutar.
-- 057-v2 · Verificación (después de 057a). Salir de un equipo, ser quitada de la nómina o declinar quita el acceso SOLO.
-- ESCRIBE EN LA BASE COMPARTIDA y lo deshace al instante: cada prueba hace el cambio (borrar una fila de team_members o banda_assignments, declinar una invitación o mover la fecha de un servicio) dentro de un bloque que SIEMPRE se revierte.
-- Aun así toca filas reales durante unos milisegundos: HAZLO DESPUÉS DEL RESPALDO y en un horario tranquilo. Si prefieres no hacerlo, 057-v1 ya cubre la regla con los datos reales.
-- Si hubiera disparadores de aviso activos en esas tablas, correrían dentro del bloque que se revierte (confírmalo en 057-0, sección «5 disparador»; según los PENDIENTES están apagados).
-- Un solo resultado. «SIN DATOS» = no había una fila adecuada para probar (no es una falla).
create temp table if not exists pruebas (orden integer, prueba text, resultado text, esperado text);
truncate pruebas;

create or replace function pg_temp.probar_cambio(p_orden integer, p_prueba text, p_antes text, p_cambio text, p_despues text, p_esperado text)
returns void language plpgsql as
$$ declare a boolean; b boolean; r text;
begin
  begin
    execute p_antes into a;
    execute p_cambio;
    execute p_despues into b;
    r := 'antes=' || a || ', despues=' || b;
    raise exception 'deshacer';                                  -- fuerza el deshacer de todo lo hecho en este bloque
  exception when others then
    if sqlerrm <> 'deshacer' then r := 'ERROR ' || sqlstate || ': ' || sqlerrm; end if;
  end;
  insert into pruebas values (p_orden, p_prueba, r, p_esperado);
end $$;

do $$
declare tm record; inv record; asg record; ab record;
begin
  select x.id, x.member_id, x.team_id into tm
    from public.team_members x join public.teams t on t.id = x.team_id and t.archived_at is null and t.organization_id = x.organization_id limit 1;
  if tm.id is null then insert into pruebas values (1, 'salir de un equipo quita el acceso al chat del equipo', 'SIN DATOS', 'antes=true, despues=false');
  else perform pg_temp.probar_cambio(1, 'salir de un equipo quita el acceso al chat del equipo',
         format('select public.chat_es_miembro_equipo(%L, %L)', tm.member_id, tm.team_id),
         format('delete from public.team_members where id = %L', tm.id),
         format('select public.chat_es_miembro_equipo(%L, %L)', tm.member_id, tm.team_id), 'antes=true, despues=false');
  end if;

  select i.id, i.member_id, i.service_id into inv
    from public.invitations i join public.services s on s.id = i.service_id
   where i.sent_at is not null and coalesce(i.status, '') <> 'declinado' and public.chat_sirve_servicio(i.member_id, i.service_id)
     and not exists (select 1 from public.invitations o where o.service_id = i.service_id and o.member_id = i.member_id and o.id <> i.id and o.sent_at is not null and coalesce(o.status, '') <> 'declinado')
   limit 1;
  if inv.id is null then insert into pruebas values (2, 'declinar la convocatoria quita el acceso al chat del servicio', 'SIN DATOS', 'antes=true, despues=false');
  else perform pg_temp.probar_cambio(2, 'declinar la convocatoria quita el acceso al chat del servicio',
         format('select public.chat_sirve_servicio(%L, %L)', inv.member_id, inv.service_id),
         format('update public.invitations set status = ''declinado'' where id = %L', inv.id),
         format('select public.chat_sirve_servicio(%L, %L)', inv.member_id, inv.service_id), 'antes=true, despues=false');
  end if;

  select b.id, b.member_id, b.service_id into asg
    from public.banda_assignments b join public.services s on s.id = b.service_id
   where b.member_id is not null and coalesce(s.tipo, '') <> 'ensayo' and coalesce(s.kind, '') <> 'rehearsal' and public.chat_sirve_servicio(b.member_id, b.service_id)
     and (select count(*) from public.banda_assignments o where o.service_id = b.service_id and o.member_id = b.member_id) = 1
   limit 1;
  if asg.id is null then insert into pruebas values (3, 'ser quitada de la nómina quita el acceso al chat del servicio', 'SIN DATOS', 'antes=true, despues=false');
  else perform pg_temp.probar_cambio(3, 'ser quitada de la nómina quita el acceso al chat del servicio',
         format('select public.chat_sirve_servicio(%L, %L)', asg.member_id, asg.service_id),
         format('delete from public.banda_assignments where id = %L', asg.id),
         format('select public.chat_sirve_servicio(%L, %L)', asg.member_id, asg.service_id), 'antes=true, despues=false');
  end if;

  -- la ventana de apertura: mover la fecha del servicio (dentro del bloque que se revierte) abre o cierra su chat
  select m.id as member_id, s.id as service_id into ab
    from public.members m join public.services s on s.organization_id = m.organization_id
   where s.fecha between current_date - 1 and current_date + public.chat_dias_antes_servicio() and public.chat_puede_servicio(m.id, s.id, false) limit 1;
  if ab.service_id is null then
    insert into pruebas values (4, 'un servicio que empieza en más de 7 días todavía no abre su chat', 'SIN DATOS', 'antes=true, despues=false');
    insert into pruebas values (5, 'un servicio que terminó hace más de 7 días ya no se lee', 'SIN DATOS', 'antes=true, despues=false');
  else
    perform pg_temp.probar_cambio(4, 'un servicio que empieza en más de 7 días todavía no abre su chat',
      format('select public.chat_puede_servicio(%L, %L, false)', ab.member_id, ab.service_id),
      format('update public.services set fecha = current_date + 30 where id = %L', ab.service_id),
      format('select public.chat_puede_servicio(%L, %L, false)', ab.member_id, ab.service_id), 'antes=true, despues=false');
    perform pg_temp.probar_cambio(5, 'un servicio que terminó hace más de 7 días ya no se lee',
      format('select public.chat_puede_servicio(%L, %L, false)', ab.member_id, ab.service_id),
      format('update public.services set fecha = current_date - 30 where id = %L', ab.service_id),
      format('select public.chat_puede_servicio(%L, %L, false)', ab.member_id, ab.service_id), 'antes=true, despues=false');
  end if;
end $$;

select orden as paso, prueba, resultado, esperado,
       case when resultado like 'SIN DATOS' then 'SIN DATOS' when resultado like esperado then 'OK' else 'FALLA' end as veredicto
  from pruebas order by orden;
