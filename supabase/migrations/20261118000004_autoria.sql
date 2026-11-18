-- Autoria: quem criou/editou cada post e quem criou/concluiu cada cartão.
-- Gravado por triggers (auth.uid()), então vale para qualquer tela que altere os dados.

alter table public.posts
  add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.tasks
  add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null,
  add column if not exists completed_by uuid references auth.users(id) on delete set null;

create or replace function public.track_post_author() returns trigger
language plpgsql as $$
begin
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  return new;
end $$;
drop trigger if exists posts_track_author on public.posts;
create trigger posts_track_author before update on public.posts for each row execute function public.track_post_author();

create or replace function public.track_task_author() returns trigger
language plpgsql as $$
begin
  if new.status = 'concluido' then
    if tg_op = 'INSERT' or old.status is distinct from 'concluido' then
      new.completed_by := auth.uid();
    end if;
  else
    new.completed_by := null;
  end if;
  return new;
end $$;
drop trigger if exists tasks_track_author on public.tasks;
create trigger tasks_track_author before insert or update on public.tasks for each row execute function public.track_task_author();

-- Nome de exibição: quem ainda não tem, usa a parte do e-mail antes do @ (editável na tela Usuários).
update public.organization_members m
set display_name = split_part(u.email, '@', 1)
from auth.users u
where u.id = m.user_id and (m.display_name is null or trim(m.display_name) = '');
