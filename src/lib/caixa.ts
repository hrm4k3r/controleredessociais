import { addMonths, firstOfMonth, monthEnd } from "./dates";

export type EntryKind = "entrada" | "saida";
export type Entry = {
  id: string; kind: EntryKind; description: string; amount: number; due_date: string; paid_date: string | null;
  account_id: string | null; category_id: string | null; client_id: string | null; notes: string | null;
  group_id: string | null; installment: number | null; installments: number | null; created_by: string | null;
};
export type Account = { id: string; name: string; kind: string; opening_balance: number; active: boolean; sort: number };
export type Category = { id: string; kind: EntryKind; name: string; active: boolean };

export const ENTRY_COLS = "id,kind,description,amount,due_date,paid_date,account_id,category_id,client_id,notes,group_id,installment,installments,created_by";
export const ACCOUNT_KINDS = [{ id: "banco", label: "Conta bancária" }, { id: "caixa", label: "Caixa (dinheiro)" }, { id: "cartao", label: "Cartão" }, { id: "outro", label: "Outro" }];

export const DEFAULT_ACCOUNTS = [{ name: "Conta principal", kind: "banco" }, { name: "Caixa", kind: "caixa" }];
export const DEFAULT_CATEGORIES: { kind: EntryKind; name: string }[] = [
  { kind: "entrada", name: "Mensalidade de redes sociais" }, { kind: "entrada", name: "Projeto de software" },
  { kind: "entrada", name: "Manutenção/suporte" }, { kind: "entrada", name: "Outras receitas" },
  { kind: "saida", name: "Pró-labore / salários" }, { kind: "saida", name: "Ferramentas e assinaturas" },
  { kind: "saida", name: "Impostos e taxas" }, { kind: "saida", name: "Marketing e anúncios" },
  { kind: "saida", name: "Aluguel, contas e internet" }, { kind: "saida", name: "Terceiros / freelancers" },
  { kind: "saida", name: "Outras despesas" },
];

export type EntryStatus = "pago" | "pendente" | "atrasado";
export const statusOf = (e: { paid_date: string | null; due_date: string }, today: string): EntryStatus =>
  e.paid_date ? "pago" : e.due_date < today ? "atrasado" : "pendente";
export const STATUS_LABEL: Record<EntryKind, Record<EntryStatus, string>> = {
  entrada: { pago: "Recebido", pendente: "A receber", atrasado: "Atrasado" },
  saida: { pago: "Pago", pendente: "A pagar", atrasado: "Vencido" },
};
export const STATUS_CLS: Record<EntryStatus, string> = { pago: "bg-green-100 text-green-800", pendente: "bg-blue-100 text-blue-800", atrasado: "bg-red-100 text-red-800" };

const signed = (e: { kind: EntryKind; amount: number }) => (e.kind === "entrada" ? e.amount : -e.amount);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Saldo de cada conta hoje: saldo inicial + entradas pagas − saídas pagas (até `today`). */
export function balances(accounts: Account[], entries: Entry[], today: string): Map<string, number> {
  const out = new Map(accounts.map((a) => [a.id, a.opening_balance]));
  for (const e of entries) {
    if (!e.paid_date || e.paid_date > today || !e.account_id || !out.has(e.account_id)) continue;
    out.set(e.account_id, round2((out.get(e.account_id) ?? 0) + signed(e)));
  }
  return out;
}

/** Realizado (pago/recebido) no mês de `month` (primeiro dia). */
export function realized(entries: Entry[], month: string) {
  const end = monthEnd(month);
  let entradas = 0, saidas = 0;
  for (const e of entries) {
    if (!e.paid_date || e.paid_date < month || e.paid_date > end) continue;
    if (e.kind === "entrada") entradas += e.amount; else saidas += e.amount;
  }
  return { entradas: round2(entradas), saidas: round2(saidas), resultado: round2(entradas - saidas) };
}

/** Previsto para o mês (por vencimento), pago ou não. */
export function forecast(entries: Entry[], month: string) {
  const end = monthEnd(month);
  let entradas = 0, saidas = 0;
  for (const e of entries) {
    if (e.due_date < month || e.due_date > end) continue;
    if (e.kind === "entrada") entradas += e.amount; else saidas += e.amount;
  }
  return { entradas: round2(entradas), saidas: round2(saidas), resultado: round2(entradas - saidas) };
}

/** Pendentes (não pagos): total e quanto já venceu. */
export function pending(entries: Entry[], kind: EntryKind, today: string) {
  let total = 0, overdue = 0;
  for (const e of entries) {
    if (e.kind !== kind || e.paid_date) continue;
    total += e.amount;
    if (e.due_date < today) overdue += e.amount;
  }
  return { total: round2(total), overdue: round2(overdue) };
}

/** Série dos últimos `n` meses (do mais antigo ao mês de `month`). */
export function monthlySeries(entries: Entry[], month: string, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const m = addMonths(firstOfMonth(month), i - (n - 1));
    return { month: m, ...realized(entries, m) };
  });
}

/** Total realizado no mês por categoria. */
export function byCategory(entries: Entry[], kind: EntryKind, month: string) {
  const end = monthEnd(month);
  const m = new Map<string | null, number>();
  for (const e of entries) {
    if (e.kind !== kind || !e.paid_date || e.paid_date < month || e.paid_date > end) continue;
    m.set(e.category_id, (m.get(e.category_id) ?? 0) + e.amount);
  }
  return [...m.entries()].map(([id, total]) => ({ id, total: round2(total) })).sort((a, b) => b.total - a.total);
}

/** Divide `total` em `n` parcelas (a última absorve os centavos). */
export function splitAmount(total: number, n: number): number[] {
  const base = Math.floor((total * 100) / n) / 100;
  const parts = Array.from({ length: n }, () => base);
  parts[n - 1] = round2(total - base * (n - 1));
  return parts;
}
