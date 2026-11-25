-- Google Meu Negócio: números próprios do perfil (lançados uma vez por mês, na linha do Google).
alter table public.weekly_metrics
  add column if not exists calls integer check (calls >= 0),
  add column if not exists directions integer check (directions >= 0),
  add column if not exists website_clicks integer check (website_clicks >= 0),
  add column if not exists chat_clicks integer check (chat_clicks >= 0),
  add column if not exists bookings integer check (bookings >= 0);
