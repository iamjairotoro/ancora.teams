-- ── DISPONIBILIDAD ──
-- Tabla para que los músicos marquen su disponibilidad por servicio
CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('disponible','no_disponible')) DEFAULT 'disponible',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, service_id)
);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read availability" ON availability FOR SELECT USING (true);
CREATE POLICY "public write availability" ON availability FOR ALL USING (true);

-- Agregar hora de inicio y fin a servicios
ALTER TABLE services ADD COLUMN IF NOT EXISTS hora_inicio time DEFAULT '10:00:00';
ALTER TABLE services ADD COLUMN IF NOT EXISTS hora_fin time DEFAULT '14:00:00';

-- Agregar fecha de nacimiento a miembros
ALTER TABLE members ADD COLUMN IF NOT EXISTS fecha_nacimiento date;
