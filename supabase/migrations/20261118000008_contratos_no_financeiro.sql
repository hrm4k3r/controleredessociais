-- Contratos (client_finance / payments) passam para a gestão Financeira (módulo 'financeiro').
drop policy if exists "gestor da organizacao" on public.client_finance;
drop policy if exists "gestor da organizacao" on public.payments;
create policy "gestor financeiro" on public.client_finance for all to authenticated
  using (public.is_org_manager(organization_id) and public.has_module(organization_id, 'financeiro'))
  with check (public.is_org_manager(organization_id) and public.has_module(organization_id, 'financeiro'));
create policy "gestor financeiro" on public.payments for all to authenticated
  using (public.is_org_manager(organization_id) and public.has_module(organization_id, 'financeiro'))
  with check (public.is_org_manager(organization_id) and public.has_module(organization_id, 'financeiro'));

-- Conta que recebe as mensalidades dos contratos no fluxo de caixa (no máximo uma por organização).
alter table public.fin_accounts add column if not exists receives_contracts boolean not null default false;
create unique index if not exists fin_accounts_one_contract_account on public.fin_accounts (organization_id) where receives_contracts;
