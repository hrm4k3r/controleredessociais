-- Pomodoro nos cartões do Kanban (redes sociais): quantos ciclos de foco foram concluídos e o tempo total de foco.
alter table public.tasks
  add column if not exists pomodoros integer not null default 0,
  add column if not exists focus_minutes integer not null default 0;

-- Para o futuro relatório de tempo (somente administradores): os itens do quadro de Projetos de Software
-- também passam a registrar início (Em desenvolvimento) e fim (Em revisão), como os cartões de redes sociais.
alter table public.dev_items
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz;

create or replace function public.track_dev_item_times() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'em_andamento' then new.started_at := coalesce(new.started_at, now());
    elsif new.status = 'revisao' then new.finished_at := coalesce(new.finished_at, now());
    end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    if new.status = 'em_andamento' then
      if new.started_at is null or old.status in ('backlog','a_fazer') then new.started_at := now(); end if;
      new.finished_at := null;
    elsif new.status = 'revisao' then
      new.finished_at := now();
    elsif new.status in ('backlog','a_fazer') then
      new.started_at := null;
      new.finished_at := null;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists dev_items_track_times on public.dev_items;
create trigger dev_items_track_times before insert or update on public.dev_items for each row execute function public.track_dev_item_times();
