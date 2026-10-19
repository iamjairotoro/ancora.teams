-- ============================================================
-- Recordatorios — ¿A CUÁNTAS PERSONAS saldría el próximo recordatorio? (SOLO LECTURA, solo conteos)
--
-- Cómo usarlo: Supabase → SQL Editor → pegá TODO y «Run» (es una sola consulta; no escribe ni cambia nada, y NO imprime nombres ni correos).
-- Copia exactamente la lógica de app/api/reminder/route.ts, que el cron de Vercel corre todos los días a las 18:00 UTC:
--   · «recordatorio de 24 h»: invitaciones CONFIRMADAS de servicios con fecha = MAÑANA (día UTC). Sale 1 correo (si la persona tiene correo) y 1 push POR convocatoria.
--   · «aceptación pendiente»: invitaciones PENDIENTES ya publicadas (sent_at no nulo) de servicios con fecha de HOY en adelante (sin tope de días), que nunca recibieron
--     recordatorio o lo recibieron hace 23 h o más. Sale 1 correo (si tiene correo) y 1 push por convocatoria.
-- Esta consulta muestra, de esos dos grupos, solo los servicios de los PRÓXIMOS 3 DÍAS (fila «próximos 3 días») y TODOS los futuros (fila «todos los futuros»).
--
-- Cómo leerla:
--   convocatorias        = mensajes que saldrían (una persona en dos equipos recibe dos)
--   personas             = personas distintas
--   correo_test_local    = convocatorias cuya persona tiene un correo @test.local (NO es un buzón real: el servidor de correo lo rechaza o rebota)
--   correo_otro_dominio  = convocatorias con correo de cualquier otro dominio (son las que SÍ llegarían a una persona)
--   sin_correo           = convocatorias de personas sin correo cargado (solo recibirían push)
--   personas_con_push    = personas distintas con al menos una suscripción de push
-- Si «correo_otro_dominio» no es 0 y los datos son de prueba, ESO es lo que hay que revisar antes de desplegar a main (o dejar sin CRON_SECRET en Preview).
-- ============================================================
with hoy as (select (now() at time zone 'utc')::date as d),
base as (
  select 'recordatorio de 24 h (confirmados, mañana)'::text as grupo, i.id, i.member_id, s.fecha, m.email, exists (select 1 from push_subscriptions ps where ps.member_id = i.member_id) as push
  from invitations i
  join services s on s.id = i.service_id
  join members  m on m.id = i.member_id
  cross join hoy
  where i.status = 'confirmado' and s.fecha = hoy.d + 1
  union all
  select 'aceptación pendiente (se repite cada ~24 h)', i.id, i.member_id, s.fecha, m.email, exists (select 1 from push_subscriptions ps where ps.member_id = i.member_id) as push
  from invitations i
  join services s on s.id = i.service_id
  join members  m on m.id = i.member_id
  cross join hoy
  where i.status = 'pendiente' and i.sent_at is not null and s.fecha >= hoy.d
    and (i.last_reminder_at is null or now() - i.last_reminder_at >= interval '23 hours')
),
ventanas as (
  select 'próximos 3 días'::text as ventana, b.* from base b cross join hoy where b.fecha <= hoy.d + 3
  union all
  select 'todos los futuros', b.* from base b
)
select grupo,
       ventana,
       count(*)                                                                  as convocatorias,
       count(distinct member_id)                                                 as personas,
       count(*) filter (where email ilike '%@test.local')                        as correo_test_local,
       count(*) filter (where email is not null and email <> '' and email not ilike '%@test.local') as correo_otro_dominio,
       count(*) filter (where email is null or email = '')                       as sin_correo,
       count(distinct member_id) filter (where push) as personas_con_push
from ventanas
group by grupo, ventana
order by grupo, ventana desc;
-- Si un grupo no tiene ninguna convocatoria, esa fila no aparece (no es un error: no saldría nada).
