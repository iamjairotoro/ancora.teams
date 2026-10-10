-- ============================================================
-- 034 — Acceso a la biblioteca de canciones por equipo (punto 59)
--
-- Regla de Claudia: la biblioteca (lista completa, favoritas, tono/BPM/compás, enlaces, notas de la
-- canción, letra, adjuntos, audio) es solo para los equipos marcados; los demás ven las canciones
-- DE ESE DOMINGO (título y artista) y el detalle del servicio. Un campo por EQUIPO, no por nombre.
--
-- QUÉ HACE: agrega teams.library_access boolean not null default false (aditivo). CIERRA POR DEFECTO:
-- no marca ningún equipo; Claudia marca Alabanza desde Ajustes del equipo (commit c del punto 59).
-- Hasta que corra esta migración, el servidor trata a todos como «sin acceso» (salvo owner y admin).
--
-- QUIÉN LA USA: lib/auth/libraryAccess.ts (servidor). Sin cambios de RLS (eso es del punto 50).
-- ============================================================

alter table public.teams add column if not exists library_access boolean not null default false;

-- ── Verificación: todos los equipos con library_access = false ──
select name, library_access from public.teams order by name;

-- ── REVERTIR (solo si hiciera falta; el servidor dejaría a todos sin acceso salvo owner/admin) ──
-- alter table public.teams drop column if exists library_access;
