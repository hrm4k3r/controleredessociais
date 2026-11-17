-- Dados iniciais (idempotente). Pagamentos NÃO são lançados: o usuário confirma no sistema.

insert into public.list_items (kind, label, sort) values
  ('network','Instagram',1),('network','Facebook',2),('network','TikTok',3),('network','YouTube',4),
  ('network','Pinterest',5),('network','Google Meu Negócio',6),
  ('format','Reels',1),('format','Feed (imagem)',2),('format','Carrossel',3),('format','Stories',4),
  ('format','Vídeo longo',5),('format','Texto/Legenda',6),('format','Outro',7),
  ('theme','Produto/Serviço',1),('theme','Promoção/Oferta',2),('theme','Bastidores',3),
  ('theme','Prova social/Depoimento',4),('theme','Educativo/Dica',5),('theme','Institucional',6),
  ('theme','Data comemorativa',7),('theme','Engajamento/Enquete',8)
on conflict (kind, label) do nothing;

insert into public.clients (name, is_internal, weekly_goal, sort) values
  ('Atacadão Ferrosul', false, 2, 1),
  ('Lavanderia Mundial', false, 4, 2),
  ('Blessed Lavanderia', false, 4, 3),
  ('Gula Gula Pizzaria', false, 3, 4),
  ('Espetinho da Vila', false, 3, 5),
  ('Paradise Sup & Surf', false, 4, 6),
  ('Restaurante Na Cozinha', false, 4, 7),
  ('Rixxer', true, 2, 8)
on conflict (name) do nothing;

insert into public.accounts (client_id, network)
select c.id, a.network
from (values
  ('Atacadão Ferrosul','Instagram'),('Atacadão Ferrosul','Google Meu Negócio'),
  ('Lavanderia Mundial','Facebook'),('Lavanderia Mundial','Instagram'),('Lavanderia Mundial','TikTok'),
  ('Lavanderia Mundial','YouTube'),('Lavanderia Mundial','Google Meu Negócio'),('Lavanderia Mundial','Pinterest'),
  ('Blessed Lavanderia','Facebook'),('Blessed Lavanderia','Instagram'),
  ('Gula Gula Pizzaria','Instagram'),
  ('Espetinho da Vila','Instagram'),('Espetinho da Vila','Google Meu Negócio'),
  ('Paradise Sup & Surf','Instagram'),('Paradise Sup & Surf','TikTok'),('Paradise Sup & Surf','YouTube'),('Paradise Sup & Surf','Google Meu Negócio'),
  ('Restaurante Na Cozinha','Instagram'),
  ('Rixxer','Facebook'),('Rixxer','Instagram'),('Rixxer','TikTok'),('Rixxer','YouTube'),('Rixxer','Pinterest'),('Rixxer','Google Meu Negócio')
) as a(client, network)
join public.clients c on c.name = a.client
on conflict (client_id, network) do nothing;

insert into public.client_finance (client_id, monthly_amount, due_day)
select c.id, f.valor, f.dia
from (values
  ('Atacadão Ferrosul',300,17),('Lavanderia Mundial',600,1),('Blessed Lavanderia',600,1),
  ('Gula Gula Pizzaria',250,25),('Espetinho da Vila',250,25),('Paradise Sup & Surf',1000,28),
  ('Restaurante Na Cozinha',500,8)
) as f(client, valor, dia)
join public.clients c on c.name = f.client
on conflict (client_id) do nothing;
