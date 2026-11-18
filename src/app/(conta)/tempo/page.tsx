import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/access";
import { loadMemberNames } from "@/lib/members";
import DateInput from "@/components/DateInput";
import { one } from "@/lib/params";
import { addDays, firstOfMonth, fmtData, isValidISO, spParts, todayISO, weekStart } from "@/lib/dates";
import { deviationPct, elapsedMin, fmtMin, groupBy, stats } from "@/lib/time-report";
import { fmtHours, kindLabel, PROJECT_KINDS, typeOf } from "@/lib/dev";

export const dynamic = "force-dynamic";

type TaskRow = { client_id: string | null; format: string | null; status: string; started_at?: string | null; finished_at?: string | null; focus_minutes?: number | null; pomodoros?: number | null; completed_by?: string | null };

const PRESETS: [string, string][] = [["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"], ["mes", "Este mês"], ["tudo", "Tudo"]];

function Tbl({ head, rows, empty }: { head: string[]; rows: (string | number | React.ReactNode)[][]; empty: string }) {
  return (
    <div className="card overflow-x-auto !p-0">
      <table className="w-full min-w-[640px]">
        <thead><tr>{head.map((h, i) => <th key={h} className={`th ${i > 0 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td className="td text-slate-500" colSpan={head.length}>{empty}</td></tr>}
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`td ${j === 0 ? "font-medium" : "num"}`}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

/** Relatório de tempo (somente proprietário/administrador): quanto leva produzir cada tipo de entrega. */
export default async function Tempo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const access = await requireManager(sb);
  const today = todayISO();
  const p = one(sp.p);
  let de = one(sp.de), ate = one(sp.ate);
  if (!(isValidISO(de) && isValidISO(ate) && de <= ate)) {
    ate = today;
    de = p === "7" ? addDays(today, -7) : p === "90" ? addDays(today, -90) : p === "mes" ? firstOfMonth(today) : p === "tudo" ? "2000-01-01" : addDays(today, -30);
  }
  const inRange = (iso?: string | null) => { if (!iso) return false; const d = spParts(iso).date; return d >= de! && d <= ate!; };
  const hasSocial = access.modules.includes("social");
  const hasDev = access.modules.includes("dev");
  const names = await loadMemberNames(sb);
  const { data: clientRows } = await sb.from("clients").select("id,name");
  const cname = new Map((clientRows ?? []).map((c) => [c.id as string, c.name as string]));
  const notes: string[] = [];

  /* ---------- Redes sociais ---------- */
  let tasks: TaskRow[] = [];
  if (hasSocial) {
    const q = (cols: string) => sb.from("tasks").select(cols).gte("week_start", weekStart(de)).lte("week_start", ate!).limit(20000);
    let r = await q("client_id,format,status,started_at,finished_at,focus_minutes,pomodoros,completed_by");
    if (r.error) { r = await q("client_id,format,status,completed_by"); if (!r.error) notes.push("Rode as migrações 13 e 14 para medir o tempo dos cartões."); }
    tasks = (r.data ?? []) as unknown as TaskRow[];
  }
  const timed = (t: TaskRow) => elapsedMin(t.started_at, t.finished_at);
  const socialRows = (list: TaskRow[]) => {
    const e = stats(list.map(timed).filter((x): x is number => x != null));
    const focusCards = list.filter((t) => (t.focus_minutes ?? 0) > 0);
    const focusTotal = focusCards.reduce((s, t) => s + (t.focus_minutes ?? 0), 0);
    return { total: list.length, e, focusAvg: focusCards.length ? focusTotal / focusCards.length : null, focusTotal, pomos: list.reduce((s, t) => s + (t.pomodoros ?? 0), 0) };
  };
  const socialLine = (label: string, list: TaskRow[]): (string | number)[] => {
    const s = socialRows(list);
    return [label, s.total, s.e.n, fmtMin(s.e.avg), fmtMin(s.e.median), fmtMin(s.focusAvg), fmtMin(s.focusTotal), s.pomos];
  };
  const SOCIAL_HEAD = ["", "Cartões", "Com tempo medido", "Tempo médio", "Mediana", "Foco médio/cartão", "Foco total", "🍅"];
  const byFormat = [...groupBy(tasks, (t) => t.format ?? "Sem formato").entries()].sort((a, b) => b[1].length - a[1].length);
  const byClient = [...groupBy(tasks, (t) => (t.client_id ? cname.get(t.client_id) ?? "Cliente" : "Sem cliente")).entries()].sort((a, b) => b[1].length - a[1].length);
  const all = socialRows(tasks);

  /* ---------- Projetos de software ---------- */
  type Proj = { id: string; name: string; kind: string; status: string };
  type Item = { project_id: string; type: string; status: string; estimate_hours: number | null; started_at?: string | null; finished_at?: string | null };
  type Entry = { project_id: string; user_id: string | null; hours: number };
  let projects: Proj[] = [], items: Item[] = [], entries: Entry[] = [];
  if (hasDev) {
    const [pr, it0, te] = await Promise.all([
      sb.from("dev_projects").select("id,name,kind,status"),
      sb.from("dev_items").select("project_id,type,status,estimate_hours,started_at,finished_at").limit(50000),
      sb.from("dev_time_entries").select("project_id,user_id,hours").gte("work_date", de).lte("work_date", ate!).limit(50000),
    ]);
    let it = it0;
    if (it.error) { it = (await sb.from("dev_items").select("project_id,type,status,estimate_hours").limit(50000)) as typeof it0; if (!it.error) notes.push("Rode a migração 14 para medir o tempo dos itens dos projetos."); }
    projects = (pr.data ?? []) as Proj[];
    items = (it.data ?? []) as unknown as Item[];
    entries = ((te.data ?? []) as Entry[]).map((x) => ({ ...x, hours: Number(x.hours) }));
  }
  const kindOf = new Map(projects.map((x) => [x.id, x.kind]));
  const hoursBy = (key: (e: Entry) => string) => { const m = new Map<string, number>(); for (const e of entries) m.set(key(e), (m.get(key(e)) ?? 0) + e.hours); return m; };
  const hoursByProject = hoursBy((e) => e.project_id);
  const hoursByPerson = hoursBy((e) => e.user_id ?? "");
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const itemsInRange = items.filter((i) => inRange(i.finished_at));
  const itemElapsed = (list: Item[]) => stats(list.map((i) => elapsedMin(i.started_at, i.finished_at)).filter((x): x is number => x != null));

  const kindRows = PROJECT_KINDS.map((k) => {
    const ps = projects.filter((x) => x.kind === k.id);
    const h = ps.reduce((s, x) => s + (hoursByProject.get(x.id) ?? 0), 0);
    const withHours = ps.filter((x) => (hoursByProject.get(x.id) ?? 0) > 0).length;
    const done = items.filter((i) => kindOf.get(i.project_id) === k.id && i.status === "concluido").length;
    return { k, ps, h, withHours, done };
  }).filter((x) => x.ps.length > 0);
  const typeRows = [...groupBy(itemsInRange, (i) => i.type).entries()].map(([t, l]) => ({ t, l, s: itemElapsed(l) })).sort((a, b) => b.l.length - a.l.length);

  const presetHref = (id: string) => `/tempo?p=${id}`;
  const active = !one(sp.de) ? p ?? "30" : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Relatório de tempo</h1>
        <p className="text-sm text-slate-600">Quanto tempo leva cada tipo de entrega. Visível só para proprietário e administrador.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-line">
          {PRESETS.map(([id, label]) => <Link key={id} href={presetHref(id)} className={`px-3 py-2 text-sm font-semibold ${active === id ? "bg-navy text-white" : "bg-surface text-navy hover:bg-soft"}`}>{label}</Link>)}
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div className="w-36"><label className="label">De</label><DateInput name="de" defaultValue={de} /></div>
          <div className="w-36"><label className="label">Até</label><DateInput name="ate" defaultValue={ate} /></div>
          <button className="btn btn-ghost">Aplicar</button>
        </form>
        <span className="pb-2 text-xs text-slate-500">Período: {de === "2000-01-01" ? "tudo" : fmtData(de)} a {fmtData(ate!)}</span>
      </div>
      {notes.map((n) => <div key={n} className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-800">{n}</div>)}

      {hasSocial && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy">Redes sociais</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card"><div className="label">Cartões no período</div><div className="text-2xl font-extrabold text-navy">{all.total}</div></div>
            <div className="card"><div className="label">Tempo médio (início → fim)</div><div className="text-2xl font-extrabold text-navy">{fmtMin(all.e.avg)}</div><div className="text-xs text-slate-500">em {all.e.n} cartões com tempo medido</div></div>
            <div className="card"><div className="label">Foco total (Pomodoro)</div><div className="text-2xl font-extrabold text-navy">{fmtMin(all.focusTotal)}</div><div className="text-xs text-slate-500">{all.pomos} pomodoros</div></div>
            <div className="card"><div className="label">Foco médio por cartão</div><div className="text-2xl font-extrabold text-navy">{fmtMin(all.focusAvg)}</div></div>
          </div>
          <h3 className="font-semibold text-navy">Por formato</h3>
          <Tbl head={["Formato", ...SOCIAL_HEAD.slice(1)]} rows={byFormat.map(([f, l]) => socialLine(f, l))} empty="Nenhum cartão no período." />
          <h3 className="font-semibold text-navy">Por cliente</h3>
          <Tbl head={["Cliente", ...SOCIAL_HEAD.slice(1)]} rows={byClient.map(([c, l]) => socialLine(c, l))} empty="Nenhum cartão no período." />
          <p className="text-xs text-slate-500">&quot;Tempo médio&quot; é o tempo entre mover para Em andamento e para Em revisão (inclui pausas e interrupções); cartões com mais de 7 dias entre início e fim são ignorados nessa média. &quot;Foco&quot; é só o tempo cronometrado no Pomodoro, então é o mais fiel ao esforço real.</p>
        </section>
      )}

      {hasDev && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy">Projetos de software</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card"><div className="label">Horas lançadas no período</div><div className="text-2xl font-extrabold text-navy">{fmtHours(totalHours)}</div></div>
            <div className="card"><div className="label">Itens concluídos no período</div><div className="text-2xl font-extrabold text-navy">{itemsInRange.length}</div></div>
            <div className="card"><div className="label">Tempo médio por item</div><div className="text-2xl font-extrabold text-navy">{fmtMin(itemElapsed(itemsInRange).avg)}</div></div>
          </div>
          <h3 className="font-semibold text-navy">Por tipo de projeto (site, sistema, aplicativo…)</h3>
          <Tbl head={["Tipo", "Projetos", "Horas no período", "Horas por projeto", "Itens concluídos (total)"]}
            rows={kindRows.map(({ k, ps, h, withHours, done }) => [k.label, ps.length, fmtHours(h), withHours ? fmtHours(h / withHours) : "—", done])} empty="Nenhum projeto." />
          <h3 className="font-semibold text-navy">Por projeto</h3>
          <Tbl head={["Projeto", "Tipo", "Horas no período", "Estimado (itens)", "Real × estimado", "Itens"]}
            rows={projects.map((x) => ({ x, h: hoursByProject.get(x.id) ?? 0, est: items.filter((i) => i.project_id === x.id).reduce((s, i) => s + Number(i.estimate_hours ?? 0), 0), its: items.filter((i) => i.project_id === x.id) }))
              .sort((a, b) => b.h - a.h).map(({ x, h, est, its }) => {
                const dev = deviationPct(est, h);
                return [<Link key={x.id} href={`/dev/projetos/${x.id}`} className="underline">{x.name}</Link>, kindLabel(x.kind), fmtHours(h), est ? fmtHours(est) : "—", dev == null ? "—" : <span key="d" className={dev > 0 ? "text-red-700" : "text-green-700"}>{dev > 0 ? "+" : ""}{dev}%</span>, `${its.filter((i) => i.status === "concluido").length}/${its.length}`];
              })} empty="Nenhum projeto." />
          <h3 className="font-semibold text-navy">Por tipo de item</h3>
          <Tbl head={["Tipo", "Itens concluídos", "Tempo médio", "Mediana"]} rows={typeRows.map(({ t, l, s }) => [`${typeOf(t).icon} ${typeOf(t).label}`, l.length, fmtMin(s.avg), fmtMin(s.median)])} empty="Nenhum item concluído no período (o tempo é medido a partir da migração 14)." />
        </section>
      )}

      {(hasSocial || hasDev) && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-navy">Por pessoa</h2>
          <Tbl head={["Pessoa", ...(hasSocial ? ["Cartões concluídos", "Foco (Pomodoro)"] : []), ...(hasDev ? ["Horas em projetos"] : [])]}
            rows={[...new Set([...tasks.map((t) => t.completed_by ?? ""), ...hoursByPerson.keys()])].filter(Boolean).map((u) => {
              const mine = tasks.filter((t) => t.completed_by === u);
              return [names[u] ?? "Usuário", ...(hasSocial ? [mine.length, fmtMin(mine.reduce((s, t) => s + (t.focus_minutes ?? 0), 0))] : []), ...(hasDev ? [fmtHours(hoursByPerson.get(u) ?? 0)] : [])];
            })} empty="Sem dados no período." />
        </section>
      )}
    </div>
  );
}
