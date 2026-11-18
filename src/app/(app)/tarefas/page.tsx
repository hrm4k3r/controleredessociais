import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import { one, weekParam } from "@/lib/params";
import { WeekBar } from "@/components/ui";
import Kanban from "@/components/Kanban";
import type { Task } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function Tarefas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const week = weekParam(sp);
  const clientFilter = one(sp.cliente) ?? "";
  const sb = await createClient();
  const [{ data: clients }, tasksRes] = await Promise.all([
    sb.from("clients").select("id,name").eq("active", true).order("sort"),
    (() => {
      let q = sb.from("tasks").select("id,client_id,title,notes,status,due_date,week_start,position,post_id").eq("week_start", week).order("position");
      if (clientFilter) q = q.eq("client_id", clientFilter);
      return q;
    })(),
  ]);
  const nextWeek = new URLSearchParams({ semana: addDays(week, 7), ...(clientFilter ? { cliente: clientFilter } : {}) });

  return (
    <div className="space-y-5">
      <h1 className="page-title">Tarefas</h1>
      <p className="-mt-3 text-sm text-slate-600">Quadro semanal das postagens a criar.</p>
      <div className="flex flex-wrap items-center gap-3">
        <WeekBar path="/tarefas" week={week} extra={{ cliente: clientFilter }} />
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="semana" value={week} />
          <select name="cliente" defaultValue={clientFilter} className="input !w-auto">
            <option value="">Todos os clientes</option>
            {(clients ?? []).map((c) => <option key={c.id as string} value={c.id as string}>{c.name as string}</option>)}
          </select>
          <button className="btn btn-ghost">Filtrar</button>
        </form>
      </div>
      {tasksRes.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          Não foi possível carregar as tarefas. Se for a primeira vez, rode a migração <code>supabase/migrations/20261118000002_tarefas.sql</code> no Supabase.
        </div>
      ) : (
        <Kanban
          key={`${week}|${clientFilter}`} week={week} initial={(tasksRes.data ?? []) as Task[]}
          clients={(clients ?? []).map((c) => ({ id: c.id as string, name: c.name as string }))}
          nextWeekHref={`/tarefas?${nextWeek.toString()}`} defaultClientId={clientFilter || undefined}
        />
      )}
    </div>
  );
}
