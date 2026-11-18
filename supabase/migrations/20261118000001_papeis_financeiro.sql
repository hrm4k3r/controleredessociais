-- Papéis e Financeiro: só owner/admin enxergam e alteram client_finance e payments.
-- Colaboradores continuam acessando o restante (postagens, métricas, resultados, relatório, cadastros).
-- Rode no SQL Editor do Supabase (depois das migrações anteriores).

create or replace function public.is_org_manager(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org and user_id = auth.uid() and role in ('owner','admin')
  );
$$;

drop policy if exists "membro da organizacao" on public.client_finance;
drop policy if exists "membro da organizacao" on public.payments;

create policy "gestor da organizacao" on public.client_finance for all to authenticated
  using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
create policy "gestor da organizacao" on public.payments for all to authenticated
  using (public.is_org_manager(organization_id)) with check (public.is_org_manager(organization_id));
