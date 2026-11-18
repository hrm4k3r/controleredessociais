import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ErrorBox, Flash } from "@/components/ui";
import ProjectForm from "@/components/ProjectForm";
import DevHint from "@/components/DevHint";
import { one, ok as okParam } from "@/lib/params";
import { fmtData } from "@/lib/dates";
import { kindLabel, progress, projectStatus, PROJECT_STATUSES, type DevProject } from "@/lib/dev";
import { saveProject } from "../actions";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { nome: "Informe o nome do projeto.", dados: "Dados inválidos." };

export default async function Projetos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filtro = one(sp.status) ?? "ativos";
  const sb = await createClient();
  const [pr, cl, it] = await Promise.all([
    sb.from("dev_projects").select("id,client_id,name,kind,status,description,repo_url,stack,start_date,due_date,created_by").order("created_at", { ascending: false }),
    sb.from("clients").select("id,name").eq("active", true).order("name"),
    sb.from("dev_items").select("project_id,status").limit(20000),
  ]);
  if (pr.error) return <div className="space-y-5"><h1 className="page-title">Projetos</h1><DevHint /></div>;
  const clients = (cl.data ?? []) as { id: string; name: string }[];
  const cname = new Map(clients.map((c) => [c.id, c.name]));
  const itemsBy = new Map<string, { status: string }[]>();
  for (const i of (it.data ?? []) as { project_id: string; status: string }[]) (itemsBy.get(i.project_id) ?? itemsBy.set(i.project_id, []).get(i.project_id)!).push(i);
  const all = (pr.data ?? []) as DevProject[];
  const list = all.filter((p) => (filtro === "todos" ? true : filtro === "ativos" ? ["planejamento", "em_andamento", "pausado"].includes(p.status) : p.status === filtro));
  const erro = one(sp.erro);

  return (
    <div className="space-y-5">
      <h1 className="page-title">Projetos</h1>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro ? ERR[erro] : undefined} />
      <details className="card" open={all.length === 0}>
        <summary className="cursor-pointer font-semibold text-navy">+ Novo projeto</summary>
        <div className="mt-4"><ProjectForm action={saveProject} clients={clients} submitLabel="Criar projeto" /></div>
      </details>

      <form method="get" className="flex items-center gap-2">
        <select name="status" defaultValue={filtro} className="input !w-auto" aria-label="Filtrar situação">
          <option value="ativos">Ativos</option>
          {PROJECT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          <option value="todos">Todos</option>
        </select>
        <button className="btn btn-ghost">Filtrar</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.length === 0 && <p className="text-sm text-slate-500">Nenhum projeto nesta visão.</p>}
        {list.map((p) => {
          const pg = progress(itemsBy.get(p.id) ?? []);
          const st = projectStatus(p.status);
          return (
            <Link key={p.id} href={`/dev/projetos/${p.id}`} className="card block space-y-3 transition hover:border-accent hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-bold text-navy">{p.name}</div><div className="text-xs text-slate-500">{p.client_id ? cname.get(p.client_id) ?? "Cliente" : "Interno"} · {kindLabel(p.kind)}</div></div>
                <span className={`badge ${st.cls}`}>{st.label}</span>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-600"><span>{pg.done}/{pg.total} itens concluídos</span><span className="font-semibold">{pg.pct}%</span></div>
                <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-green-500" style={{ width: `${pg.pct}%` }} /></div>
              </div>
              <div className="text-xs text-slate-500">{p.due_date ? `Entrega: ${fmtData(p.due_date)}` : "Sem prazo definido"}{p.stack ? ` · ${p.stack}` : ""}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
