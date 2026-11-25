-- EN PAUSA desde 2026-11-25: no ejecutar.
-- 057-v1 · Verificación (después de 057a). SOLO LECTURA. La regla de pertenencia contra los datos reales y los permisos de las funciones.
-- Un solo resultado: una fila por prueba; la columna «veredicto» debe decir OK en todas (INFO = solo informativo: copia su valor, no es falla). Puede tardar unos segundos. Copia la tabla entera.
select orden as paso, prueba, resultado, esperado, case when esperado = '*' then 'INFO' when resultado = esperado then 'OK' else 'FALLA' end as veredicto
from (
  select 1 as orden, 'ni anon ni authenticated pueden ejecutar funciones chat_* (cuántas sí pueden)' as prueba,
         (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'chat\_%' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')))::text as resultado, '0' as esperado

  union all select 2, '«sirve» un servicio normal sin estar asignada a ninguna posición (casos)',
         (select count(*) from public.members m join public.services s on s.organization_id = m.organization_id
           where coalesce(s.tipo, '') <> 'ensayo' and coalesce(s.kind, '') <> 'rehearsal' and not exists (select 1 from public.banda_assignments b where b.service_id = s.id and b.member_id = m.id)
             and public.chat_sirve_servicio(m.id, s.id))::text, '0'

  union all select 3, '«sirve» sin convocatoria enviada (casos)',
         (select count(*) from public.members m join public.services s on s.organization_id = m.organization_id
           where not exists (select 1 from public.invitations i where i.service_id = s.id and i.member_id = m.id and i.sent_at is not null)
             and public.chat_sirve_servicio(m.id, s.id))::text, '0'

  union all select 4, '«sirve» habiendo declinado todas sus convocatorias (casos)',
         (select count(*) from public.members m join public.services s on s.organization_id = m.organization_id
           where not exists (select 1 from public.invitations i where i.service_id = s.id and i.member_id = m.id and i.sent_at is not null and coalesce(i.status, '') <> 'declinado')
             and public.chat_sirve_servicio(m.id, s.id))::text, '0'

  union all select 5, '«sirve» un servicio de OTRA organización (casos)',
         (select count(*) from public.members m join public.services s on s.organization_id <> m.organization_id where public.chat_sirve_servicio(m.id, s.id))::text, '0'

  union all select 6, 'miembro de un equipo archivado, de otra organización o inexistente (casos)',
         (select count(*) from public.team_members tm left join public.teams t on t.id = tm.team_id
           where public.chat_es_miembro_equipo(tm.member_id, tm.team_id) and (t.id is null or t.archived_at is not null or t.organization_id <> tm.organization_id))::text, '0'

  union all select 7, 'chat_equipos_de difiere de los equipos vivos reales (diferencias en cualquier sentido)',
         (select count(*) from (
            (select tm.member_id, tm.team_id from public.team_members tm join public.teams t on t.id = tm.team_id and t.archived_at is null and t.organization_id = tm.organization_id
              except select m.id, e.team_id from public.members m, lateral public.chat_equipos_de(m.id) e)
            union all
            (select m.id, e.team_id from public.members m, lateral public.chat_equipos_de(m.id) e
              except select tm.member_id, tm.team_id from public.team_members tm join public.teams t on t.id = tm.team_id and t.archived_at is null and t.organization_id = tm.organization_id)
          ) d)::text, '0'

  union all select 8, 'chat abierto ANTES de tiempo: abierto aunque falten más de N días para el inicio (casos; N = chat_dias_antes_servicio())',
         (select count(*) from public.members m join public.services s on s.organization_id = m.organization_id
           where now() < public.chat_inicio_servicio(s.fecha, s.hora_inicio) - make_interval(days => public.chat_dias_antes_servicio())
             and public.chat_puede_servicio(m.id, s.id, false))::text, '0'

  union all select 9, 'chat abierto DESPUÉS de tiempo: leíble aunque hayan pasado más de N días del fin (casos)',
         (select count(*) from public.members m join public.services s on s.organization_id = m.organization_id
           where now() > public.chat_fin_servicio(s.fecha, s.hora_fin) + make_interval(days => public.chat_dias_visible_servicio())
             and public.chat_puede_servicio(m.id, s.id, false))::text, '0'

  union all select 10, 'el estado de una convocatoria solo toma los valores pendiente / confirmado / declinado (filas con otro valor o nulo)',
         (select count(*) from public.invitations where status is null or status not in ('pendiente', 'confirmado', 'declinado'))::text, '0'

  union all select 11, 'el tipo de un servicio solo toma los valores servicio / ensayo, y ensayo ⇔ kind = rehearsal (filas que no cumplen)',
         (select count(*) from public.services where tipo is null or tipo not in ('servicio', 'ensayo') or (tipo = 'ensayo') <> (coalesce(kind, '') = 'rehearsal'))::text, '0'

  union all select 12, 'informativo: valores de estado que hay hoy en invitations (cuántas de cada uno)',
         (select coalesce(string_agg(coalesce(status, '(nulo)') || ' = ' || n, ' · ' order by status), '(sin convocatorias)') from (select status, count(*) as n from public.invitations group by status) q), '*'

  union all select 13, 'informativo: servicios que hay hoy por tipo (cuántos de cada uno)',
         (select coalesce(string_agg(coalesce(tipo, '(nulo)') || ' = ' || n, ' · ' order by tipo), '(sin servicios)') from (select tipo, count(*) as n from public.services group by tipo) q), '*'

  union all select 14, 'informativo: personas asignadas a servicios próximos que HOY no tendrían su chat (sin convocatoria enviada o declinaron)',
         (select count(*) from public.banda_assignments b join public.services s on s.id = b.service_id
           where b.member_id is not null and s.fecha >= current_date - 1 and not public.chat_sirve_servicio(b.member_id, b.service_id))::text, '*'

  union all select 15, 'informativo: pares persona–servicio con el chat abierto HOY (dentro de la ventana de 7 días antes y 7 días después)',
         (select count(*) from public.members m join public.services s on s.organization_id = m.organization_id
           where s.fecha between current_date - public.chat_dias_visible_servicio() - 1 and current_date + public.chat_dias_antes_servicio() + 1
             and public.chat_puede_servicio(m.id, s.id, false))::text, '*'
) t order by orden;
