-- Link público (somente leitura) do relatório de evolução (antes × depois) de cada cliente.
create table public.evolution_links (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  client_id uuid primary key references public.clients(id) on delete cascade,
  public_token text not null unique,
  created_at timestamptz not null default now()
);
alter table public.evolution_links enable row level security;
create policy "modulo social" on public.evolution_links for all to authenticated
  using (public.has_module(organization_id, 'social')) with check (public.has_module(organization_id, 'social'));
