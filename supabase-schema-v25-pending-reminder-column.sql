-- Punto 5 del sistema de notificaciones: columna para saber cuándo fue el
-- último recordatorio de "aún no respondes" que se le mandó a cada
-- invitación pendiente, para no mandarlo más de una vez cada ~24hrs.
-- La lógica de envío vive en app/api/reminder/route.ts (mismo cron diario
-- que ya corre a las 18:00 UTC — no hace falta un cron nuevo).
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.

alter table invitations add column if not exists last_reminder_at timestamptz;
