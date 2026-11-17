import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadDataset } from "@/lib/data";
import { diaSemana, fmtDiaMes, weekEnd } from "@/lib/dates";
import { one, ok as okParam, weekParam } from "@/lib/params";
import { resultRows } from "@/lib/aggregate";
import { Flash, VerdictBadge, WeekBar, int, pct } from "@/components/ui";
import { saveResults } from "./actions";

export const dynamic = "force-dynamic";
const COLS = [["views", "Visualiz."], ["reach", "Alcance"], ["likes", "Curtidas"], ["comments", "Coment."], ["shares", "Compart."], ["saves", "Salvam."], ["clicks", "Cliques"]] as const;

export default async function Resultados({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const week = weekParam(sp);
  const sb = await createClient();
  const ds = await loadDataset(sb);
  const clientId = one(sp.cliente) && ds.clients.some((c) => c.id === one(sp.cliente)) ? one(sp.cliente)! : ds.clients[0]?.id;
  const rows = clientId ? resultRows(ds, clientId, week) : [];
  const postedWithoutNets = clientId
    ? ds.posts.filter((p) => p.client_id === clientId && p.status === "Postado" && !ds.postNetworks.some((n) => n.post_id === p.id) && rows.every((r) => r.post.id !== p.id) && p.post_date >= week && p.post_date <= weekEnd(week))
    : [];
  const back = `/resultados?semana=${week}&cliente=${clientId}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Resultado dos posts</h1>
        <p className="text-sm text-slate-600">Uma linha por post por rede (redes marcadas em Postagens). Digite os números do Insights.</p>
      </div>
      <Flash ok={okParam(sp)} />
      <div className="flex flex-wrap items-center gap-3">
        <WeekBar path="/resultados" week={week} extra={{ cliente: clientId }} />
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="semana" value={week} />
          <select name="cliente" defaultValue={clientId} className="input !w-auto">{ds.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button className="btn btn-ghost">Trocar cliente</button>
        </form>
      </div>
      {postedWithoutNets.length > 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm">
          {postedWithoutNets.length} post(s) “Postado” sem rede marcada não aparecem aqui:{" "}
          {postedWithoutNets.map((p) => <Link key={p.id} href={`/postagens/${p.id}`} className="mr-2 font-semibold underline">{fmtDiaMes(p.post_date)} {p.summary ?? ""}</Link>)}
        </div>
      )}
      <form action={saveResults}>
        <input type="hidden" name="back" value={back} />
        <div className="card overflow-x-auto !p-0">
          <table className="w-full min-w-[1150px]">
            <thead><tr>
              {["Data", "Post", "Rede", "Formato", ...COLS.map((c) => c[1]), "Interações", "Engaj.", "Rank sem.", "Veredito", "Alerta"].map((h) => <th key={h} className="th">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={16} className="td text-slate-500">Nenhum post “Postado” com rede marcada nesta semana.</td></tr>}
              {rows.map((r) => {
                const k = `r|${r.post.id}|${r.network}`;
                return (
                  <tr key={k} className={r.alert ? "bg-red-50/50" : ""}>
                    <td className="td whitespace-nowrap">{diaSemana(r.post.post_date)} {fmtDiaMes(r.post.post_date)}</td>
                    <td className="td max-w-52 truncate" title={r.post.summary ?? ""}><Link href={`/postagens/${r.post.id}`} className="underline">{r.post.summary || "(sem resumo)"}</Link></td>
                    <td className="td font-medium">{r.network}</td>
                    <td className="td">{r.post.format ?? "—"}</td>
                    {COLS.map(([f]) => (
                      <td key={f} className="td"><input name={`${k}|${f}`} inputMode="numeric" defaultValue={r.result?.[f] ?? ""} className="input !w-20 !bg-yellow-50 !px-2 text-right" /></td>
                    ))}
                    <td className="td num">{int(r.interactions)}</td>
                    <td className="td num">{pct(r.rate, 1)}</td>
                    <td className="td num">{r.rankInWeek != null ? `${r.rankInWeek}º` : "—"}</td>
                    <td className="td"><VerdictBadge v={r.verdict} /></td>
                    <td className="td text-xs font-semibold text-red-700">{r.alert}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && <div className="sticky bottom-3 mt-4 flex justify-end"><button className="btn btn-accent shadow-lg">Salvar resultados</button></div>}
      </form>
      <p className="text-xs text-slate-500">Interações = curtidas + comentários + compartilhamentos + salvamentos. Engajamento = interações ÷ alcance. Ranking: por conta (cliente + rede) na semana. Veredito vs. média histórica da conta: Repetir ≥120%, Adaptar ≤80%, “Poucos dados” com menos de 3 posts com resultado. Salve para atualizar os cálculos.</p>
    </div>
  );
}
