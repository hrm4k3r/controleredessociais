import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadDataset } from "@/lib/data";
import { WeekBar } from "@/components/ui";
import { weekParam } from "@/lib/params";
import { diffDays, fmtData, weekEnd } from "@/lib/dates";
import { compare, totals, type Line, type Nums } from "@/lib/baseline";
import type { WeeklyMetric } from "@/lib/types";

export const dynamic = "force-dynamic";

type Base = Nums & { client_id: string; network: string; baseline_date: string; notes: string | null };
const nf = (v: number | null) => (v == null ? "—" : v.toLocaleString("pt-BR"));
const pf = (v: number | null, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d).replace(".", ",")}%`);
const show = (l: Line, v: number | null) => (l.pct ? pf(v) : nf(v));
const deltaTxt = (l: Line) => {
  if (l.delta == null) return "—";
  if (l.pct) return `${l.delta >= 0 ? "+" : ""}${(l.delta * 100).toFixed(1).replace(".", ",")} p.p.`;
  return `${l.delta >= 0 ? "+" : ""}${l.delta.toLocaleString("pt-BR")}${l.deltaPct != null ? ` (${l.deltaPct >= 0 ? "+" : ""}${(l.deltaPct * 100).toFixed(0)}%)` : ""}`;
};
const tone = (l: Line) => (l.delta == null || l.delta === 0 ? "text-slate-500" : l.delta > 0 ? "text-green-700" : "text-red-700");

function LineTable({ lines }: { lines: Line[] }) {
  return (
    <table className="w-full min-w-[560px]">
      <thead><tr>{["Métrica", "Antes", "Agora", "Variação"].map((h, i) => <th key={h} className={`th ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.key}>
            <td className="td font-medium">{l.label}</td>
            <td className="td num">{show(l, l.before)}</td>
            <td className="td num font-semibold">{show(l, l.after)}</td>
            <td className={`td num font-semibold ${tone(l)}`}>{deltaTxt(l)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Antes × depois: marco inicial de cada conta contra os números mais recentes. */
export default async function Evolucao({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const week = weekParam(sp);
  const sb = await createClient();
  const ds = await loadDataset(sb);
  const { data: bl, error } = await sb.from("account_baselines").select("client_id,network,baseline_date,followers,views,reach,interactions,clicks,notes");
  const bases = (bl ?? []) as Base[];
  const metrics = ds.metrics.filter((m) => m.week_start <= week);
  const latest = (clientId: string, network: string, after: string): WeeklyMetric | null => {
    const rows = metrics.filter((m) => m.client_id === clientId && m.network === network && m.week_start > after).sort((a, b) => b.week_start.localeCompare(a.week_start));
    return rows[0] ?? null;
  };
  /** Seguidores: o dado mais recente que exista (a semana mais nova pode vir sem seguidores). */
  const latestFollowers = (clientId: string, network: string, after: string) =>
    metrics.filter((m) => m.client_id === clientId && m.network === network && m.week_start > after && m.followers != null).sort((a, b) => b.week_start.localeCompare(a.week_start))[0]?.followers ?? null;

  const perClient = ds.clients.map((c) => {
    const accounts = bases.filter((b) => b.client_id === c.id);
    const items = accounts.map((b) => {
      const cur = latest(c.id, b.network, b.baseline_date);
      const after: Nums = cur ? { followers: latestFollowers(c.id, b.network, b.baseline_date), views: cur.views, reach: cur.reach, interactions: cur.interactions, clicks: cur.clicks } : { followers: latestFollowers(c.id, b.network, b.baseline_date), views: null, reach: null, interactions: null, clicks: null };
      const before: Nums = { followers: b.followers, views: b.views, reach: b.reach, interactions: b.interactions, clicks: b.clicks };
      return { b, before, after, week: cur?.week_start ?? null, lines: compare(before, after) };
    });
    return { c, items };
  }).filter((x) => x.items.length > 0);

  const allPairs = perClient.flatMap((x) => x.items.map((i) => ({ before: i.before, after: i.after })));
  const sumLines = totals(allPairs);
  const firstDate = bases.map((b) => b.baseline_date).sort()[0];
  const weeks = firstDate ? Math.max(0, Math.round(diffDays(firstDate, weekEnd(week)) / 7)) : 0;
  const headline = sumLines.find((l) => l.key === "followers");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Evolução: antes × depois</h1>
          <p className="text-sm text-slate-600">Cada conta contra o seu marco inicial. &quot;Agora&quot; usa a semana mais recente com dados até a semana escolhida.</p>
        </div>
        <Link href="/marco-inicial" className="btn btn-ghost">Registrar marco inicial</Link>
      </div>
      <WeekBar path="/evolucao" week={week} />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">Rode a migração <code>20261118000015_marco_inicial.sql</code> no Supabase.</div>}
      {!error && perClient.length === 0 && <div className="card text-sm text-slate-600">Nenhum marco inicial registrado ainda. <Link href="/marco-inicial" className="text-accent underline">Registre os números de partida</Link> de cada rede.</div>}

      {perClient.length > 0 && (
        <section className="space-y-3">
          <div className="card space-y-2 border-accent">
            <div className="label">Resumo da agência</div>
            {headline && headline.delta != null ? (
              <p className="text-lg font-bold text-navy">
                {headline.delta >= 0 ? "+" : ""}{headline.delta.toLocaleString("pt-BR")} seguidores
                {headline.deltaPct != null && <span className="text-green-700"> ({headline.deltaPct >= 0 ? "+" : ""}{(headline.deltaPct * 100).toFixed(0)}%)</span>} em {perClient.length} cliente(s), desde {firstDate ? fmtData(firstDate) : "o marco inicial"}{weeks > 0 ? ` (${weeks} semana${weeks > 1 ? "s" : ""})` : ""}.
              </p>
            ) : <p className="text-sm text-slate-600">Complete os números de seguidores do marco inicial e das semanas para ver o total.</p>}
            <div className="overflow-x-auto"><LineTable lines={sumLines} /></div>
            <p className="text-xs text-slate-500">O total soma só as contas que têm o número nos dois lados, para a comparação ser justa.</p>
          </div>

          {perClient.map(({ c, items }) => (
            <div key={c.id} className="card space-y-3">
              <h2 className="font-bold text-navy">{c.name}</h2>
              <div className="overflow-x-auto"><LineTable lines={totals(items.map((i) => ({ before: i.before, after: i.after })))} /></div>
              {items.length > 1 && (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-navy">Por rede</summary>
                  <div className="mt-3 space-y-4">
                    {items.map((i) => (
                      <div key={i.b.network} className="overflow-x-auto">
                        <div className="mb-1 text-sm font-semibold">{i.b.network} <span className="font-normal text-slate-500">· marco em {fmtData(i.b.baseline_date)}{i.week ? ` · agora: semana de ${fmtData(i.week)}` : " · sem semanas depois do marco"}</span></div>
                        <LineTable lines={i.lines} />
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {items.length === 1 && <p className="text-xs text-slate-500">{items[0].b.network} · marco em {fmtData(items[0].b.baseline_date)}{items[0].week ? ` · agora: semana de ${fmtData(items[0].week)}` : " · ainda sem semanas lançadas depois do marco"}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
