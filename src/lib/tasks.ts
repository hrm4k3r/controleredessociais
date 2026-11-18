export const TASK_COLUMNS = [
  { id: "a_fazer", label: "A fazer" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "revisao", label: "Em revisão" },
  { id: "concluido", label: "Concluído" },
] as const;
export type TaskStatus = (typeof TASK_COLUMNS)[number]["id"];
export const isTaskStatus = (v: string): v is TaskStatus => TASK_COLUMNS.some((c) => c.id === v);

export type Task = {
  id: string; client_id: string | null; title: string; notes: string | null;
  status: TaskStatus; due_date: string | null; week_start: string; position: number; post_id: string | null;
  created_by: string | null; completed_by: string | null; created_at: string;
  format: string | null; theme: string | null; networks: string[];
  /** Hora em que foi para "Em andamento" / para "Em revisão" (preenchidas ao mover o cartão). */
  started_at: string | null; finished_at: string | null;
  /** Pomodoros concluídos e minutos de foco acumulados neste cartão. */
  pomodoros?: number; focus_minutes?: number;
};

/** Resultado da geração automática do post "Planejado" ao concluir um cartão. */
export type PostSync = { started_at: string | null; finished_at: string | null; completed_by: string | null; post_id: string | null; state: "created" | "exists" | "no_client" | "na" };

/** Posição para inserir `index` numa lista ordenada de posições (sem o cartão movido). */
export function positionAt(positions: number[], index: number): number {
  const prev = positions[index - 1];
  const next = positions[index];
  if (prev == null && next == null) return 1000;
  if (prev == null) return next - 1000;
  if (next == null) return prev + 1000;
  return (prev + next) / 2;
}

/** "1h15", "45min", "2h" entre dois instantes ISO; "" se faltar algum ou o fim for anterior ao início. */
export function durationLabel(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const min = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (!Number.isFinite(min) || min < 0) return "";
  const h = Math.floor(min / 60), m = min % 60;
  return h === 0 ? `${m}min` : m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
