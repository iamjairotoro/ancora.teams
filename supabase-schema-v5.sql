-- Add avatar_url to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add admin_emails table to control who is admin
CREATE TABLE IF NOT EXISTS admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read admin_emails" ON admin_emails FOR SELECT USING (true);
CREATE POLICY "public write admin_emails" ON admin_emails FOR ALL USING (true);

-- Insert your admin email
INSERT INTO admin_emails (email) VALUES ('team.ancoraworship@gmail.com') ON CONFLICT DO NOTHING;

-- Storage policy for avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public avatar access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Auth users can update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
