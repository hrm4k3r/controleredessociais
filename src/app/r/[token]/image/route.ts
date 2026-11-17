import { NextResponse } from "next/server";
import { reportByToken } from "@/lib/public-report";
import { renderReportImage } from "@/lib/report-image";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await reportByToken(token);
  if (!report) return new NextResponse("Não encontrado", { status: 404 });
  const res = renderReportImage(report);
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  if (new URL(req.url).searchParams.get("baixar")) headers.set("Content-Disposition", `attachment; filename="relatorio-${report.week}.png"`);
  return new NextResponse(res.body, { headers });
}
