# Prueba del vencimiento de convocatorias (punto 52, 037d)

**Qué se comprueba.** Una convocatoria se puede responder hasta el final del día del servicio **en la hora de Chile** (America/Santiago). Con un servicio de **ayer**, confirmar,
«no puedo», «Aceptar aquí» y «Quitar mi confirmación» responden `"resultado": "cerrada"` y no cambian nada. Con un servicio de **hoy** todo funciona igual que siempre.

Usa datos de prueba que se borran al final (todo lleva la marca `ZZ-PRUEBA`). No toca a ninguna persona real. Tarda unos 3 minutos.

**Antes de empezar:** la migración `037d` tiene que estar aplicada en la base donde lo hagas (primero «Ancora - TEST»; si no existe, en la real).

---

## Paso 1 · Preparar los datos

<!-- sql:preparar -->
```sql
do $$
declare
  m uuid; t1 uuid; s1 uuid; s2 uuid;
  hoy date := (now() at time zone 'America/Santiago')::date;
begin
  select id into t1 from public.teams where archived_at is null order by name limit 1;
  if t1 is null then raise exception 'Hace falta al menos 1 equipo activo para esta prueba.'; end if;

  insert into public.members (nombre, apellido, email) values ('ZZ-PRUEBA', 'Vencimiento', 'zz-prueba-vencimiento@example.com') returning id into m;
  insert into public.services (fecha, titulo, hora_inicio, hora_fin) values (hoy - 1, 'ZZ-PRUEBA AYER', '10:00', '12:00') returning id into s1;
  insert into public.services (fecha, titulo, hora_inicio, hora_fin) values (hoy,     'ZZ-PRUEBA HOY',  '15:00', '17:00') returning id into s2;
  insert into public.invitations (service_id, member_id, team_id, sent_at, status)
    values (s1, m, t1, now(), 'pendiente'), (s2, m, t1, now(), 'pendiente');
end $$;
```

## Paso 2 · La base: ayer cerrado, hoy abierto

<!-- sql:funcion -->
```sql
select s.titulo,
       public.responder_convocatoria(i.member_id, i.id, 'si', null) as respuesta
from public.invitations i join public.services s on s.id = i.service_id
where s.titulo in ('ZZ-PRUEBA AYER', 'ZZ-PRUEBA HOY')
order by s.titulo;
```

Esperado: **ZZ-PRUEBA AYER** → `{"resultado": "cerrada"}` · **ZZ-PRUEBA HOY** → `{"resultado": "ok", "desplazadas": []}`.

Comprobar que lo de ayer NO cambió y lo de hoy sí:

<!-- sql:estado -->
```sql
select s.titulo, i.status
from public.invitations i join public.services s on s.id = i.service_id
where s.titulo in ('ZZ-PRUEBA AYER', 'ZZ-PRUEBA HOY') order by s.titulo;
```

Esperado: AYER `pendiente` · HOY `confirmado`.

## Paso 3 · El enlace del correo (en el Preview)

<!-- sql:tokens -->
```sql
select s.titulo, i.token
from public.invitations i join public.services s on s.id = i.service_id
where s.titulo in ('ZZ-PRUEBA AYER', 'ZZ-PRUEBA HOY') order by s.titulo;
```

Abre `https://<tu-preview>/confirm/<token>`:
- el de **AYER** muestra «Esta convocatoria ya cerró», con candado y sin formulario;
- el de **HOY** muestra su estado normal (ya está confirmada).

## Paso 4 · «Declinar» sobre una confirmada (en el Preview)

Con la convocatoria de HOY ya confirmada (Paso 2), abre su detalle en el portal de esa persona (o el enlace del Paso 3) y pulsa **Declinar**: se abre la misma hoja de
confirmación («Declinar esta convocatoria»), con el foco en «Cancelar». Al confirmar queda «Declinado» y puede volver a «Confirmar».

> Los avisos al líder («no podrá asistir») no salen todavía: los cuatro triggers de aviso siguen apagados hasta la fase de notificaciones. Lo que se comprueba aquí es el estado.

## Paso 5 · Limpiar (siempre)

<!-- sql:limpiar -->
```sql
delete from public.invitations where member_id = (select id from public.members where email = 'zz-prueba-vencimiento@example.com');
delete from public.services where titulo in ('ZZ-PRUEBA AYER', 'ZZ-PRUEBA HOY');
delete from public.members where email = 'zz-prueba-vencimiento@example.com';
```

<!-- sql:verificar-limpieza -->
```sql
select
  (select count(*) from public.members where email = 'zz-prueba-vencimiento@example.com') as personas,
  (select count(*) from public.services where titulo like 'ZZ-PRUEBA%') as servicios;   -- los dos en 0
```

---

### Qué prueba esto y qué no

- Prueba que **la base** rechaza responder pasado el día del servicio y que el día mismo sigue abierto.
- Los **bordes de la medianoche** (23:59:59 / 00:00, y los dos cambios de horario de Chile) se probaron en desarrollo contra un Postgres real con 22.050 combinaciones de fecha e instante; no se pueden repetir a mano sin esperar a medianoche.
