-- Marco inicial de cada conta (cliente + rede): os números de partida para o "antes × depois".
-- Mesmos campos das métricas semanais (seguidores totais e números dos últimos 7 dias até baseline_date).
create table public.account_baselines (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  network text not null,
  baseline_date date not null,          -- dia da coleta (ex.: o domingo anterior ao início do trabalho)
  followers integer check (followers >= 0),
  views integer check (views >= 0),
  reach integer check (reach >= 0),
  interactions integer check (interactions >= 0),
  clicks integer check (clicks >= 0),
  notes text,
  updated_at timestamptz not null default now(),
  primary key (client_id, network)
);

alter table public.account_baselines enable row level security;
create policy "modulo social" on public.account_baselines for all to authenticated
  using (public.has_module(organization_id, 'social')) with check (public.has_module(organization_id, 'social'));
