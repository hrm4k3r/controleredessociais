import { addDays, daysInMonth } from "./dates";
import type { PaymentStatus } from "./constants";

/** Vencimento no mês; se o dia não existe, usa o último dia do mês. refMonth = "YYYY-MM-01". */
export function dueDate(refMonth: string, dueDay: number): string {
  const [y, m] = refMonth.split("-").map(Number);
  const day = Math.min(Math.max(1, Math.floor(dueDay)), daysInMonth(y, m));
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type PaymentInput = {
  due: string; // YYYY-MM-DD
  amountDue: number;
  paidDate?: string | null;
  paidAmount?: number | null;
  today: string;
};

/**
 * Pago: pagou integral até o vencimento. Pago com atraso: integral depois do vencimento.
 * Parcial: pagou menos que o devido. A vencer: sem pagamento e hoje ≤ vencimento. Atrasado: sem pagamento e hoje > vencimento.
 */
export function paymentStatus(p: PaymentInput): PaymentStatus {
  if (!(p.amountDue > 0)) return "Sem cadastro";
  if (p.paidDate) {
    if ((p.paidAmount ?? 0) < p.amountDue) return "Parcial";
    return p.paidDate <= p.due ? "Pago" : "Pago com atraso";
  }
  return p.today > p.due ? "Atrasado" : "A vencer";
}

/** Valor em aberto de uma parcela vencida (Atrasado ou Parcial vencida); 0 caso contrário. */
export function overdueAmount(p: PaymentInput): number {
  const st = paymentStatus(p);
  if (p.today <= p.due) return 0;
  if (st === "Atrasado") return p.amountDue;
  if (st === "Parcial") return Math.max(0, p.amountDue - (p.paidAmount ?? 0));
  return 0;
}

export type ClientFinanceSummary = {
  overdueCount: number;
  overdueAmount: number;
  lastPayment: string | null;
  situation: "Adimplente" | "INADIMPLENTE";
};

export function summarizeClient(rows: PaymentInput[]): ClientFinanceSummary {
  let overdueCount = 0;
  let overdue = 0;
  let last: string | null = null;
  for (const r of rows) {
    const o = overdueAmount(r);
    if (o > 0) {
      overdueCount++;
      overdue += o;
    }
    if (r.paidDate && (!last || r.paidDate > last)) last = r.paidDate;
  }
  return { overdueCount, overdueAmount: overdue, lastPayment: last, situation: overdueCount > 0 ? "INADIMPLENTE" : "Adimplente" };
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export { addDays };
