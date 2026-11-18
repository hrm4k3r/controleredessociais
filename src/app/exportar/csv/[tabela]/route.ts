import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { buildTables, toCsv } from "@/lib/export";
import { todayISO } from "@/lib/dates";

export async function GET(_: Request, { params }: { params: Promise<{ tabela: string }> }) {
  const { tabela } = await params;
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return new NextResponse("Não autorizado", { status: 401 });
  const acc = await getAccess(sb);
  if (!acc?.modules.includes("social")) return new NextResponse("Sem acesso a esta gestão", { status: 403 });
  const t = (await buildTables(sb, acc.modules.includes("financeiro")))[tabela];
  if (!t) return new NextResponse("Tabela inexistente", { status: 404 });
  return new NextResponse(toCsv(t), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${tabela}-${todayISO()}.csv"`, "Cache-Control": "no-store" },
  });
}
