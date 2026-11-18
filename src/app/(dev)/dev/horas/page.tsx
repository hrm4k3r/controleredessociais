import { createClient } from "@/lib/supabase/server";
import { loadMemberNames } from "@/lib/members";
import { ErrorBox, Flash, WeekBar } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import DateInput from "@/components/DateInput";
import DevHint from "@/components/DevHint";
import Author from "@/components/Author";
import { one, ok as okParam, weekParam } from "@/lib/params";
import { diaSemana, fmtDiaMes, todayISO, weekEnd } from "@/lib/dates";
import { fmtHours } from "@/lib/dev";
import { addTime, deleteTime } from "../actions";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { horas: "Informe as horas (ex.: 1,5 ou 1:30).", data: "Data inválida.", projeto: "Escolha o projeto ou item." };

type Entry = { id: string; project_id: string; item_id: string | null; user_id: string | null; work_date: string; hours: number; notes: string | null };

export default async function Horas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const week = weekParam(sp);
  const end = weekEnd(week);
  const sb = await createClient();
  const [te, pr, it, names] = await Promise.all([
    sb.from("dev_time_entries").select("id,project_id,item_id,user_id,work_date,hours,notes").gte("work_date", week).lte("work_date", end).order("work_date").order("created_at"),
    sb.from("dev_projects").select("id,name,status").order("name"),
    sb.from("dev_items").select("id,project_id,title").neq("status", "concluido").order("title").limit(3000),
    loadMemberNames(sb),
  ]);
  if (te.error) return <div className="space-y-5"><h1 className="page-title">Horas</h1><DevHint /></div>;
  const entries = (te.data ?? []) as Entry[];
  const projects = ((pr.data ?? []) as { id: string; name: string; status: string }[]).filter((p) => p.status !== "cancelado");
  const pname = new Map(projects.map((p) => [p.id, p.name]));
  const allItems = (it.data ?? []) as { id: string; project_id: string; title: string }[];
  const iname = new Map(allItems.map((i) => [i.id, i.title]));
  const total = entries.reduce((s, e) => s + Number(e.hours), 0);
  const sum = (key: (e: Entry) => string) => { const m = new Map<string, number>(); for (const e of entries) m.set(key(e), (m.get(key(e)) ?? 0) + Number(e.hours)); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const today = todayISO();
  const erro = one(sp.erro);

  return (
    <div className="space-y-5">
      <h1 className="page-title">Horas</h1>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro ? ERR[erro] : undefined} />
      <WeekBar path="/dev/horas" week={week} />

      <section className="card space-y-3">
        <h2 className="font-bold text-navy">Lançar horas</h2>
        <form action={addTime} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          <input type="hidden" name="semana" value={week} />
          <div className="lg:col-span-2"><label className="label">Projeto / item</label>
            <select name="target" required className="input" defaultValue="">
              <option value="" disabled>Escolha…</option>
              {projects.map((p) => (
                <optgroup key={p.id} label={p.name}>
                  <option value={`p:${p.id}`}>{p.name} (geral)</option>
                  {allItems.filter((i) => i.project_id === p.id).map((i) => <option key={i.id} value={`i:${i.id}`}>{i.title}</option>)}
                </optgroup>
              ))}
            </select></div>
          <div><label className="label">Data</label><DateInput name="work_date" required defaultValue={today >= week && today <= end ? today : week} /></div>
          <div><label className="label">Horas</label><input name="hours" required inputMode="decimal" placeholder="1,5 ou 1:30" className="input" /></div>
          <div><label className="label">O que foi feito</label><input name="notes" className="input" /></div>
          <SubmitButton className="btn btn-accent" pendingText="Lançando…">Lançar</SubmitButton>
        </form>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card"><div className="label">Total da semana</div><div className="text-3xl font-extrabold text-navy">{fmtHours(total)}</div></div>
        <div className="card"><div className="label mb-2">Por pessoa</div><ul className="space-y-1 text-sm">{sum((e) => e.user_id ?? "").map(([u, h]) => <li key={u} className="flex justify-between"><Author name={u ? names[u] ?? "Usuário" : "—"} /><b className="tabular-nums">{fmtHours(h)}</b></li>)}{entries.length === 0 && <li className="text-slate-500">—</li>}</ul></div>
        <div className="card"><div className="label mb-2">Por projeto</div><ul className="space-y-1 text-sm">{sum((e) => e.project_id).map(([p, h]) => <li key={p} className="flex justify-between"><span className="truncate pr-2">{pname.get(p) ?? "Projeto"}</span><b className="tabular-nums">{fmtHours(h)}</b></li>)}{entries.length === 0 && <li className="text-slate-500">—</li>}</ul></div>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[820px]">
          <thead><tr>{["Data", "Quem", "Projeto", "Item", "Horas", "Descrição", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {entries.length === 0 && <tr><td className="td text-slate-500" colSpan={7}>Nenhuma hora lançada nesta semana.</td></tr>}
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="td whitespace-nowrap">{diaSemana(e.work_date)} {fmtDiaMes(e.work_date)}</td>
                <td className="td"><Author name={e.user_id ? names[e.user_id] ?? "Usuário" : null} /></td>
                <td className="td">{pname.get(e.project_id) ?? "Projeto"}</td>
                <td className="td">{e.item_id ? iname.get(e.item_id) ?? "Item" : <span className="text-slate-400">geral</span>}</td>
                <td className="td tabular-nums font-semibold">{fmtHours(Number(e.hours))}</td>
                <td className="td">{e.notes}</td>
                <td className="td">
                  <form action={deleteTime}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="semana" value={week} />
                    <SubmitButton className="btn btn-ghost" pendingText="…" confirm="Excluir este lançamento?">Excluir</SubmitButton></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
