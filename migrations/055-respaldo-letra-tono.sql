create table if not exists public.song_text_backups (id uuid primary key default gen_random_uuid(), song_id uuid not null references public.songs(id) on delete cascade, organization_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.organizations(id), letra text, tono_original text, motivo text not null default 'editor-acordes', created_at timestamptz not null default now());
alter table public.song_text_backups enable row level security;
create index if not exists idx_song_text_backups_song on public.song_text_backups (song_id, created_at desc);
create index if not exists idx_song_text_backups_organization_id on public.song_text_backups (organization_id);
