-- Registra la primera vez que detectamos que un músico abrió la app en modo
-- "instalada" (agregada a la pantalla de inicio), para poder ver cuántos la
-- tienen instalada así desde el admin.
--
-- Cómo correrlo: Supabase → tu proyecto → SQL Editor → pegar y ejecutar todo.

alter table members add column if not exists instalado_pwa_at timestamptz;
