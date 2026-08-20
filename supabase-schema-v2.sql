-- Agregar columnas nuevas a songs (si no existen)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS bpm integer;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS compas text;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS link_recursos text;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS tags text[];
