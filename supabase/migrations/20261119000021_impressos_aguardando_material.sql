-- Páginas de impressos: nova situação "Aguardando material" (anunciante ainda não enviou arte/texto/logo).
alter table public.print_pages drop constraint if exists print_pages_status_check;
alter table public.print_pages add constraint print_pages_status_check
  check (status in ('aguardando_material','para_fazer','produzindo','para_conferir','ajustes','aprovado'));
