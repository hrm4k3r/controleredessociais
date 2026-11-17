import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidISO, weekStart } from "@/lib/dates";
import { loadReport } from "@/lib/report-data";
import { renderReportImage } from "@/lib/report-image";

// Protegida pelo proxy (login). PNG 1080x1920 do relatório do cliente na semana.
export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string; week: string }> }) {
  const { clientId, week } = await params;
  if (!isValidISO(week) || weekStart(week) !== week) return new NextResponse("Semana inválida", { status: 400 });
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return new NextResponse("Não autorizado", { status: 401 });
  const report = await loadReport(sb, clientId, week);
  if (!report) return new NextResponse("Cliente não encontrado", { status: 404 });
  const res = renderReportImage(report);
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "no-store");
  if (req.nextUrl.searchParams.get("baixar")) headers.set("Content-Disposition", `attachment; filename="relatorio-${week}.png"`);
  return new NextResponse(res.body, { headers });
}
