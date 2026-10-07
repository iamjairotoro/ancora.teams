-- ============================================================
-- 030 — Rotar los tokens de invitación `auto_…` (punto 48)
--
-- POR QUÉ. El portal antiguo (/api/portal-by-member) creaba invitaciones con el
-- token `auto_<member_id>_<service_id>_<milisegundos>`: construido con ids que se
-- pueden leer con la llave pública, es decir, predecible. Desde el punto 48 el código
-- ya no los crea (usa 32 bytes aleatorios); esto reemplaza los que ya existen.
--
-- QUÉ HACE. Cambia `invitations.token` SOLO en las filas cuyo token empieza por
-- `auto_`, por 64 caracteres hexadecimales aleatorios (dos gen_random_uuid() sin
-- guiones; función propia de Postgres, sin pgcrypto). No toca ninguna otra fila ni
-- ninguna otra columna: status, comentario, sent_at, etc. quedan igual. Los triggers
-- de `invitations` (RSVP, snapshot de posiciones) solo actúan si cambia `status`, que
-- aquí no cambia; no se envía ningún aviso.
--
-- EFECTO VISIBLE. Un enlace /confirm/auto_… o /portal/auto_… que ya se haya enviado
-- (por correo o por un chat) deja de funcionar: dirá «no encontrado». Por eso el PASO 1
-- cuenta cuántas filas afecta y cuántas ya fueron enviadas (sent_at no es null). Para
-- esas, quien quiera responder entra por /portal (Google o enlace de acceso).
--
-- NO SE PUEDE REVERTIR. Los valores viejos no se guardan en ninguna parte (guardarlos
-- sería conservar justamente lo que se quiere eliminar): NO hay bloque REVERTIR. Si
-- hace falta dar otro enlace, se genera uno nuevo.
--
-- Corré esto en "Ancora - Teams". Idempotente: una segunda corrida no afecta filas.
-- ============================================================


-- ───────────────────────────────────────
-- PASO 1 — COMPROBACIÓN PREVIA (solo lectura; correla ANTES del PASO 2)
-- ───────────────────────────────────────
-- Cuántas filas va a afectar, y de ellas cuántas ya se enviaron.
--
-- select count(*)                                    as afectadas,
--        count(*) filter (where sent_at is not null) as ya_enviadas
--   from public.invitations
--  where left(token, 5) = 'auto_';


-- ───────────────────────────────────────
-- PASO 2 — ROTAR
-- ───────────────────────────────────────
update public.invitations
   set token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where left(token, 5) = 'auto_';


-- ───────────────────────────────────────
-- PASO 3 — VERIFICACIÓN (correr cada bloque por separado)
-- ───────────────────────────────────────

-- 3a · no queda ningún token `auto_` (debe dar 0)
--
-- select count(*) as auto_restantes from public.invitations where left(token, 5) = 'auto_';

-- 3b · formato de los tokens (los rotados aparecen como hex64; ninguno debe ser auto_)
--
-- select case when token ~ '^[0-9a-f]{64}$' then 'hex64'
--             when left(token, 5) = 'auto_'  then 'auto_'
--             else 'otro' end as formato,
--        count(*)
--   from public.invitations group by 1 order by 1;

-- 3c · ningún token repetido (no debe devolver filas; `token` ya es unique)
--
-- select token, count(*) from public.invitations group by token having count(*) > 1;

-- 3d · idempotencia: volver a correr el PASO 2 afecta 0 filas
