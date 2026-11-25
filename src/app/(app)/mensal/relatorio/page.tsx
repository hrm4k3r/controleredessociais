import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "@/components/SubmitButton";
import { appUrl } from "@/lib/report-data";
import { todayISO, fmtColeta } from "@/lib/dates";
import { one } from "@/lib/params";
import { addMonths, closableMonth, fmtMes, isMonthISO, monthStart } from "@/lib/monthly";
import { loadMonthly, reportOf } from "@/lib/monthly-data";
import { loadDataset } from "@/lib/data";
import { deliveriesOf } from "@/lib/monthly";
import { monthlyPageCount } from "@/lib/monthly-image";
import { createMonthlyLink, regenerateMonthlyLink } from "./actions";

export const dynamic = "force-dynamic";
const nf = (v: number | null) => (v == null ? "—" : v.toLocaleString("pt-BR"));

export default async function RelatorioMensal({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = one(sp.mes);
  const month = raw && isMonthISO(monthStart(raw)) ? monthStart(raw) : closableMonth(todayISO());
  const sb = await createClient();
  const d = await loadMonthly(sb);
  if (!d) return <div className="space-y-5"><h1 className="page-title">Relatório mensal</h1><div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">Rode no Supabase a migração <code>20261119000019_fechamento_mensal.sql</code>.</div></div>;
  const { data: links } = await sb.from("monthly_links").select("client_id,public_token");
  const tokenOf = new Map((links ?? []).map((l) => [l.client_id as string, l.public_token as string]));
  const ds = await loadDataset(sb).catch(() => null);
  const reports = d.clients.map((c) => reportOf(d, c.id, month)).filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Relatório mensal</h1>
          <p className="text-sm text-slate-600">Cada mês contra o anterior. O link do cliente é fixo e abre o último mês fechado (ele também navega pelos meses anteriores).</p>
        </div>
        <Link href={`/mensal?mes=${month}`} className="btn btn-ghost">Lançar números do mês</Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/mensal/relatorio?mes=${addMonths(month, -1)}`} className="btn btn-ghost" aria-label="Mês anterior">←</Link>
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold capitalize text-navy">{fmtMes(month)}</div>
        <Link href={`/mensal/relatorio?mes=${addMonths(month, 1)}`} className="btn btn-ghost" aria-label="Próximo mês">→</Link>
      </div>

      {reports.map((r) => {
        const token = tokenOf.get(r.client.id);
        const filled = r.items.some((i) => i.has);
        const cl = ds?.clients.find((x) => x.id === r.client.id);
        const del = ds && cl ? deliveriesOf(ds.posts, ds.postNetworks, cl.id, month, cl.weekly_goal) : null;
        const pages = monthlyPageCount(r, del);
        return (
          <div key={r.client.id} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-navy">{r.client.name}</h2>
              {!filled && <span className="badge bg-yellow-100 text-yellow-800">Mês ainda sem números</span>}
              {r.note?.collected_at && <span className="text-xs text-slate-500">Coletado em {fmtColeta(r.note.collected_at)}</span>}
            </div>
            {filled && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead><tr>{["Indicador", fmtMes(r.prev).replace(" de ", "/"), fmtMes(r.month).replace(" de ", "/"), "Variação"].map((h) => <th key={h} className="th capitalize">{h}</th>)}</tr></thead>
                  <tbody>
                    {r.lines.filter((l) => l.after != null || l.before != null).map((l) => (
                      <tr key={l.key}>
                        <td className="td">{l.label}</td>
                        <td className="td num">{l.pct ? (l.before == null ? "—" : `${(l.before * 100).toFixed(1).replace(".", ",")}%`) : nf(l.before)}</td>
                        <td className="td num font-semibold">{l.pct ? (l.after == null ? "—" : `${(l.after * 100).toFixed(1).replace(".", ",")}%`) : nf(l.after)}</td>
                        <td className={`td num ${l.delta == null || l.delta === 0 ? "" : l.delta > 0 ? "text-green-700" : "text-red-700"}`}>{l.delta == null ? "—" : l.pct ? `${l.delta >= 0 ? "+" : ""}${(l.delta * 100).toFixed(1).replace(".", ",")} p.p.` : `${l.delta >= 0 ? "+" : ""}${l.delta.toLocaleString("pt-BR")}${l.deltaPct != null ? ` (${l.deltaPct >= 0 ? "+" : ""}${Math.round(l.deltaPct * 100)}%)` : ""}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              {token ? (
                <>
                  <input readOnly value={`${appUrl()}/m/${token}`} aria-label="Link público" className="input !w-72 text-xs" />
                  <a className="btn btn-ghost" href={`/m/${token}?mes=${month}`} target="_blank" rel="noopener noreferrer">Abrir {fmtMes(month).split(" ")[0]}</a>
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => <a key={n} className="btn btn-ghost" href={`/m/${token}/image?mes=${month}&pagina=${n}&baixar=1`}>Baixar PNG {n}/{pages}</a>)}
                  <form action={regenerateMonthlyLink}><input type="hidden" name="client_id" value={r.client.id} /><input type="hidden" name="mes" value={month} /><SubmitButton className="btn btn-ghost" pendingText="…" confirm="Gerar um novo link? O link atual deixa de funcionar.">Gerar novo link</SubmitButton></form>
                </>
              ) : (
                <form action={createMonthlyLink}><input type="hidden" name="client_id" value={r.client.id} /><input type="hidden" name="mes" value={month} /><SubmitButton className="btn" pendingText="Gerando…">Gerar link e PNG para o cliente</SubmitButton></form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
