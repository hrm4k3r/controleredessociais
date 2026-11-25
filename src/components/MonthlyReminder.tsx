import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { closableMonth, fmtMes } from "@/lib/monthly";

/** Lembrete: a partir do dia 5, avisa quando o mês anterior ainda não foi lançado no fechamento mensal. */
export default async function MonthlyReminder() {
  const today = todayISO();
  if (Number(today.slice(8, 10)) < 5) return null;
  const month = closableMonth(today);
  const sb = await createClient();
  const { count, error } = await sb.from("monthly_metrics").select("client_id", { count: "exact", head: true }).eq("month", month);
  if (error || (count ?? 0) > 0) return null;
  return (
    <div className="mx-auto mb-4 max-w-7xl rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-900">
      Hora do fechamento mensal: os números de <b>{fmtMes(month)}</b> já estão consolidados. <Link href={`/mensal?mes=${month}`} className="underline">Lançar agora</Link>
    </div>
  );
}
