-- Vincula o cartão concluído ao post "Planejado" criado a partir dele (evita duplicar).
alter table public.tasks add column if not exists post_id uuid references public.posts(id) on delete set null;
