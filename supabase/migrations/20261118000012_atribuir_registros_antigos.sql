-- Atribui ao proprietário (owner) os registros criados antes do controle de autoria (created_by nulo).
-- Seguro para rodar mais de uma vez: só mexe em linhas sem autor.
do $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.organization_members where role = 'owner' order by created_at limit 1;
  if owner_id is null then
    raise exception 'Nenhum proprietário encontrado em organization_members';
  end if;

  update public.posts        set created_by = owner_id where created_by is null;
  update public.tasks        set created_by = owner_id where created_by is null;
  update public.tasks        set completed_by = owner_id where status = 'concluido' and completed_by is null;
  update public.dev_projects set created_by = owner_id where created_by is null;
  update public.dev_items    set created_by = owner_id where created_by is null;
  update public.dev_items    set completed_by = owner_id where status = 'concluido' and completed_by is null;
  update public.fin_entries  set created_by = owner_id where created_by is null;
end $$;
