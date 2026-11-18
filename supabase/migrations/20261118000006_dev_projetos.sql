-- Gestão de Projetos de Software: projetos, marcos (entregas), itens (tarefas/bugs/melhorias) e horas.

create table public.dev_projects (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  kind text not null default 'sistema' check (kind in ('sistema','site','aplicativo','api','integracao','outro')),
  status text not null default 'planejamento' check (status in ('planejamento','em_andamento','pausado','concluido','cancelado')),
  description text,
  repo_url text,
  stack text,
  start_date date,
  due_date date,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.dev_milestones (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.dev_projects(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  due_date date,
  delivered_at date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.dev_items (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.dev_projects(id) on delete cascade,
  milestone_id uuid references public.dev_milestones(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  description text,
  type text not null default 'tarefa' check (type in ('tarefa','bug','melhoria','historia')),
  status text not null default 'backlog' check (status in ('backlog','a_fazer','em_andamento','revisao','teste','concluido')),
  priority text not null default 'media' check (priority in ('baixa','media','alta','urgente')),
  assignee_id uuid references auth.users(id) on delete set null,
  estimate_hours numeric(6,1) check (estimate_hours >= 0),
  due_date date,
  position double precision not null default 0,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.dev_time_entries (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.dev_projects(id) on delete cascade,
  item_id uuid references public.dev_items(id) on delete set null,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  work_date date not null default current_date,
  hours numeric(5,2) not null check (hours > 0 and hours <= 24),
  notes text,
  created_at timestamptz not null default now()
);

create index on public.dev_projects (organization_id);
create index on public.dev_items (project_id, status);
create index on public.dev_milestones (project_id);
create index on public.dev_time_entries (project_id, work_date);

create or replace function public.track_dev_item_author() returns trigger
language plpgsql as $$
begin
  if new.status = 'concluido' then
    if tg_op = 'INSERT' or old.status is distinct from 'concluido' then
      new.completed_by := auth.uid();
    end if;
  else
    new.completed_by := null;
  end if;
  return new;
end $$;
create trigger dev_items_track_author before insert or update on public.dev_items for each row execute function public.track_dev_item_author();

do $$
declare t text;
begin
  foreach t in array array['dev_projects','dev_milestones','dev_items','dev_time_entries']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "modulo dev" on public.%I for all to authenticated using (public.has_module(organization_id, ''dev'')) with check (public.has_module(organization_id, ''dev''))', t);
  end loop;
end $$;
