-- ── ENSAYOS ──
-- Reutiliza la tabla services con un tipo, en vez de crear una tabla nueva.
-- Un ensayo NO usa banda_assignments (no hay nominación por instrumento):
-- se convoca a todos los miembros directamente vía invitations.
ALTER TABLE services ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'servicio' CHECK (tipo IN ('servicio','ensayo'));
ALTER TABLE services ADD COLUMN IF NOT EXISTS lugar text;
