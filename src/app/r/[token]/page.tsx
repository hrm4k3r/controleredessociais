import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { reportByToken } from "@/lib/public-report";
import { fmtColeta, fmtPeriodo } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatório semanal", robots: { index: false, follow: false } };

// Página pública (somente leitura) acessada por link com token. Não expõe financeiro nem outros clientes.
export default async function RelatorioPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await reportByToken(token);
  if (!report) notFound();
  return (
    <main className="min-h-screen bg-[#1f2a44] px-3 py-5 text-white">
      <div className="mx-auto max-w-[480px] space-y-4">
        <div className="text-center">
          <p className="text-sm text-slate-300">{report.client.name}</p>
          <h1 className="text-lg font-bold">Relatório da semana {fmtPeriodo(report.week)}</h1>
          {report.collectedAt && <p className="mt-1 text-xs text-slate-300">Dados coletados em {fmtColeta(report.collectedAt)}</p>}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/r/${token}/image`} alt={`Relatório semanal de ${report.client.name}`} width={1080} height={1920} className="h-auto w-full rounded-2xl shadow-2xl" />
        <a href={`/r/${token}/image?baixar=1`} download className="block rounded-xl bg-accent py-3 text-center font-semibold">Baixar imagem</a>
      </div>
    </main>
  );
}
