-- Tarefas (Kanban): cartões por semana, com coluna (status), ordem e cliente opcional.
create table public.tasks (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  notes text,
  status text not null default 'a_fazer' check (status in ('a_fazer','em_andamento','revisao','concluido')),
  due_date date,
  week_start date not null check (extract(isodow from week_start) = 1),  -- segunda-feira da semana do quadro
  position double precision not null default 0,                          -- ordem dentro da coluna
  created_at timestamptz not null default now()
);
create index on public.tasks (organization_id, week_start);

alter table public.tasks enable row level security;
create policy "membro da organizacao" on public.tasks for all to authenticated
  using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
