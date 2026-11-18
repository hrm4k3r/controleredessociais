export const DEV_COLUMNS = [
  { id: "backlog", label: "Backlog" },
  { id: "a_fazer", label: "A fazer" },
  { id: "em_andamento", label: "Em desenvolvimento" },
  { id: "revisao", label: "Em revisão" },
  { id: "teste", label: "Em teste" },
  { id: "concluido", label: "Concluído" },
] as const;
export type ItemStatus = (typeof DEV_COLUMNS)[number]["id"];
export const isItemStatus = (v: string): v is ItemStatus => DEV_COLUMNS.some((c) => c.id === v);

export const ITEM_TYPES = [
  { id: "tarefa", label: "Tarefa", icon: "✔️" },
  { id: "bug", label: "Bug", icon: "🐞" },
  { id: "melhoria", label: "Melhoria", icon: "✨" },
  { id: "historia", label: "História", icon: "📖" },
] as const;
export type ItemType = (typeof ITEM_TYPES)[number]["id"];
export const isItemType = (v: string): v is ItemType => ITEM_TYPES.some((t) => t.id === v);
export const typeOf = (id: string) => ITEM_TYPES.find((t) => t.id === id) ?? ITEM_TYPES[0];

export const PRIORITIES = [
  { id: "baixa", label: "Baixa", cls: "bg-slate-100 text-slate-700" },
  { id: "media", label: "Média", cls: "bg-blue-100 text-blue-800" },
  { id: "alta", label: "Alta", cls: "bg-orange-100 text-orange-800" },
  { id: "urgente", label: "Urgente", cls: "bg-red-100 text-red-800" },
] as const;
export type Priority = (typeof PRIORITIES)[number]["id"];
export const isPriority = (v: string): v is Priority => PRIORITIES.some((p) => p.id === v);
export const priorityOf = (id: string) => PRIORITIES.find((p) => p.id === id) ?? PRIORITIES[1];
const PRIORITY_RANK: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
export const priorityRank = (id: string) => PRIORITY_RANK[id] ?? 2;

export const PROJECT_KINDS = [
  { id: "sistema", label: "Sistema" }, { id: "site", label: "Site" }, { id: "aplicativo", label: "Aplicativo" },
  { id: "api", label: "API" }, { id: "integracao", label: "Integração" }, { id: "outro", label: "Outro" },
] as const;
export const PROJECT_STATUSES = [
  { id: "planejamento", label: "Planejamento", cls: "bg-slate-100 text-slate-700" },
  { id: "em_andamento", label: "Em andamento", cls: "bg-blue-100 text-blue-800" },
  { id: "pausado", label: "Pausado", cls: "bg-yellow-100 text-yellow-800" },
  { id: "concluido", label: "Concluído", cls: "bg-green-100 text-green-800" },
  { id: "cancelado", label: "Cancelado", cls: "bg-red-100 text-red-800" },
] as const;
export const kindLabel = (id: string) => PROJECT_KINDS.find((k) => k.id === id)?.label ?? id;
export const projectStatus = (id: string) => PROJECT_STATUSES.find((s) => s.id === id) ?? PROJECT_STATUSES[0];

export type DevItem = {
  id: string; project_id: string; milestone_id: string | null; title: string; description: string | null;
  type: ItemType; status: ItemStatus; priority: Priority; assignee_id: string | null; estimate_hours: number | null;
  due_date: string | null; position: number; created_by: string | null; completed_by: string | null; created_at: string;
};
export type DevProject = {
  id: string; client_id: string | null; name: string; kind: string; status: string; description: string | null;
  repo_url: string | null; stack: string | null; start_date: string | null; due_date: string | null; created_by: string | null;
};
export type DevMilestone = { id: string; project_id: string; name: string; due_date: string | null; delivered_at: string | null; notes: string | null };

export const ITEM_COLS = "id,project_id,milestone_id,title,description,type,status,priority,assignee_id,estimate_hours,due_date,position,created_by,completed_by,created_at";

/** Progresso de um projeto: itens concluídos ÷ total (bugs e tarefas contam igual). */
export function progress(items: { status: string }[]) {
  const total = items.length;
  const done = items.filter((i) => i.status === "concluido").length;
  return { done, total, open: total - done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
export const isLate = (due: string | null, status: string, today: string) => !!due && status !== "concluido" && due < today;

/** Aceita "2", "1,5", "1.5" ou "1:30" (h:mm) e devolve horas decimais; null se inválido. */
export function parseHours(v: string): number | null {
  const s = v.trim().replace(",", ".");
  if (s === "") return null;
  const m = /^(\d+):([0-5]?\d)$/.exec(s);
  const n = m ? Number(m[1]) + Number(m[2]) / 60 : Number(s);
  return Number.isFinite(n) && n > 0 && n <= 24 ? Math.round(n * 100) / 100 : null;
}
export const fmtHours = (h: number) => `${(Math.round(h * 100) / 100).toString().replace(".", ",")} h`;
