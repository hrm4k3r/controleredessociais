import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { Flash } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import DevHint from "@/components/DevHint";
import { ok as okParam } from "@/lib/params";
import { fmtDiaMes, todayISO } from "@/lib/dates";
import { DEV_COLUMNS, isLate, priorityOf, priorityRank, typeOf } from "@/lib/dev";
import { quickStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function Minhas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const access = (await getAccess(sb))!;
  const [it, pr] = await Promise.all([
    sb.from("dev_items").select("id,project_id,title,type,status,priority,due_date,estimate_hours").eq("assignee_id", access.userId).neq("status", "concluido"),
    sb.from("dev_projects").select("id,name"),
  ]);
  if (it.error) return <div className="space-y-5"><h1 className="page-title">Minhas tarefas</h1><DevHint /></div>;
  const pname = new Map(((pr.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  const today = todayISO();
  const items = ((it.data ?? []) as { id: string; project_id: string; title: string; type: string; status: string; priority: string; due_date: string | null; estimate_hours: number | null }[])
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));

  return (
    <div className="space-y-5">
      <h1 className="page-title">Minhas tarefas</h1>
      <Flash ok={okParam(sp)} />
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[760px]">
          <thead><tr>{["Item", "Projeto", "Prioridade", "Prazo", "Situação", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {items.length === 0 && <tr><td className="td text-slate-500" colSpan={6}>Nada atribuído a você em aberto. 🎉</td></tr>}
            {items.map((i) => {
              const pri = priorityOf(i.priority);
              return (
                <tr key={i.id}>
                  <td className="td font-medium">{typeOf(i.type).icon} {i.title}</td>
                  <td className="td"><Link href={`/dev/projetos/${i.project_id}`} className="text-accent underline">{pname.get(i.project_id) ?? "Projeto"}</Link></td>
                  <td className="td"><span className={`badge ${pri.cls}`}>{pri.label}</span></td>
                  <td className={`td whitespace-nowrap ${isLate(i.due_date, i.status, today) ? "font-semibold text-red-700" : ""}`}>{i.due_date ? fmtDiaMes(i.due_date) : "—"}</td>
                  <td className="td" colSpan={2}>
                    <form action={quickStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={i.id} />
                      <select name="status" defaultValue={i.status} className="input !w-auto" aria-label="Situação">{DEV_COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                      <SubmitButton className="btn btn-ghost" pendingText="…">Salvar</SubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
