import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { loadMemberNames, loadMembers } from "@/lib/members";
import { ErrorBox, Flash } from "@/components/ui";
import ProjectForm from "@/components/ProjectForm";
import DevBoard from "@/components/DevBoard";
import DevHint from "@/components/DevHint";
import Author from "@/components/Author";
import SubmitButton from "@/components/SubmitButton";
import DateInput from "@/components/DateInput";
import { one, ok as okParam } from "@/lib/params";
import { fmtData, todayISO } from "@/lib/dates";
import { fmtHours, ITEM_COLS, kindLabel, progress, projectStatus, type DevItem, type DevMilestone, type DevProject } from "@/lib/dev";
import { deleteMilestone, deleteProject, saveMilestone, saveProject, toggleMilestone } from "../../actions";

export const dynamic = "force-dynamic";

export default async function Projeto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const sb = await createClient();
  const access = (await getAccess(sb))!;
  const pr = await sb.from("dev_projects").select("id,client_id,name,kind,status,description,repo_url,stack,start_date,due_date,created_by").eq("id", id).maybeSingle();
  if (pr.error) return <div className="space-y-5"><DevHint /></div>;
  if (!pr.data) notFound();
  const project = pr.data as DevProject;
  const [it, ms, te, cl, members, names] = await Promise.all([
    sb.from("dev_items").select(ITEM_COLS).eq("project_id", id).order("position"),
    sb.from("dev_milestones").select("id,project_id,name,due_date,delivered_at,notes").eq("project_id", id).order("due_date", { nullsFirst: false }),
    sb.from("dev_time_entries").select("user_id,hours,work_date,notes").eq("project_id", id).order("work_date", { ascending: false }).limit(5000),
    sb.from("clients").select("id,name").eq("active", true).order("name"),
    loadMembers(sb, access.orgModules),
    loadMemberNames(sb),
  ]);
  const items = (it.data ?? []) as DevItem[];
  const milestones = (ms.data ?? []) as DevMilestone[];
  const clients = (cl.data ?? []) as { id: string; name: string }[];
  const entries = (te.data ?? []) as { user_id: string | null; hours: number; work_date: string }[];
  const people = members.filter((m) => m.modules.includes("dev")).map((m) => ({ id: m.id, name: m.name }));
  const pg = progress(items);
  const st = projectStatus(project.status);
  const today = todayISO();
  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
  const est = items.reduce((s, i) => s + Number(i.estimate_hours ?? 0), 0);
  const perUser = new Map<string, number>();
  for (const e of entries) perUser.set(e.user_id ?? "", (perUser.get(e.user_id ?? "") ?? 0) + Number(e.hours));
  const erro = one(sp.erro);

  return (
    <div className="space-y-6">
      <Link href="/dev/projetos" className="text-sm text-accent underline">← Voltar aos projetos</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="text-sm text-slate-600">
            {project.client_id ? clients.find((c) => c.id === project.client_id)?.name ?? "Cliente" : "Interno"} · {kindLabel(project.kind)}
            {project.stack ? ` · ${project.stack}` : ""}
            {project.repo_url && <> · <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="text-accent underline">repositório</a></>}
          </p>
          {project.created_by && <p className="mt-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1">Criado por <Author name={names[project.created_by] ?? "Usuário"} /></span></p>}
        </div>
        <span className={`badge ${st.cls}`}>{st.label}</span>
      </div>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro === "nome" ? "Informe o nome." : undefined} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><div className="label">Progresso</div><div className="text-2xl font-extrabold text-navy">{pg.pct}%</div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-green-500" style={{ width: `${pg.pct}%` }} /></div><div className="mt-1 text-xs text-slate-500">{pg.done}/{pg.total} itens</div></div>
        <div className="card"><div className="label">Entrega</div><div className="text-2xl font-extrabold text-navy">{project.due_date ? fmtData(project.due_date) : "—"}</div><div className="mt-1 text-xs text-slate-500">{project.start_date ? `Início: ${fmtData(project.start_date)}` : "Sem data de início"}</div></div>
        <div className="card"><div className="label">Horas lançadas</div><div className="text-2xl font-extrabold text-navy">{fmtHours(totalHours)}</div><div className="mt-1 text-xs text-slate-500">Estimado nos itens: {fmtHours(est)}</div></div>
        <div className="card"><div className="label">Em aberto</div><div className="text-2xl font-extrabold text-navy">{pg.open}</div><div className="mt-1 text-xs text-slate-500">{items.filter((i) => i.type === "bug" && i.status !== "concluido").length} bug(s) aberto(s)</div></div>
      </div>

      <section className="space-y-2">
        <h2 className="font-bold text-navy">Quadro</h2>
        <DevBoard
          projectId={id} initial={items} people={people} names={names} meId={access.userId}
          milestones={milestones.map((m) => ({ id: m.id, name: m.name }))}
        />
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold text-navy">Marcos de entrega</h2>
        <ul className="space-y-2">
          {milestones.length === 0 && <li className="text-sm text-slate-500">Nenhum marco cadastrado.</li>}
          {milestones.map((m) => {
            const own = items.filter((i) => i.milestone_id === m.id);
            const mp = progress(own);
            const late = !m.delivered_at && m.due_date && m.due_date < today;
            return (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
                <div className="min-w-48">
                  <div className="font-medium">{m.delivered_at ? "✅" : "🏁"} {m.name}</div>
                  <div className={`text-xs ${late ? "font-semibold text-red-700" : "text-slate-500"}`}>
                    {m.delivered_at ? `Entregue em ${fmtData(m.delivered_at)}` : m.due_date ? `Previsto para ${fmtData(m.due_date)}${late ? " (atrasado)" : ""}` : "Sem data"} · {mp.done}/{mp.total} itens
                  </div>
                  {m.notes && <div className="mt-1 text-xs text-slate-600">{m.notes}</div>}
                </div>
                <div className="flex gap-2">
                  <form action={toggleMilestone}>
                    <input type="hidden" name="id" value={m.id} /><input type="hidden" name="project_id" value={id} /><input type="hidden" name="delivered" value={m.delivered_at ? "1" : "0"} />
                    <SubmitButton className="btn btn-ghost" pendingText="…">{m.delivered_at ? "Reabrir" : "Marcar como entregue"}</SubmitButton>
                  </form>
                  <form action={deleteMilestone}>
                    <input type="hidden" name="id" value={m.id} /><input type="hidden" name="project_id" value={id} />
                    <SubmitButton className="btn btn-ghost" pendingText="…" confirm="Excluir este marco? Os itens ficam sem marco.">Excluir</SubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
        <form action={saveMilestone} className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <input type="hidden" name="project_id" value={id} />
          <div className="lg:col-span-2"><label className="label">Novo marco</label><input name="name" required className="input" placeholder="Ex.: Entrega da versão 1 (MVP)" /></div>
          <div><label className="label">Previsto para</label><DateInput name="due_date" /></div>
          <div><label className="label">Observação</label><input name="notes" className="input" /></div>
          <SubmitButton className="btn btn-ghost" pendingText="Adicionando…">Adicionar marco</SubmitButton>
        </form>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold text-navy">Horas por pessoa</h2>
        {perUser.size === 0 ? <p className="text-sm text-slate-500">Nenhuma hora lançada. Registre em <Link href="/dev/horas" className="text-accent underline">Horas</Link>.</p> : (
          <ul className="space-y-1 text-sm">
            {[...perUser.entries()].sort((a, b) => b[1] - a[1]).map(([uid, h]) => (
              <li key={uid} className="flex justify-between"><Author name={uid ? names[uid] ?? "Usuário" : "—"} /><span className="font-semibold tabular-nums">{fmtHours(h)}</span></li>
            ))}
          </ul>
        )}
      </section>

      <details className="card">
        <summary className="cursor-pointer font-semibold text-navy">Editar dados do projeto</summary>
        <div className="mt-4"><ProjectForm action={saveProject} clients={clients} initial={project} submitLabel="Salvar alterações" /></div>
      </details>

      <form action={deleteProject} className="card flex items-center justify-between gap-3">
        <input type="hidden" name="id" value={id} />
        <span className="text-sm text-slate-600">Excluir o projeto apaga também os itens, marcos e horas lançados nele.</span>
        <SubmitButton className="btn btn-danger" pendingText="Excluindo…" confirm="Excluir o projeto e tudo que há nele? Não dá para desfazer.">Excluir projeto</SubmitButton>
      </form>
    </div>
  );
}
