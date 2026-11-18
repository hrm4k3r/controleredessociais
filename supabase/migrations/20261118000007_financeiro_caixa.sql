-- Gestão Financeira (fluxo de caixa): contas, categorias e lançamentos de entrada/saída.
-- Terceiro módulo vendável ('financeiro'); acesso restrito a proprietário/administrador.

alter table public.organizations alter column modules set default array['social','dev','financeiro'];
update public.organizations set modules = array_append(modules, 'financeiro') where not ('financeiro' = any(modules));

create table public.fin_accounts (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  kind text not null default 'banco' check (kind in ('caixa','banco','cartao','outro')),
  opening_balance numeric(14,2) not null default 0,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.fin_categories (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('entrada','saida')),
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, kind, name)
);

create table public.fin_entries (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('entrada','saida')),
  description text not null check (length(trim(description)) > 0),
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  paid_date date,                                   -- null = ainda não recebido/pago
  account_id uuid references public.fin_accounts(id) on delete set null,
  category_id uuid references public.fin_categories(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  notes text,
  group_id uuid,                                    -- lançamentos gerados juntos (parcelas/recorrência)
  installment integer,
  installments integer,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.fin_entries (organization_id, due_date);
create index on public.fin_entries (organization_id, paid_date);

do $$
declare t text;
begin
  foreach t in array array['fin_accounts','fin_categories','fin_entries']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "gestor financeiro" on public.%I for all to authenticated using (public.is_org_manager(organization_id) and public.has_module(organization_id, ''financeiro'')) with check (public.is_org_manager(organization_id) and public.has_module(organization_id, ''financeiro''))', t);
  end loop;
end $$;
