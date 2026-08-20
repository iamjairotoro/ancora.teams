-- ── BLOQUEOS LIBRES POR FECHA ──
-- Antes: date_blocks.service_id era obligatorio, así que solo se podían bloquear
-- fechas donde ya existiera un servicio creado.
-- Ahora: se bloquea por fecha directamente. service_id queda opcional, solo
-- como referencia informativa si esa fecha coincide con un servicio.

ALTER TABLE date_blocks ADD COLUMN IF NOT EXISTS blocked_date date;

-- Rellenar blocked_date para bloqueos existentes, usando la fecha del servicio al que apuntaban
UPDATE date_blocks db
SET blocked_date = s.fecha
FROM services s
WHERE db.service_id = s.id AND db.blocked_date IS NULL;

-- service_id ya no es obligatorio
ALTER TABLE date_blocks ALTER COLUMN service_id DROP NOT NULL;

-- Un miembro no puede bloquear la misma fecha dos veces
CREATE UNIQUE INDEX IF NOT EXISTS date_blocks_member_date_uniq ON date_blocks(member_id, blocked_date);
