import type { SupabaseClient } from "@supabase/supabase-js";
import { FINANCE_START_MONTH } from "./constants";
import { addMonths, firstOfMonth } from "./dates";
import { dueDate, paymentStatus, summarizeClient, type ClientFinanceSummary, type PaymentInput } from "./finance";
import type { PaymentStatus } from "./constants";

export type FinClient = { id: string; name: string; monthly_amount: number; due_day: number };
export type PaymentRow = { client_id: string; ref_month: string; amount_due: number | null; paid_date: string | null; paid_amount: number | null; notes: string | null };

export async function loadFinance(sb: SupabaseClient) {
  const [{ data: clients }, { data: fin }, { data: pays }] = await Promise.all([
    sb.from("clients").select("id,name,sort").eq("is_internal", false).eq("active", true).order("sort"),
    sb.from("client_finance").select("client_id,monthly_amount,due_day"),
    sb.from("payments").select("client_id,ref_month,amount_due,paid_date,paid_amount,notes").limit(5000),
  ]);
  const finBy = new Map((fin ?? []).map((f) => [f.client_id as string, f]));
  const list: FinClient[] = (clients ?? []).map((c) => ({
    id: c.id as string, name: c.name as string,
    monthly_amount: Number(finBy.get(c.id as string)?.monthly_amount ?? 0), due_day: Number(finBy.get(c.id as string)?.due_day ?? 1),
  }));
  const payments: PaymentRow[] = (pays ?? []).map((p) => ({ ...p, amount_due: p.amount_due == null ? null : Number(p.amount_due), paid_amount: p.paid_amount == null ? null : Number(p.paid_amount) })) as PaymentRow[];
  return { clients: list, payments };
}

export function inputFor(c: FinClient, refMonth: string, pay: PaymentRow | undefined, today: string): PaymentInput {
  return { due: dueDate(refMonth, c.due_day), amountDue: pay?.amount_due ?? c.monthly_amount, paidDate: pay?.paid_date, paidAmount: pay?.paid_amount, today };
}

/** Meses considerados no resumo: do início do controle até o mês atual. */
export function monthsUntil(today: string): string[] {
  const out: string[] = [];
  for (let m = FINANCE_START_MONTH; m <= firstOfMonth(today); m = addMonths(m, 1)) out.push(m);
  return out;
}

export function summaryFor(c: FinClient, payments: PaymentRow[], today: string): ClientFinanceSummary {
  const rows = monthsUntil(today).map((m) => inputFor(c, m, payments.find((p) => p.client_id === c.id && p.ref_month === m), today));
  return summarizeClient(rows);
}

export type { PaymentStatus };
export { paymentStatus };
