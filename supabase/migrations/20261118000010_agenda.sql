-- Agenda: compromissos pessoais (e opcionalmente da equipe), com repetição. Quarto módulo ('agenda').
-- Datas e horários são "de parede" em America/Sao_Paulo (sem fuso no banco).

alter table public.organizations alter column modules set default array['social','dev','financeiro','agenda'];
update public.organizations set modules = array_append(modules, 'agenda') where not ('agenda' = any(modules));

create table public.agenda_events (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  location text,
  color text not null default 'blue',
  visibility text not null default 'private' check (visibility in ('private','team')),
  recurrence text not null default 'none' check (recurrence in ('none','daily','weekly','monthly','yearly')),
  recur_until date,
  start_date date not null,
  end_date date,                     -- só para eventos de dia inteiro que duram vários dias
  start_time time,                   -- null = dia inteiro
  end_time time,
  created_at timestamptz not null default now()
);
create index on public.agenda_events (organization_id, start_date);
create index on public.agenda_events (user_id);

alter table public.agenda_events enable row level security;
create policy "ver proprios e da equipe" on public.agenda_events for select to authenticated
  using (public.has_module(organization_id, 'agenda') and (user_id = auth.uid() or visibility = 'team'));
create policy "criar proprios" on public.agenda_events for insert to authenticated
  with check (public.has_module(organization_id, 'agenda') and user_id = auth.uid());
create policy "editar proprios" on public.agenda_events for update to authenticated
  using (public.has_module(organization_id, 'agenda') and user_id = auth.uid())
  with check (public.has_module(organization_id, 'agenda') and user_id = auth.uid());
create policy "apagar proprios" on public.agenda_events for delete to authenticated
  using (public.has_module(organization_id, 'agenda') and user_id = auth.uid());
