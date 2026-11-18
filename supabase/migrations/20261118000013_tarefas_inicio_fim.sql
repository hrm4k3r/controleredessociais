-- Hora de início e de fim dos cartões do Kanban (redes sociais), preenchidas ao mover entre colunas:
--   Em andamento -> started_at (início); Em revisão -> finished_at (fim).
-- Voltar ao início do fluxo ("A fazer") limpa os dois; voltar de revisão para andamento limpa só o fim.
alter table public.tasks
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz;

create or replace function public.track_task_times() returns trigger
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
      if new.started_at is null or old.status = 'a_fazer' then new.started_at := now(); end if;
      new.finished_at := null;
    elsif new.status = 'revisao' then
      new.finished_at := now();
    elsif new.status = 'a_fazer' then
      new.started_at := null;
      new.finished_at := null;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists tasks_track_times on public.tasks;
create trigger tasks_track_times before insert or update on public.tasks for each row execute function public.track_task_times();
