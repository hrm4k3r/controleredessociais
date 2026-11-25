import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { loadMemberNames } from "@/lib/members";
import { todayISO } from "@/lib/dates";
import { JOB_COLS, PAGE_COLS, type PrintJob, type PrintPage } from "@/lib/impressos";
import { buildSummaryPdf } from "@/lib/print-summary-pdf";

/** Resumo da produção (PDF) de um trabalho com páginas, para enviar ao cliente. `?valores=1` inclui os valores dos contratos. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  await requireModule(sb, "impressos");
  const { data: job } = await sb.from("print_jobs").select(JOB_COLS).eq("id", id).maybeSingle();
  if (!job) return new NextResponse("Trabalho não encontrado", { status: 404 });
  const j = job as PrintJob;
  const [pg, cl, names] = await Promise.all([
    sb.from("print_pages").select(PAGE_COLS).eq("job_id", id).order("position"),
    j.client_id ? sb.from("clients").select("name").eq("id", j.client_id).maybeSingle() : Promise.resolve({ data: null }),
    loadMemberNames(sb),
  ]);
  if (pg.error) return new NextResponse("Rode a migração das páginas dos impressos.", { status: 500 });
  const today = todayISO();
  const bytes = await buildSummaryPdf({
    job: j, clientName: (cl.data as { name: string } | null)?.name ?? null, pages: (pg.data ?? []) as PrintPage[], names,
    generatedAt: today, withValues: new URL(req.url).searchParams.get("valores") === "1",
  });
  const slug = j.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "trabalho";
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="resumo-${slug}-${today}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
