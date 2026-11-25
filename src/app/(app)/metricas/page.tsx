import SubmitButton from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { loadDataset } from "@/lib/data";
import { addDays, fmtData, spParts, weekEnd } from "@/lib/dates";
import { ok as okParam, weekParam } from "@/lib/params";
import { networkRows, previousMetric } from "@/lib/aggregate";
import { goalPct } from "@/lib/calc";
import { Flash, WeekBar, delta, deltaColor, deltaInt, pct } from "@/components/ui";
import CollectedAt from "@/components/CollectedAt";
import { saveMetrics } from "./actions";

export const dynamic = "force-dynamic";

export default async function Metricas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const week = weekParam(sp);
  const sb = await createClient();
  const ds = await loadDataset(sb);
  // Hora da coleta por cliente (consulta tolerante: antes da migração a coluna não existe).
  const { data: notes } = await sb.from("weekly_notes").select("client_id,collected_at").eq("week_start", week);
  const collected = new Map((notes ?? []).filter((n) => n.collected_at).map((n) => [n.client_id as string, spParts(n.collected_at as string)]));
  const nowParts = spParts(new Date().toISOString());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Métricas semanais</h1>
        <p className="text-sm text-slate-600">Preencha no domingo (Insights dos últimos 7 dias). Semana de {fmtData(week)} a {fmtData(weekEnd(week))}.</p>
      </div>
      <Flash ok={okParam(sp)} />
      {sp.aviso === "coleta" && <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-800">Métricas salvas, mas a hora da coleta não pôde ser gravada. Rode a migração <code>20261118000011_hora_coleta.sql</code> no Supabase.</div>}
      <WeekBar path="/metricas" week={week} />
      <form action={saveMetrics} className="space-y-5">
        <input type="hidden" name="week" value={week} />
        {ds.clients.map((c) => {
          const rows = networkRows(ds, c.id, week).filter((r) => !r.monthly); // redes de dado mensal ficam no fechamento mensal
          return (
            <section key={c.id} className="card !p-0 overflow-x-auto">
              <div className="flex items-center justify-between border-b border-line px-4 py-2">
                <h2 className={`font-bold ${c.is_internal ? "text-accent" : "text-navy"}`}>{c.name}</h2>
                <span className="text-xs text-slate-500">Meta: {c.weekly_goal} posts/sem.</span>
              </div>
              <div className="border-b border-line bg-slate-50 px-4 py-2">
                <CollectedAt prefix={`coll|${c.id}`} defaultDate={(collected.get(c.id) ?? nowParts).date} defaultTime={(collected.get(c.id) ?? nowParts).time} />
              </div>
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr>
                    {["Rede", "Seguidores (total)", "Novos seg.", "Visualizações", "Alcance", "Interações", "Cliques/visitas", "Posts na rede", "% meta", "Engajamento", "Aprendizado / ação p/ próxima semana"].map((h) => <th key={h} className="th">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const cur = ds.metrics.find((m) => m.client_id === c.id && m.network === r.network && m.week_start === week);
                    const old = previousMetric(ds, c.id, r.network, week);
                    const k = `m|${c.id}|${r.network}`;
                    const num = (f: "followers" | "views" | "reach" | "interactions" | "clicks") => (
                      <input name={`${k}|${f}`} inputMode="numeric" defaultValue={cur?.[f] ?? ""} placeholder={old?.[f] != null ? `ant. ${old[f]!.toLocaleString("pt-BR")}` : ""} className="input !w-28 !bg-yellow-50 text-right" />
                    );
                    return (
                      <tr key={r.network}>
                        <td className="td font-medium">{r.network}</td>
                        <td className="td">{num("followers")}</td>
                        <td className={`td num font-semibold ${deltaColor(r.newFollowers)}`}>{deltaInt(r.newFollowers)}</td>
                        <td className="td">{num("views")}<div className={`text-right text-xs ${deltaColor(r.viewsVar)}`}>{r.viewsVar != null && `${delta(r.viewsVar)} ${r.monthly ? "vs mês ant." : "vs ant."}`}</div></td>
                        <td className="td">{num("reach")}</td>
                        <td className="td">{num("interactions")}</td>
                        <td className="td">{num("clicks")}</td>
                        <td className="td num">{r.posts}</td>
                        <td className="td num">{pct(goalPct(r.posts, c.weekly_goal))}</td>
                        <td className="td num">{pct(r.engagement, 1)}</td>
                        <td className="td"><input name={`${k}|learning`} defaultValue={cur?.learning ?? ""} className="input !min-w-56 !bg-yellow-50" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
        <div className="sticky bottom-3 flex justify-end"><SubmitButton className="btn btn-accent shadow-lg">Salvar métricas da semana</SubmitButton></div>
      </form>
      <p className="text-xs text-slate-500">Campos vazios ficam sem dado. “Novos seguidores” = seguidores desta semana − da semana anterior (aparece quando as duas existem). Engajamento = interações ÷ alcance. O Google Meu Negócio só informa números por mês: lance em <a href="/mensal" className="underline">Fechamento mensal</a>.</p>
    </div>
  );
}
