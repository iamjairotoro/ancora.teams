-- #1: BPM como decimal
ALTER TABLE songs ALTER COLUMN bpm TYPE float USING bpm::float;

-- #3: Duración en canciones
ALTER TABLE songs ADD COLUMN IF NOT EXISTS duracion_min float;
