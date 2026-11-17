-- Controle de Redes Sociais — schema inicial (multi-agência desde já)
-- Cada tabela de negócio tem organization_id; RLS isola por organização (membro autenticado).
-- Papéis em organization_members: owner | admin | colaborador (permissões finas por papel/cliente virão em migração futura).

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb not null default '{}'::jsonb,  -- metas padrão, pesos da nota, marca/logo, remetente de e-mail...
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'colaborador' check (role in ('owner','admin','colaborador')),
  display_name text,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- Funções de apoio (security definer: evitam recursão de RLS)
create or replace function public.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = org and user_id = auth.uid());
$$;

create or replace function public.current_org() returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_members where user_id = auth.uid() order by created_at limit 1;
$$;

create table public.clients (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_internal boolean not null default false,       -- conta própria (Rixxer): fora do financeiro
  weekly_goal integer not null default 0 check (weekly_goal >= 0), -- meta de posts (conteúdos) por semana
  sort integer not null default 0,
  active boolean not null default true,
  allows_promo boolean not null default false,     -- autoriza divulgação do relatório (padrão: não)
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.accounts (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,                       -- conta = cliente + rede
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  network text not null,
  created_at timestamptz not null default now(),
  unique (client_id, network)
);

create table public.list_items (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,                     -- listas editáveis: network | format | theme
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('network','format','theme')),
  label text not null,
  sort integer not null default 0,
  unique (organization_id, kind, label)
);

create table public.posts (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,                          -- uma linha por post (conteúdo)
  id uuid primary key default gen_random_uuid(),
  post_date date not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'Planejado' check (status in ('Postado','Agendado','Planejado','Não postado')),
  format text,
  theme text,
  summary text,
  link text,
  notes text,
  planned_date date,                                 -- data planejada (pontualidade)
  posted_by uuid references auth.users(id),          -- colaborador que postou
  posted_at timestamptz,                             -- quando foi marcado como Postado
  created_at timestamptz not null default now()
);
create index posts_client_date_idx on public.posts (client_id, post_date);

create table public.post_networks (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,                  -- redes em que o post saiu
  post_id uuid not null references public.posts(id) on delete cascade,
  network text not null,
  primary key (post_id, network)
);

create table public.post_results (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,                   -- resultado do post por rede
  post_id uuid not null references public.posts(id) on delete cascade,
  network text not null,
  views integer check (views >= 0),
  reach integer check (reach >= 0),
  likes integer check (likes >= 0),
  comments integer check (comments >= 0),
  shares integer check (shares >= 0),
  saves integer check (saves >= 0),
  clicks integer check (clicks >= 0),
  updated_at timestamptz not null default now(),
  primary key (post_id, network)
);

create table public.weekly_metrics (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,                 -- métricas semanais por conta (week_start = segunda)
  client_id uuid not null references public.clients(id) on delete cascade,
  network text not null,
  week_start date not null,
  followers integer check (followers >= 0),
  views integer check (views >= 0),
  reach integer check (reach >= 0),
  interactions integer check (interactions >= 0),
  clicks integer check (clicks >= 0),
  learning text,
  updated_at timestamptz not null default now(),
  primary key (client_id, network, week_start),
  check (extract(isodow from week_start) = 1)
);

create table public.weekly_notes (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,                   -- comentário/próximos passos + token público do relatório
  client_id uuid not null references public.clients(id) on delete cascade,
  week_start date not null,
  comment text,
  next_steps text,
  public_token text unique,
  updated_at timestamptz not null default now(),
  primary key (client_id, week_start),
  check (extract(isodow from week_start) = 1)
);

create table public.client_finance (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,                 -- cadastro financeiro (só clientes externos)
  client_id uuid primary key references public.clients(id) on delete cascade,
  monthly_amount numeric(12,2) not null default 0 check (monthly_amount >= 0),
  due_day integer not null default 1 check (due_day between 1 and 31),
  notes text
);

create table public.payments (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,                       -- controle mensal (ref_month = dia 1 do mês)
  client_id uuid not null references public.clients(id) on delete cascade,
  ref_month date not null,
  amount_due numeric(12,2) check (amount_due >= 0), -- valor devido no mês (se vazio, usa o valor mensal atual do cadastro)
  paid_date date,
  paid_amount numeric(12,2) check (paid_amount >= 0),
  notes text,
  updated_at timestamptz not null default now(),
  primary key (client_id, ref_month),
  check (extract(day from ref_month) = 1)
);

create table public.client_emails (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (client_id, email)
);

create table public.email_log (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  week_start date not null,
  recipient text not null,
  status text not null check (status in ('enviado','teste','erro')),
  detail text,
  provider_id text,
  trigger text not null default 'manual' check (trigger in ('manual','cron')),
  sent_at timestamptz not null default now()
);
create index email_log_client_idx on public.email_log (client_id, week_start);

create index on public.clients (organization_id);
create index on public.posts (organization_id);

-- RLS: cada organização só enxerga os próprios dados
do $$
declare t text;
begin
  foreach t in array array['clients','accounts','list_items','posts','post_networks','post_results',
    'weekly_metrics','weekly_notes','client_finance','payments','client_emails','email_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "membro da organizacao" on public.%I for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t);
  end loop;
end $$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
create policy "ver propria organizacao" on public.organizations for select to authenticated using (public.is_org_member(id));
create policy "ver membros da organizacao" on public.organization_members for select to authenticated using (public.is_org_member(organization_id));

-- O primeiro usuário criado no painel do Supabase vira owner da primeira organização (Rixxer, criada no seed).
create or replace function public.on_first_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare org uuid;
begin
  select id into org from public.organizations order by created_at limit 1;
  if org is not null and not exists (select 1 from public.organization_members where organization_id = org) then
    insert into public.organization_members (organization_id, user_id, role) values (org, new.id, 'owner');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.on_first_user();
