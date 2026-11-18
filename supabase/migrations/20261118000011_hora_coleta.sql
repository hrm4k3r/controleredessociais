-- Hora em que os dados do relatório semanal foram coletados (por cliente e semana).
alter table public.weekly_notes add column if not exists collected_at timestamptz;
