-- ============================================================
-- 035 — Estado del correo de cada invitación (punto 61, commit 2)
--
-- Claudia envió una convocatoria, la pantalla dijo «enviada», el aviso desapareció y no había forma de saber
-- si el correo falló. El resultado de cada envío se guarda APARTE de `sent_at`: `sent_at` sigue significando
-- «la invitación está publicada para la persona» (Home, portal, conteo de convocados) y NO depende del correo.
--
-- QUÉ HACE (aditivo; no toca ni borra ningún dato; todas las columnas nuevas quedan en NULL):
--   invitations.email_status        'enviado' = el servidor de correo ACEPTÓ el mensaje (no garantiza que llegue)
--                                   'falló'   = no se envió (dominio inexistente, rechazo, credenciales, límite...)
--                                   NULL      = nunca se intentó, o la invitación es anterior a esta migración
--   invitations.email_error         motivo corto de la falla; máximo 200 caracteres (lo recorta el servidor y lo
--                                   garantiza el CHECK). El servidor le quita el valor de las claves antes de guardarlo.
--   invitations.email_attempted_at  cuándo fue el último intento
--
-- QUIÉN LA USA: app/api/send-invites (escribe el resultado y reintenta un correo), app/api/reassignment-notify
-- (reinvitar) y la pantalla de Servicios (chip por persona + «Reintentar correo»). Si la migración todavía NO corrió,
-- el servidor sigue enviando igual: solo registra un aviso en el log al no poder guardar el estado, y la pantalla
-- muestra el resultado del envío en el panel pero no el chip por persona.
-- Sin cambios de RLS (eso es del punto 50): `invitations` hoy es legible con la llave pública, igual que antes; en
-- estas columnas no va ninguna clave ni dato nuevo (el correo de la persona ya está en `members`).
-- ============================================================

alter table public.invitations
  add column if not exists email_status text
    check (email_status in ('enviado', 'falló')),
  add column if not exists email_error text
    check (email_error is null or char_length(email_error) <= 200),
  add column if not exists email_attempted_at timestamptz;


-- ───────────────────────────────────────
-- VERIFICACIÓN (correr cada bloque por separado)
-- ───────────────────────────────────────

-- a · las tres columnas existen, son nullable y sin valor por defecto (3 filas; is_nullable = YES; column_default vacío)
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'invitations' and column_name like 'email\_%'
 order by column_name;

-- b · ninguna fila tiene estado todavía (con_estado debe dar 0; total = las invitaciones que ya había)
select count(*) filter (where email_status is not null or email_error is not null or email_attempted_at is not null) as con_estado,
       count(*) as total
  from public.invitations;

-- c · los dos CHECK quedaron puestos (2 filas)
select conname, pg_get_constraintdef(oid) as definicion
  from pg_constraint
 where conrelid = 'public.invitations'::regclass and contype = 'c' and conname like 'invitations\_email\_%'
 order by conname;

-- d · el CHECK rechaza un valor inválido: debe fallar con «violates check constraint» y NO cambiar nada
--     (correr SOLO si querés comprobarlo; usa una transacción que se deshace sola)
-- begin;
--   update public.invitations set email_status = 'entregado' where id = (select id from public.invitations limit 1);
-- rollback;


-- ───────────────────────────────────────
-- REVERTIR (solo si hiciera falta; se pierde únicamente el estado del correo, nada más)
-- El servidor sigue funcionando sin las columnas (ver «QUIÉN LA USA»).
-- ───────────────────────────────────────
-- alter table public.invitations
--   drop column if exists email_status,
--   drop column if exists email_error,
--   drop column if exists email_attempted_at;
