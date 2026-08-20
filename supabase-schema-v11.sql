-- ── FAVORITOS DE CANCIONES ──
CREATE TABLE IF NOT EXISTS song_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, song_id)
);

ALTER TABLE song_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read song_favorites" ON song_favorites FOR SELECT USING (true);
CREATE POLICY "public write song_favorites" ON song_favorites FOR ALL USING (true);
