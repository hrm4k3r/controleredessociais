import Link from "next/link";
import { Fragment } from "react";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "@/components/SubmitButton";
import CollectedAt from "@/components/CollectedAt";
import { Flash } from "@/components/ui";
import { GOOGLE_FIELDS, isMonthly } from "@/lib/constants";
import { spParts, todayISO } from "@/lib/dates";
import { one, ok as okParam } from "@/lib/params";
import { addMonths, CLOSING_DAY, closableMonth, fmtMes, isMonthISO, monthStart } from "@/lib/monthly";
import { loadMonthly } from "@/lib/monthly-data";
import { saveMonthly } from "./actions";

export const dynamic = "force-dynamic";
const FIELDS = [["followers", "Seguidores (total)"], ["views", "Visualizações"], ["reach", "Alcance"], ["interactions", "Interações"], ["clicks", "Cliques/visitas"]] as const;

export default async function Fechamento({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();
  const raw = one(sp.mes);
  const month = raw && isMonthISO(monthStart(raw)) ? monthStart(raw) : closableMonth(today);
  const sb = await createClient();
  const d = await loadMonthly(sb);
  if (!d) return <div className="space-y-5"><h1 className="page-title">Fechamento mensal</h1><div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">Rode no Supabase a migração <code>20261119000019_fechamento_mensal.sql</code>.</div></div>;
  const prev = addMonths(month, -1);
  const ready = today >= `${addMonths(month, 1).slice(0, 8)}${String(CLOSING_DAY).padStart(2, "0")}`;
  const nowParts = spParts(new Date().toISOString());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Fechamento mensal</h1>
        <p className="text-sm text-slate-600">Lance os números do mês <b>inteiro</b> (no Instagram, período personalizado do dia 1 ao último dia; no Google, o mês fechado). Faça a partir do dia {CLOSING_DAY}, quando o Google já consolidou.</p>
      </div>
      <Flash ok={okParam(sp)} />
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/mensal?mes=${addMonths(month, -1)}`} className="btn btn-ghost" aria-label="Mês anterior">←</Link>
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold capitalize text-navy">{fmtMes(month)}</div>
        <Link href={`/mensal?mes=${addMonths(month, 1)}`} className="btn btn-ghost" aria-label="Próximo mês">→</Link>
        <Link href="/mensal/relatorio" className="btn btn-ghost">Relatório do cliente</Link>
      </div>
      {!ready && <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-800">Este mês ainda não está fechado para coleta: os números consolidados saem a partir do dia {CLOSING_DAY} do mês seguinte.</div>}

      <form action={saveMonthly} className="space-y-5">
        <input type="hidden" name="month" value={month} />
        {d.clients.map((c) => {
          const nets = d.accounts.filter((a) => a.client_id === c.id).map((a) => a.network);
          const note = d.notes.find((n) => n.client_id === c.id && n.month === month);
          const coll = note?.collected_at ? spParts(note.collected_at) : nowParts;
          return (
            <section key={c.id} className="card !p-0 overflow-x-auto">
              <div className="border-b border-line px-4 py-2"><h2 className={`font-bold ${c.is_internal ? "text-accent" : "text-navy"}`}>{c.name}</h2></div>
              <div className="border-b border-line bg-slate-50 px-4 py-2"><CollectedAt prefix={`coll|${c.id}`} defaultDate={coll.date} defaultTime={coll.time} /></div>
              <table className="w-full min-w-[900px]">
                <thead><tr><th className="th">Rede</th>{FIELDS.map(([, l]) => <th key={l} className="th">{l}</th>)}<th className="th">Aprendizado do mês</th></tr></thead>
                <tbody>
                  {nets.length === 0 && <tr><td className="td text-slate-500" colSpan={7}>Sem contas cadastradas.</td></tr>}
                  {nets.map((n) => {
                    const cur = d.rows.find((r) => r.client_id === c.id && r.network === n && r.month === month);
                    const old = d.rows.find((r) => r.client_id === c.id && r.network === n && r.month === prev);
                    const k = `m|${c.id}|${n}`;
                    return (
                      <Fragment key={n}>
                        <tr>
                          <td className="td font-medium">{n}</td>
                          {FIELDS.map(([f]) => isMonthly(n) && (f === "followers" || f === "reach" || f === "clicks") ? (
                            <td key={f} className="td text-center text-slate-300" title="O Google não informa este número">—</td>
                          ) : (
                            <td key={f} className="td"><input name={`${k}|${f}`} inputMode="numeric" defaultValue={cur?.[f] ?? ""} placeholder={old?.[f] != null ? `ant. ${old[f]!.toLocaleString("pt-BR")}` : ""} className="input !w-28 !bg-yellow-50 text-right" /></td>
                          ))}
                          <td className="td"><input name={`${k}|learning`} defaultValue={cur?.learning ?? ""} className="input !min-w-56 !bg-yellow-50" /></td>
                        </tr>
                        {isMonthly(n) && (
                          <tr className="bg-slate-50">
                            <td className="td text-xs font-semibold text-slate-600">Google: visualizações do perfil e interações acima; demais números aqui</td>
                            <td className="td" colSpan={6}>
                              <div className="flex flex-wrap gap-3">
                                {GOOGLE_FIELDS.map((g) => (
                                  <label key={g.key} className="text-xs text-slate-600">{g.label}
                                    <input name={`${k}|${g.key}`} inputMode="numeric" defaultValue={cur?.[g.key] ?? ""} placeholder={old?.[g.key] != null ? `ant. ${old[g.key]!.toLocaleString("pt-BR")}` : ""} className="input mt-1 !w-28 !bg-yellow-50 text-right" />
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
                <div><label className="label">Comentário do mês (aparece no relatório)</label><textarea name={`n|${c.id}|comment`} rows={2} defaultValue={note?.comment ?? ""} className="input" /></div>
                <div><label className="label">Próximos passos</label><textarea name={`n|${c.id}|next`} rows={2} defaultValue={note?.next_steps ?? ""} className="input" /></div>
              </div>
            </section>
          );
        })}
        <div className="sticky bottom-3 flex justify-end"><SubmitButton className="btn btn-accent shadow-lg">Salvar fechamento de {fmtMes(month)}</SubmitButton></div>
      </form>
      <p className="text-xs text-slate-500">Campos vazios ficam sem dado. O alcance do mês deve ser lido direto do painel do mês inteiro (não some as semanas: a mesma pessoa se repete). O “ant.” mostra o valor do mês anterior.</p>
    </div>
  );
}
