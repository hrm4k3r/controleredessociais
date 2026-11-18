import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { toCsv } from "@/lib/export";
import { firstOfMonth, isValidISO, monthEnd, todayISO } from "@/lib/dates";
import { loadFinance } from "@/lib/finance-data";
import { loadAccounts } from "@/lib/caixa-server";
import { CONTRACT_CATEGORY, CONTRACT_CATEGORY_LABEL, ENTRY_COLS, STATUS_LABEL, contractAccountId, contractEntries, statusOf, type Entry } from "@/lib/caixa";

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const access = await getAccess(sb);
  if (!access) return new NextResponse("Não autorizado", { status: 401 });
  if (!access.modules.includes("financeiro")) return new NextResponse("Sem acesso a esta gestão", { status: 403 });
  const m = req.nextUrl.searchParams.get("mes") ?? "";
  const today = todayISO();
  const month = isValidISO(m) ? firstOfMonth(m) : firstOfMonth(today);
  const [en, accounts, ca, cl, fin] = await Promise.all([
    sb.from("fin_entries").select(ENTRY_COLS).gte("due_date", month).lte("due_date", monthEnd(month)).order("due_date"),
    loadAccounts(sb), sb.from("fin_categories").select("id,name"), sb.from("clients").select("id,name"), loadFinance(sb),
  ]);
  const name = (rows: { id: string; name: string }[] | null) => new Map((rows ?? []).map((r) => [r.id, r.name]));
  const [an, cn, kn] = [name(accounts), name(ca.data), name(cl.data)];
  cn.set(CONTRACT_CATEGORY, CONTRACT_CATEGORY_LABEL);
  const contracts = contractEntries(fin.clients, fin.payments, today, contractAccountId(accounts)).filter((e) => e.due_date >= month && e.due_date <= monthEnd(month));
  const entries = [...((en.data ?? []) as Entry[]), ...contracts].sort((a, b) => a.due_date.localeCompare(b.due_date));
  const csv = toCsv({
    name: "Lançamentos",
    headers: ["Vencimento", "Tipo", "Descrição", "Categoria", "Conta", "Cliente", "Valor (R$)", "Situação", "Data do pagamento", "Observações"],
    rows: entries.map((e) => [e.due_date, e.kind === "entrada" ? "Entrada" : "Saída", e.description, e.category_id ? cn.get(e.category_id) ?? "" : "", e.account_id ? an.get(e.account_id) ?? "" : "",
      e.client_id ? kn.get(e.client_id) ?? "" : "", Number(e.amount), STATUS_LABEL[e.kind][statusOf(e, today)], e.paid_date, e.notes]),
  });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="caixa-${month.slice(0, 7)}.csv"`, "Cache-Control": "no-store" } });
}
