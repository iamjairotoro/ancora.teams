# Prueba de concurrencia del conflicto de convocatorias (punto 52, 037c)

**Qué se comprueba.** Una persona con dos convocatorias que se cruzan (mismo día, horarios que se solapan) pulsa «Confirmo» en las dos **al mismo tiempo**
(dos pestañas, dos dispositivos, un doble toque). La base tiene que dejar pasar a UNA y rechazar a la otra: nunca las dos.

**Cómo se hace sin dos personas ni dos teléfonos.** Con dos pestañas del navegador abiertas en el editor SQL de Supabase. La pestaña A confirma una convocatoria y se
queda sujetando la transacción 20 segundos; en ese tiempo la pestaña B intenta confirmar la otra. Si el bloqueo por persona funciona, **B se queda esperando** hasta que
A termina y entonces recibe `"resultado": "conflicto"`. Si NO funcionara, B respondería enseguida `"ok"` y quedarían dos confirmadas.

Esto usa datos de prueba que se borran al final (todo lleva la marca `ZZ-PRUEBA`). No toca a ninguna persona real. Tarda unos 3 minutos.

**Antes de empezar:** la migración `037c` tiene que estar aplicada en la base donde lo hagas (primero «Ancora - TEST»; si no existe, en la real).

---

## Paso 1 · Preparar los datos de prueba

Abre **Supabase → tu proyecto → SQL Editor → New query**, pega esto y pulsa **Run**. Debe terminar sin error y mostrar «Success».

<!-- sql:preparar -->
```sql
do $$
declare
  m uuid; t1 uuid; t2 uuid; s1 uuid; s2 uuid;
begin
  select id into t1 from public.teams where archived_at is null order by name limit 1;
  select id into t2 from public.teams where archived_at is null order by name offset 1 limit 1;
  if t1 is null or t2 is null then raise exception 'Hacen falta al menos 2 equipos activos para esta prueba.'; end if;

  insert into public.members (nombre, apellido, email) values ('ZZ-PRUEBA', 'Concurrencia', 'zz-prueba-concurrencia@example.com') returning id into m;
  insert into public.services (fecha, titulo, hora_inicio, hora_fin) values (current_date + 400, 'ZZ-PRUEBA A', '11:00', '13:00') returning id into s1;
  insert into public.services (fecha, titulo, hora_inicio, hora_fin) values (current_date + 400, 'ZZ-PRUEBA B', '11:00', '13:00') returning id into s2;
  insert into public.invitations (service_id, member_id, team_id, sent_at, status)
    values (s1, m, t1, now(), 'pendiente'), (s2, m, t2, now(), 'pendiente');
end $$;
```

## Paso 2 · Dos pestañas

Abre **dos pestañas del navegador** con el editor SQL de Supabase (cada una con «New query»). Llámalas **A** y **B**. En cada una pega su bloque, **sin ejecutarlo todavía**.

**Pestaña A** (confirma «ZZ-PRUEBA A» y mantiene la transacción abierta 20 segundos):

<!-- sql:pestana-a -->
```sql
begin;
select public.responder_convocatoria(
  (select id from public.members where email = 'zz-prueba-concurrencia@example.com'),
  (select i.id from public.invitations i join public.services s on s.id = i.service_id where s.titulo = 'ZZ-PRUEBA A'),
  'si', null) as pestana_a;
select pg_sleep(20);
commit;
select pg_backend_pid() as conexion_de_a;
```

**Pestaña B** (intenta confirmar «ZZ-PRUEBA B»):

<!-- sql:pestana-b -->
```sql
select pg_backend_pid() as conexion_de_b,
  public.responder_convocatoria(
    (select id from public.members where email = 'zz-prueba-concurrencia@example.com'),
    (select i.id from public.invitations i join public.services s on s.id = i.service_id where s.titulo = 'ZZ-PRUEBA B'),
    'si', null) as pestana_b;
```

## Paso 3 · Ejecutar las dos casi a la vez

1. Pulsa **Run** en la pestaña **A**.
2. **Dentro de los 5 segundos siguientes**, pulsa **Run** en la pestaña **B**.
3. La pestaña B se quedará «cargando» (el círculo girando). Es lo esperado. Espera a que termine (unos 15 a 20 segundos).

## Paso 4 · Qué tienes que ver

- **Pestaña B**: tarda entre 15 y 20 segundos (no responde al instante) y muestra `conexion_de_b` y en `pestana_b` el texto `"resultado": "conflicto"`.
- **Pestaña A**: al terminar muestra `conexion_de_a`.
- **Los dos números de conexión (`conexion_de_a` y `conexion_de_b`) tienen que ser DISTINTOS.** Si fueran iguales, el editor usó la misma conexión para las dos pestañas y la prueba no vale: repítela
  desde el Paso 3 (si sigue igual, avísame).

Si B respondió **en menos de 3 segundos** con `"resultado": "ok"`, la protección NO está funcionando: copia lo que viste y no habilites el conflicto en producción.

## Paso 5 · Comprobar el estado final

Pega esto en cualquier pestaña y pulsa Run. Debe mostrar **A confirmado** y **B declinado por conflicto** (nunca las dos confirmadas):

<!-- sql:resultado -->
```sql
select s.titulo, i.status, i.declined_reason
from public.invitations i
join public.services s on s.id = i.service_id
where s.titulo in ('ZZ-PRUEBA A', 'ZZ-PRUEBA B')
order by s.titulo;
```

Esperado:

| titulo | status | declined_reason |
|---|---|---|
| ZZ-PRUEBA A | confirmado | (vacío) |
| ZZ-PRUEBA B | declinado | conflict |

## Paso 6 · Limpiar (siempre)

<!-- sql:limpiar -->
```sql
delete from public.invitations where member_id = (select id from public.members where email = 'zz-prueba-concurrencia@example.com');
delete from public.services where titulo in ('ZZ-PRUEBA A', 'ZZ-PRUEBA B');
delete from public.members where email = 'zz-prueba-concurrencia@example.com';
```

Después puedes comprobar que no quedó nada:

<!-- sql:verificar-limpieza -->
```sql
select
  (select count(*) from public.members where email = 'zz-prueba-concurrencia@example.com') as personas,
  (select count(*) from public.services where titulo like 'ZZ-PRUEBA%') as servicios;   -- los dos en 0
```

---

### Qué prueba esto y qué no

- Prueba que **la base espera y rechaza** cuando dos respuestas de la misma persona llegan juntas (el bloqueo por persona).
- No reemplaza la prueba automática: en el desarrollo se repitió 200 veces con tres respuestas simultáneas contra un Postgres real (0 fallos), y se comprobó que sin el bloqueo sí fallaba.
- No prueba la pantalla del portal (eso es el commit 4).
