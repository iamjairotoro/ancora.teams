-- Agregar tabla de bloques de orden de servicio
CREATE TABLE IF NOT EXISTS service_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  orden int NOT NULL,
  tipo text NOT NULL DEFAULT 'bloque', -- 'cancion' | 'bloque'
  titulo text,
  duracion_min int DEFAULT 5,
  notas text,
  song_id uuid REFERENCES songs(id) ON DELETE SET NULL,
  tono text,
  lead_id uuid REFERENCES members(id) ON DELETE SET NULL
);

ALTER TABLE service_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read blocks" ON service_blocks FOR SELECT USING (true);
CREATE POLICY "public write blocks" ON service_blocks FOR ALL USING (true);
