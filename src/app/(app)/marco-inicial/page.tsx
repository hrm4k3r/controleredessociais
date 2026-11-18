import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import DateInput from "@/components/DateInput";
import { createClient } from "@/lib/supabase/server";
import { loadDataset } from "@/lib/data";
import { ErrorBox, Flash } from "@/components/ui";
import { one, ok as okParam } from "@/lib/params";
import { todayISO } from "@/lib/dates";
import { lastSunday } from "@/lib/baseline";
import { saveBaselines } from "./actions";

export const dynamic = "force-dynamic";

const COLS: { f: "followers" | "reach" | "views" | "interactions" | "clicks"; label: string }[] = [
  { f: "followers", label: "Seguidores (total)" }, { f: "reach", label: "Alcance (7 dias)" }, { f: "views", label: "Visualizações (7 dias)" },
  { f: "interactions", label: "Interações (7 dias)" }, { f: "clicks", label: "Cliques/visitas (7 dias)" },
];

/** Marco inicial: os números de partida de cada conta, para o "antes × depois". */
export default async function MarcoInicial({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const ds = await loadDataset(sb);
  const { data, error } = await sb.from("account_baselines").select("client_id,network,baseline_date,followers,views,reach,interactions,clicks,notes");
  const rows = (data ?? []) as { client_id: string; network: string; baseline_date: string; followers: number | null; views: number | null; reach: number | null; interactions: number | null; clicks: number | null; notes: string | null }[];
  const suggested = lastSunday(todayISO());
  const erro = one(sp.erro);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Marco inicial</h1>
        <p className="text-sm text-slate-600">Os números de partida de cada rede, para comparar o <b>antes</b> com o <b>depois</b> em <Link href="/evolucao" className="text-accent underline">Evolução</Link>. Colete como na rotina de domingo: seguidores totais e os números dos últimos 7 dias.</p>
      </div>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro === "data" ? "Informe uma data válida para o marco inicial." : error ? "Rode a migração 20261118000015_marco_inicial.sql no Supabase." : undefined} />
      <form action={saveBaselines} className="space-y-5">
        {ds.clients.map((c) => {
          const accounts = ds.accounts.filter((a) => a.client_id === c.id);
          if (accounts.length === 0) return null;
          const mine = rows.filter((r) => r.client_id === c.id);
          return (
            <section key={c.id} className="card !p-0 overflow-x-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2">
                <h2 className={`font-bold ${c.is_internal ? "text-accent" : "text-navy"}`}>{c.name}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold">Data da coleta</span>
                  <div className="w-36"><DateInput name={`date|${c.id}`} defaultValue={mine[0]?.baseline_date ?? suggested} className="input !py-1" ariaLabel="Data do marco inicial" /></div>
                </div>
              </div>
              <table className="w-full min-w-[900px]">
                <thead><tr>{["Rede", ...COLS.map((x) => x.label), "Observação"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody>
                  {accounts.map((a) => {
                    const cur = mine.find((r) => r.network === a.network);
                    const k = `b|${c.id}|${a.network}`;
                    return (
                      <tr key={a.id}>
                        <td className="td font-medium">{a.network}</td>
                        {COLS.map((x) => <td key={x.f} className="td"><input name={`${k}|${x.f}`} inputMode="numeric" defaultValue={cur?.[x.f] ?? ""} className="input !w-28 !bg-yellow-50 text-right" aria-label={`${a.network}: ${x.label}`} /></td>)}
                        <td className="td"><input name={`${k}|notes`} defaultValue={cur?.notes ?? ""} className="input !min-w-48 !bg-yellow-50" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
        <div className="sticky bottom-3 flex justify-end"><SubmitButton className="btn btn-accent shadow-lg">Salvar marco inicial</SubmitButton></div>
      </form>
      <p className="text-xs text-slate-500">A data sugerida é o último domingo. Deixe em branco o que não tiver: a comparação usa só o que existe dos dois lados. Linha toda vazia remove o marco da conta.</p>
    </div>
  );
}
