-- Impressos: páginas do trabalho (ex.: cada anunciante/matéria de uma revista), com quadro de produção.
create table public.print_pages (
  organization_id uuid not null default public.current_org() references public.organizations(id) on delete cascade,
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.print_jobs(id) on delete cascade,
  kind text not null default 'anuncio' check (kind in ('anuncio','materia','capa','contracapa','editorial','outro')),
  title text not null check (length(trim(title)) > 0),     -- nome do anunciante ou título da matéria
  advertiser text,                                         -- contratante (quando diferente do título)
  size text not null default '1' check (size in ('1','2','1/2','1/3','1/4','1/6','1/8')),  -- fração de página ocupada
  page_number integer check (page_number > 0),             -- posição na revista (opcional)
  status text not null default 'para_fazer' check (status in ('para_fazer','produzindo','para_conferir','ajustes','aprovado')),
  value numeric(12,2) check (value >= 0),                  -- valor do contrato (anúncio)
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  notes text,
  position double precision not null default 0,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.print_pages (job_id, status);

create or replace function public.track_print_page() returns trigger
language plpgsql as $$
begin
  if new.status = 'aprovado' then
    if tg_op = 'INSERT' or old.status is distinct from 'aprovado' then new.approved_by := auth.uid(); end if;
  else
    new.approved_by := null;
  end if;
  return new;
end $$;
create trigger print_pages_track before insert or update on public.print_pages for each row execute function public.track_print_page();

alter table public.print_pages enable row level security;
create policy "modulo impressos" on public.print_pages for all to authenticated
  using (public.has_module(organization_id, 'impressos')) with check (public.has_module(organization_id, 'impressos'));
