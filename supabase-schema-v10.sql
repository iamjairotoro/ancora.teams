-- ── NOTIFICACIONES PUSH ──
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read push_subscriptions" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "public write push_subscriptions" ON push_subscriptions FOR ALL USING (true);
