import { NextResponse } from "next/server";
import { monthlyByToken } from "@/lib/monthly-data";
import { renderMonthlyImage } from "@/lib/monthly-image";
import { closableMonth, isMonthISO, monthStart } from "@/lib/monthly";
import { todayISO } from "@/lib/dates";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(req.url);
  const mes = url.searchParams.get("mes");
  const month = mes && isMonthISO(monthStart(mes)) ? monthStart(mes) : closableMonth(todayISO());
  const r = await monthlyByToken(token, month);
  if (!r) return new NextResponse("Não encontrado", { status: 404 });
  const page = Number(url.searchParams.get("pagina") ?? 1) || 1;
  const res = renderMonthlyImage(r.report, r.collectedAt, r.deliveries, page);
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  if (url.searchParams.get("baixar")) headers.set("Content-Disposition", `attachment; filename="mensal-${month.slice(0, 7)}-p${page}-${r.report.client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png"`);
  return new NextResponse(res.body, { headers });
}
