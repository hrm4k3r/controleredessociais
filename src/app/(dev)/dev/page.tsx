import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import DevHint from "@/components/DevHint";
import { currentWeekStart, fmtData, fmtDiaMes, todayISO, weekEnd } from "@/lib/dates";
import { fmtHours, isLate, kindLabel, priorityOf, progress, projectStatus, typeOf } from "@/lib/dev";

export const dynamic = "force-dynamic";

type It = { id: string; project_id: string; title: string; type: string; status: string; priority: string; due_date: string | null; assignee_id: string | null };

export default async function DevPainel() {
  const sb = await createClient();
  const access = (await getAccess(sb))!;
  const week = currentWeekStart();
  const [pr, it, ms, te] = await Promise.all([
    sb.from("dev_projects").select("id,name,kind,status,due_date,client_id").in("status", ["planejamento", "em_andamento", "pausado"]).order("due_date", { nullsFirst: false }),
    sb.from("dev_items").select("id,project_id,title,type,status,priority,due_date,assignee_id").limit(20000),
    sb.from("dev_milestones").select("id,project_id,name,due_date,delivered_at").is("delivered_at", null).order("due_date", { nullsFirst: false }),
    sb.from("dev_time_entries").select("hours").gte("work_date", week).lte("work_date", weekEnd(week)),
  ]);
  if (pr.error) return <div className="space-y-5"><h1 className="page-title">Painel</h1><DevHint /></div>;
  const projects = (pr.data ?? []) as { id: string; name: string; kind: string; status: string; due_date: string | null }[];
  const ids = new Set(projects.map((p) => p.id));
  const items = ((it.data ?? []) as It[]).filter((i) => ids.has(i.project_id));
  const today = todayISO();
  const open = items.filter((i) => i.status !== "concluido");
  const late = open.filter((i) => isLate(i.due_date, i.status, today));
  const mine = open.filter((i) => i.assignee_id === access.userId);
  const hours = ((te.data ?? []) as { hours: number }[]).reduce((s, r) => s + Number(r.hours), 0);
  const pname = new Map(projects.map((p) => [p.id, p.name]));
  const nextMs = new Map<string, { name: string; due_date: string | null }>();
  for (const m of (ms.data ?? []) as { project_id: string; name: string; due_date: string | null }[]) if (!nextMs.has(m.project_id)) nextMs.set(m.project_id, m);
  const attention = open.filter((i) => isLate(i.due_date, i.status, today) || i.priority === "urgente").slice(0, 8);

  const Stat = ({ label, value, href, tone }: { label: string; value: string | number; href?: string; tone?: string }) => {
    const body = <><div className="label">{label}</div><div className={`text-3xl font-extrabold ${tone ?? "text-navy"}`}>{value}</div></>;
    return href ? <Link href={href} className="card block hover:border-accent">{body}</Link> : <div className="card">{body}</div>;
  };

  return (
    <div className="space-y-5">
      <h1 className="page-title">Painel de projetos</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Projetos ativos" value={projects.length} href="/dev/projetos" />
        <Stat label="Itens em aberto" value={open.length} />
        <Stat label="Itens atrasados" value={late.length} tone={late.length ? "text-red-600" : undefined} />
        <Stat label="Atribuídos a mim" value={mine.length} href="/dev/minhas" />
        <Stat label="Horas na semana" value={fmtHours(hours)} href="/dev/horas" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card overflow-x-auto !p-0 lg:col-span-2">
          <table className="w-full min-w-[620px]">
            <thead><tr>{["Projeto", "Situação", "Progresso", "Próximo marco", "Entrega"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {projects.length === 0 && <tr><td className="td text-slate-500" colSpan={5}>Nenhum projeto ativo. <Link href="/dev/projetos" className="text-accent underline">Crie o primeiro</Link>.</td></tr>}
              {projects.map((p) => {
                const pg = progress(items.filter((i) => i.project_id === p.id));
                const st = projectStatus(p.status);
                const m = nextMs.get(p.id);
                return (
                  <tr key={p.id}>
                    <td className="td"><Link href={`/dev/projetos/${p.id}`} className="font-semibold text-navy underline">{p.name}</Link><div className="text-xs text-slate-500">{kindLabel(p.kind)}</div></td>
                    <td className="td"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td className="td w-44"><div className="mb-1 text-xs text-slate-600">{pg.done}/{pg.total} · {pg.pct}%</div><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-green-500" style={{ width: `${pg.pct}%` }} /></div></td>
                    <td className="td text-sm">{m ? `${m.name}${m.due_date ? ` (${fmtDiaMes(m.due_date)})` : ""}` : "—"}</td>
                    <td className={`td whitespace-nowrap ${p.due_date && p.due_date < today ? "font-semibold text-red-700" : ""}`}>{p.due_date ? fmtData(p.due_date) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="card space-y-2">
          <h2 className="font-bold text-navy">Pedem atenção</h2>
          {attention.length === 0 && <p className="text-sm text-slate-500">Nada urgente nem atrasado.</p>}
          <ul className="space-y-2">
            {attention.map((i) => (
              <li key={i.id} className="text-sm">
                <Link href={`/dev/projetos/${i.project_id}`} className="font-medium hover:underline">{typeOf(i.type).icon} {i.title}</Link>
                <div className="flex flex-wrap gap-1.5 text-xs text-slate-500"><span>{pname.get(i.project_id)}</span><span className={`badge ${priorityOf(i.priority).cls}`}>{priorityOf(i.priority).label}</span>{isLate(i.due_date, i.status, today) && <span className="badge bg-red-100 text-red-800">atrasado {i.due_date && fmtDiaMes(i.due_date)}</span>}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
