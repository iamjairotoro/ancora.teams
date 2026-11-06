alter table public.song_section_variants add column if not exists formato smallint not null default 1, add constraint song_section_variants_formato_check check (formato in (1, 2));
