begin;

create table if not exists public.service_checklist_groups (
  id uuid primary key default gen_random_uuid(),
  service_checklist_id uuid not null references public.service_checklists(id) on delete cascade,
  team_position_id uuid references public.team_positions(id) on delete set null,
  titulo text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_checklist_groups_checklist on public.service_checklist_groups(service_checklist_id);
create index if not exists idx_service_checklist_groups_position on public.service_checklist_groups(team_position_id);
create index if not exists idx_service_checklist_groups_checklist_position on public.service_checklist_groups(service_checklist_id, team_position_id, sort_order);

alter table public.service_checklist_items add column if not exists group_id uuid references public.service_checklist_groups(id) on delete set null;
alter table public.service_checklist_items add column if not exists team_position_id uuid references public.team_positions(id) on delete set null;
alter table public.service_checklist_items add column if not exists checked_by_member_id uuid references public.members(id) on delete set null;
alter table public.service_checklist_items add column if not exists checked_at timestamptz;

create index if not exists idx_service_checklist_items_group on public.service_checklist_items(group_id);
create index if not exists idx_service_checklist_items_position on public.service_checklist_items(team_position_id);
create index if not exists idx_service_checklist_items_checklist_position on public.service_checklist_items(service_checklist_id, team_position_id);
create index if not exists idx_service_checklist_items_checked_by on public.service_checklist_items(checked_by_member_id);

alter table public.service_checklist_groups enable row level security;
alter table public.service_checklist_groups no force row level security;

revoke all on table public.service_checklist_groups from anon, authenticated;

commit;
