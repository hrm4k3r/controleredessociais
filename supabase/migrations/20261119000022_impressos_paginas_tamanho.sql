-- Páginas de impressos: permite anunciantes com várias páginas inteiras (3, 4, 5...) além das frações.
alter table public.print_pages drop constraint if exists print_pages_size_check;
alter table public.print_pages add constraint print_pages_size_check
  check (size ~ '^([1-9][0-9]?|1/2|1/3|1/4|1/6|1/8)$');
