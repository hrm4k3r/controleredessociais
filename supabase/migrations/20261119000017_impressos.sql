-- Gestão de Materiais Impressos (quinto módulo, 'impressos'): trabalhos (revista, cartão de visita...),
-- etapas (checklist), provas/aprovações com o cliente e custos.

alter table public.organizations alter column modules set default array['social','dev','financeiro','agenda','impressos'];
update public.organizations set modules = array_append(modules, 'impressos') where not ('impressos' = any(modules));

create table public.print_jobs (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  kind text not null default 'outro' check (kind in ('revista','cartao','folder','flyer','banner','adesivo','catalogo','cardapio','embalagem','outro')),
  status text not null default 'briefing' check (status in ('briefing','criacao','aprovacao','impressao','acabamento','pronto','entregue','cancelado')),
  quantity integer check (quantity > 0),
  pages integer check (pages > 0),
  size text,            -- formato final, ex.: 21x28 cm, 9x5 cm
  paper text,           -- papel/gramatura, ex.: Couchê 90g miolo / 250g capa
  colors text,          -- ex.: 4x4 (frente e verso colorido)
  finish text,          -- acabamento: laminação, verniz, grampo, lombada...
  supplier text,        -- gráfica
  cost numeric(12,2) check (cost >= 0),   -- custo (gráfica + terceiros)
  price numeric(12,2) check (price >= 0), -- valor cobrado do cliente
  due_date date,        -- prazo de entrega ao cliente
  delivered_at date,
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.print_steps (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  done boolean not null default false,
  done_by uuid references auth.users(id) on delete set null,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create table public.print_proofs (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  version integer not null default 1,
  sent_at date not null default current_date,
  result text not null default 'aguardando' check (result in ('aguardando','aprovada','ajustes')),
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.print_jobs (organization_id, status);
create index on public.print_steps (job_id);
create index on public.print_proofs (job_id);

create or replace function public.track_print_job() returns trigger
language plpgsql as $$
begin
  if new.status = 'entregue' then
    if tg_op = 'INSERT' or old.status is distinct from 'entregue' then
      new.completed_by := auth.uid();
      new.delivered_at := coalesce(new.delivered_at, current_date);
    end if;
  else
    new.completed_by := null;
    new.delivered_at := null;
  end if;
  return new;
end $$;
create trigger print_jobs_track before insert or update on public.print_jobs for each row execute function public.track_print_job();

create or replace function public.track_print_step() returns trigger
language plpgsql as $$
begin
  if new.done then
    if tg_op = 'INSERT' or not old.done then new.done_by := auth.uid(); end if;
  else
    new.done_by := null;
  end if;
  return new;
end $$;
create trigger print_steps_track before insert or update on public.print_steps for each row execute function public.track_print_step();

do $$
declare t text;
begin
  foreach t in array array['print_jobs','print_steps','print_proofs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "modulo impressos" on public.%I for all to authenticated using (public.has_module(organization_id, ''impressos'')) with check (public.has_module(organization_id, ''impressos''))', t);
  end loop;
end $$;
