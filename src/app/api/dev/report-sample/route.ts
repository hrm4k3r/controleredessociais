import { NextResponse, type NextRequest } from "next/server";
import { buildReport } from "@/lib/aggregate";
import { renderReportImage } from "@/lib/report-image";
import { SAMPLE_COMMENT, SAMPLE_STEPS, sampleDataset } from "@/lib/fixtures/sample";

// Somente desenvolvimento: pré-visualização do layout com dados fictícios.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const n = Number(req.nextUrl.searchParams.get("redes") ?? 6);
  const long = req.nextUrl.searchParams.get("longo") === "1";
  const ds = sampleDataset(n);
  const data = buildReport(ds, "c1", "2026-11-16", {
    comment: long ? SAMPLE_COMMENT.repeat(5) : SAMPLE_COMMENT,
    next_steps: long ? SAMPLE_STEPS.repeat(5) : SAMPLE_STEPS,
  });
  return renderReportImage(data);
}
