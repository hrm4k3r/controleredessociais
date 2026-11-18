-- Cartões do Kanban (redes sociais) passam a guardar formato, tema e redes, para gerar o post já completo.
alter table public.tasks
  add column if not exists format text,
  add column if not exists theme text,
  add column if not exists networks text[] not null default '{}';
