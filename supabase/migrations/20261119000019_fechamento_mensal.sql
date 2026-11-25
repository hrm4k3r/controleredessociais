-- Fechamento mensal: números do mês inteiro por rede (lançados a partir do dia 5), notas do mês e link público do relatório mensal.
create table public.monthly_metrics (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  network text not null,
  month date not null,                      -- sempre o dia 1 do mês
  followers integer check (followers >= 0),
  views integer check (views >= 0),
  reach integer check (reach >= 0),
  interactions integer check (interactions >= 0),
  clicks integer check (clicks >= 0),
  calls integer check (calls >= 0),          -- Google Meu Negócio
  directions integer check (directions >= 0),
  website_clicks integer check (website_clicks >= 0),
  chat_clicks integer check (chat_clicks >= 0),
  bookings integer check (bookings >= 0),
  learning text,
  updated_at timestamptz not null default now(),
  primary key (client_id, network, month),
  check (extract(day from month) = 1)
);

create table public.monthly_notes (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  month date not null,
  comment text,
  next_steps text,
  collected_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (client_id, month),
  check (extract(day from month) = 1)
);

create table public.monthly_links (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  client_id uuid primary key references public.clients(id) on delete cascade,
  public_token text not null unique,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['monthly_metrics','monthly_notes','monthly_links']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "modulo social" on public.%I for all to authenticated using (public.has_module(organization_id, ''social'')) with check (public.has_module(organization_id, ''social''))', t);
  end loop;
end $$;
