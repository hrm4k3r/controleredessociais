-- Controle de Redes Sociais — schema inicial
-- Todas as tabelas com RLS: só usuário autenticado lê/escreve.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_internal boolean not null default false,       -- conta própria (Rixxer): fora do financeiro
  weekly_goal integer not null default 0 check (weekly_goal >= 0), -- meta de posts (conteúdos) por semana
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.accounts (                       -- conta = cliente + rede
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  network text not null,
  created_at timestamptz not null default now(),
  unique (client_id, network)
);

create table public.list_items (                     -- listas editáveis: network | format | theme
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('network','format','theme')),
  label text not null,
  sort integer not null default 0,
  unique (kind, label)
);

create table public.posts (                          -- uma linha por post (conteúdo)
  id uuid primary key default gen_random_uuid(),
  post_date date not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'Planejado' check (status in ('Postado','Agendado','Planejado','Não postado')),
  format text,
  theme text,
  summary text,
  link text,
  notes text,
  created_at timestamptz not null default now()
);
create index posts_client_date_idx on public.posts (client_id, post_date);

create table public.post_networks (                  -- redes em que o post saiu
  post_id uuid not null references public.posts(id) on delete cascade,
  network text not null,
  primary key (post_id, network)
);

create table public.post_results (                   -- resultado do post por rede
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

create table public.weekly_metrics (                 -- métricas semanais por conta (week_start = segunda)
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

create table public.weekly_notes (                   -- comentário/próximos passos + token público do relatório
  client_id uuid not null references public.clients(id) on delete cascade,
  week_start date not null,
  comment text,
  next_steps text,
  public_token text unique,
  updated_at timestamptz not null default now(),
  primary key (client_id, week_start),
  check (extract(isodow from week_start) = 1)
);

create table public.client_finance (                 -- cadastro financeiro (só clientes externos)
  client_id uuid primary key references public.clients(id) on delete cascade,
  monthly_amount numeric(12,2) not null default 0 check (monthly_amount >= 0),
  due_day integer not null default 1 check (due_day between 1 and 31),
  notes text
);

create table public.payments (                       -- controle mensal (ref_month = dia 1 do mês)
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
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (client_id, email)
);

create table public.email_log (
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

-- RLS: apenas usuários autenticados
do $$
declare t text;
begin
  foreach t in array array['clients','accounts','list_items','posts','post_networks','post_results',
    'weekly_metrics','weekly_notes','client_finance','payments','client_emails','email_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "autenticado total" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
