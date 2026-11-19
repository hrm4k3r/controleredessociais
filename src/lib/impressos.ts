export const PRINT_KINDS = [
  { id: "revista", label: "Revista", icon: "📖" },
  { id: "cartao", label: "Cartão de visita", icon: "💳" },
  { id: "folder", label: "Folder", icon: "📄" },
  { id: "flyer", label: "Flyer / panfleto", icon: "🧾" },
  { id: "banner", label: "Banner / lona", icon: "🚩" },
  { id: "adesivo", label: "Adesivo / etiqueta", icon: "🏷️" },
  { id: "catalogo", label: "Catálogo", icon: "📚" },
  { id: "cardapio", label: "Cardápio", icon: "🍽️" },
  { id: "embalagem", label: "Embalagem", icon: "📦" },
  { id: "outro", label: "Outro", icon: "🖨️" },
] as const;
export type PrintKind = (typeof PRINT_KINDS)[number]["id"];
export const isPrintKind = (v: string): v is PrintKind => PRINT_KINDS.some((k) => k.id === v);
export const kindOf = (id: string) => PRINT_KINDS.find((k) => k.id === id) ?? PRINT_KINDS[PRINT_KINDS.length - 1];

export const PRINT_STATUSES = [
  { id: "briefing", label: "Briefing", cls: "bg-slate-100 text-slate-700" },
  { id: "criacao", label: "Criação / diagramação", cls: "bg-blue-100 text-blue-800" },
  { id: "aprovacao", label: "Aprovação do cliente", cls: "bg-yellow-100 text-yellow-800" },
  { id: "impressao", label: "Na gráfica / impressão", cls: "bg-purple-100 text-purple-800" },
  { id: "acabamento", label: "Acabamento", cls: "bg-orange-100 text-orange-800" },
  { id: "pronto", label: "Pronto p/ entrega", cls: "bg-teal-100 text-teal-800" },
  { id: "entregue", label: "Entregue", cls: "bg-green-100 text-green-800" },
  { id: "cancelado", label: "Cancelado", cls: "bg-red-100 text-red-800" },
] as const;
export type PrintStatus = (typeof PRINT_STATUSES)[number]["id"];
export const isPrintStatus = (v: string): v is PrintStatus => PRINT_STATUSES.some((s) => s.id === v);
export const statusOf = (id: string) => PRINT_STATUSES.find((s) => s.id === id) ?? PRINT_STATUSES[0];
/** Colunas do quadro (o cancelado fica fora). */
export const BOARD_STATUSES = PRINT_STATUSES.filter((s) => s.id !== "cancelado");
/** Próxima etapa do fluxo (null no fim). */
export function nextStatus(id: string): PrintStatus | null {
  const i = BOARD_STATUSES.findIndex((s) => s.id === id);
  return i >= 0 && i < BOARD_STATUSES.length - 1 ? BOARD_STATUSES[i + 1].id : null;
}

export const PROOF_RESULTS = [
  { id: "aguardando", label: "Aguardando", cls: "bg-yellow-100 text-yellow-800" },
  { id: "aprovada", label: "Aprovada", cls: "bg-green-100 text-green-800" },
  { id: "ajustes", label: "Pede ajustes", cls: "bg-red-100 text-red-800" },
] as const;
export const isProofResult = (v: string) => PROOF_RESULTS.some((r) => r.id === v);
export const proofOf = (id: string) => PROOF_RESULTS.find((r) => r.id === id) ?? PROOF_RESULTS[0];

/** Etapas sugeridas ao criar um trabalho (o usuário pode editar depois). */
export const DEFAULT_STEPS: Record<string, string[]> = {
  revista: ["Definir pauta e sumário", "Receber textos e imagens", "Diagramação das páginas", "Revisão de texto", "Capa", "Prova digital para o cliente", "Ajustes pós-prova", "Fechar arquivo (PDF/X, sangria, CMYK)", "Prova impressa na gráfica", "Impressão e acabamento", "Conferir e entregar"],
  cartao: ["Receber dados e logotipo", "Criar arte (frente e verso)", "Prova digital para o cliente", "Fechar arquivo (sangria, CMYK)", "Enviar para a gráfica", "Conferir a entrega e entregar"],
  folder: ["Briefing e conteúdo", "Diagramação", "Prova para o cliente", "Fechar arquivo", "Impressão e dobra", "Entrega"],
  banner: ["Briefing e medidas", "Criação da arte", "Prova para o cliente", "Fechar arquivo", "Impressão e acabamento (ilhós/bastão)", "Entrega ou instalação"],
};
export const defaultSteps = (kind: string): string[] => DEFAULT_STEPS[kind] ?? ["Briefing", "Criação da arte", "Prova para o cliente", "Fechar arquivo", "Impressão", "Entrega"];

export type PrintJob = {
  id: string; client_id: string | null; title: string; kind: string; status: string; quantity: number | null; pages: number | null;
  size: string | null; paper: string | null; colors: string | null; finish: string | null; supplier: string | null;
  cost: number | null; price: number | null; due_date: string | null; delivered_at: string | null; notes: string | null;
  created_by: string | null; completed_by: string | null; created_at: string;
};
export const JOB_COLS = "id,client_id,title,kind,status,quantity,pages,size,paper,colors,finish,supplier,cost,price,due_date,delivered_at,notes,created_by,completed_by,created_at";
export type PrintStep = { id: string; job_id: string; title: string; assignee_id: string | null; due_date: string | null; done: boolean; done_by: string | null; position: number };
export type PrintProof = { id: string; job_id: string; version: number; sent_at: string; result: string; notes: string | null; created_by: string | null };

/** Atrasado: tem prazo vencido e ainda não foi entregue/cancelado. */
export const isLateJob = (due: string | null, status: string, today: string) => !!due && due < today && status !== "entregue" && status !== "cancelado";

export function stepProgress(steps: { done: boolean }[]) {
  const total = steps.length, done = steps.filter((s) => s.done).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}
/** Margem (preço − custo); null se faltar algum valor. */
export function margin(price: number | null, cost: number | null) {
  if (price == null || cost == null) return null;
  const value = Math.round((price - cost) * 100) / 100;
  return { value, pct: price > 0 ? Math.round((value / price) * 100) : null };
}
/** Aceita "1.234,56", "1234.56" ou "12,5"; null se vazio/inválido. */
export function parseMoney(v: string): number | null {
  const t = v.trim().replace(/[R$\s]/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
export const brl = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
