-- ── ENSAYOS (consolidado) ──
-- Seguro de correr aunque supabase-schema-v7.sql nunca se haya ejecutado:
-- todas las columnas usan IF NOT EXISTS.
ALTER TABLE services ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'servicio' CHECK (tipo IN ('servicio','ensayo'));
ALTER TABLE services ADD COLUMN IF NOT EXISTS lugar text;       -- nombre del lugar (ej. "Sala 12")
ALTER TABLE services ADD COLUMN IF NOT EXISTS direccion text;  -- dirección en texto
ALTER TABLE services ADD COLUMN IF NOT EXISTS maps_link text;  -- link de Google Maps
