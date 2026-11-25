import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { monthlyByToken } from "@/lib/monthly-data";
import { monthlyPageCount } from "@/lib/monthly-image";
import { closableMonth, fmtMes, isMonthISO, monthStart } from "@/lib/monthly";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatório mensal", robots: { index: false, follow: false } };

// Página pública (somente leitura) do relatório mensal de um cliente, acessada por link com token.
export default async function MensalPublico({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ mes?: string }> }) {
  const { token } = await params;
  const { mes } = await searchParams;
  const month = mes && isMonthISO(monthStart(mes)) ? monthStart(mes) : closableMonth(todayISO());
  const r = await monthlyByToken(token, month);
  if (!r) notFound();
  const name = r.report.client.name;
  const q = `?mes=${month}`;
  return (
    <main className="min-h-screen bg-[#1f2a44] px-3 py-5 text-white">
      <div className="mx-auto max-w-[480px] space-y-4">
        <div className="text-center">
          <p className="text-sm text-slate-300">{name}</p>
          <h1 className="text-lg font-bold capitalize">{fmtMes(month)}</h1>
        </div>
        {Array.from({ length: monthlyPageCount(r.report, r.deliveries) }, (_, i) => i + 1).map((n, _i, all) => (
          <div key={n} className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/m/${token}/image${q}&pagina=${n}`} alt={`Relatório mensal de ${name}, página ${n} de ${all.length}`} width={1080} height={1920} className="h-auto w-full rounded-2xl shadow-2xl" loading={n === 1 ? "eager" : "lazy"} />
            <a href={`/m/${token}/image${q}&pagina=${n}&baixar=1`} download className="block rounded-xl bg-accent py-2.5 text-center text-sm font-semibold">Baixar página {n} de {all.length}</a>
          </div>
        ))}
        {r.months.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {r.months.slice(0, 6).map((m) => <Link key={m} href={`/m/${token}?mes=${m}`} className={`rounded-lg border border-white/20 px-3 py-1 capitalize ${m === month ? "bg-white/15 font-semibold" : ""}`}>{fmtMes(m).replace(" de ", "/")}</Link>)}
          </div>
        )}
      </div>
    </main>
  );
}
