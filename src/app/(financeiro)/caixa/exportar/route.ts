import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { toCsv } from "@/lib/export";
import { firstOfMonth, isValidISO, monthEnd, todayISO } from "@/lib/dates";
import { ENTRY_COLS, STATUS_LABEL, statusOf, type Entry } from "@/lib/caixa";

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const access = await getAccess(sb);
  if (!access) return new NextResponse("Não autorizado", { status: 401 });
  if (!access.modules.includes("financeiro")) return new NextResponse("Sem acesso a esta gestão", { status: 403 });
  const m = req.nextUrl.searchParams.get("mes") ?? "";
  const today = todayISO();
  const month = isValidISO(m) ? firstOfMonth(m) : firstOfMonth(today);
  const [en, ac, ca, cl] = await Promise.all([
    sb.from("fin_entries").select(ENTRY_COLS).gte("due_date", month).lte("due_date", monthEnd(month)).order("due_date"),
    sb.from("fin_accounts").select("id,name"), sb.from("fin_categories").select("id,name"), sb.from("clients").select("id,name"),
  ]);
  const name = (rows: { id: string; name: string }[] | null) => new Map((rows ?? []).map((r) => [r.id, r.name]));
  const [an, cn, kn] = [name(ac.data), name(ca.data), name(cl.data)];
  const entries = (en.data ?? []) as Entry[];
  const csv = toCsv({
    name: "Lançamentos",
    headers: ["Vencimento", "Tipo", "Descrição", "Categoria", "Conta", "Cliente", "Valor (R$)", "Situação", "Data do pagamento", "Observações"],
    rows: entries.map((e) => [e.due_date, e.kind === "entrada" ? "Entrada" : "Saída", e.description, e.category_id ? cn.get(e.category_id) ?? "" : "", e.account_id ? an.get(e.account_id) ?? "" : "",
      e.client_id ? kn.get(e.client_id) ?? "" : "", Number(e.amount), STATUS_LABEL[e.kind][statusOf(e, today)], e.paid_date, e.notes]),
  });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="caixa-${month.slice(0, 7)}.csv"`, "Cache-Control": "no-store" } });
}
