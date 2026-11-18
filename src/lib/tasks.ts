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
  status: TaskStatus; due_date: string | null; week_start: string; position: number;
};

/** Posição para inserir `index` numa lista ordenada de posições (sem o cartão movido). */
export function positionAt(positions: number[], index: number): number {
  const prev = positions[index - 1];
  const next = positions[index];
  if (prev == null && next == null) return 1000;
  if (prev == null) return next - 1000;
  if (next == null) return prev + 1000;
  return (prev + next) / 2;
}
