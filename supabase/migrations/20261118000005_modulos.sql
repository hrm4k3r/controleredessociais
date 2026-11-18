-- Módulos (gestões) vendáveis em separado: 'social' (Redes Sociais) e 'dev' (Projetos de Software).
--  - organizations.modules: o que a organização contratou (definido por quem vende/administra o pacote).
--  - organization_members.modules: o que cada usuário pode usar (null = todos os módulos da organização).
--  - clients.modules: em quais gestões o cliente aparece (clientes de projetos não poluem a gestão de redes).
-- O proprietário (owner) sempre acessa todos os módulos contratados.

alter table public.organizations add column if not exists modules text[] not null default array['social','dev'];
alter table public.organization_members add column if not exists modules text[];
alter table public.clients add column if not exists modules text[] not null default array['social'];

create or replace function public.has_module(org uuid, mod text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.organizations o
    join public.organization_members m on m.organization_id = o.id
    where o.id = org and m.user_id = auth.uid() and mod = any(o.modules)
      and (m.role = 'owner' or m.modules is null or mod = any(m.modules))
  );
$$;

-- Tabelas da gestão de redes sociais passam a exigir o módulo 'social'.
do $$
declare t text;
begin
  foreach t in array array['accounts','list_items','posts','post_networks','post_results','weekly_metrics','weekly_notes','client_emails','email_log','tasks']
  loop
    execute format('drop policy if exists "membro da organizacao" on public.%I', t);
    execute format('create policy "membro da organizacao" on public.%I for all to authenticated using (public.has_module(organization_id, ''social'')) with check (public.has_module(organization_id, ''social''))', t);
  end loop;
end $$;

-- Financeiro: gestor + módulo social.
drop policy if exists "gestor da organizacao" on public.client_finance;
drop policy if exists "gestor da organizacao" on public.payments;
create policy "gestor da organizacao" on public.client_finance for all to authenticated
  using (public.is_org_manager(organization_id) and public.has_module(organization_id, 'social'))
  with check (public.is_org_manager(organization_id) and public.has_module(organization_id, 'social'));
create policy "gestor da organizacao" on public.payments for all to authenticated
  using (public.is_org_manager(organization_id) and public.has_module(organization_id, 'social'))
  with check (public.is_org_manager(organization_id) and public.has_module(organization_id, 'social'));
-- clients permanece acessível a qualquer membro (cadastro compartilhado entre as gestões).
