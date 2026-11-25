import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadMemberNames, loadMembers } from "@/lib/members";
import { getAccess } from "@/lib/access";
import PagesBoard from "@/components/PagesBoard";
import { ErrorBox, Flash } from "@/components/ui";
import JobForm from "@/components/JobForm";
import PrintHint from "@/components/PrintHint";
import Author from "@/components/Author";
import SubmitButton from "@/components/SubmitButton";
import DateInput from "@/components/DateInput";
import { one, ok as okParam } from "@/lib/params";
import { fmtData, todayISO } from "@/lib/dates";
import {
  brl, isLateJob, JOB_COLS, kindOf, margin, nextStatus, PROOF_RESULTS, proofOf, statusOf, stepProgress,
  PAGE_COLS, type PrintJob, type PrintPage, type PrintProof, type PrintStep,
} from "@/lib/impressos";
import { addProof, addStep, deleteJob, deleteProof, deleteStep, saveJob, setJobStatus, setProof, toggleStep } from "../../actions";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { titulo: "Informe o título.", etapa: "Informe o nome da etapa.", pagina: "Informe o anunciante ou o título da página.", dados: "Dados inválidos." };

export default async function Trabalho({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const sb = await createClient();
  const jr = await sb.from("print_jobs").select(JOB_COLS).eq("id", id).maybeSingle();
  if (jr.error) return <div className="space-y-5"><PrintHint /></div>;
  if (!jr.data) notFound();
  const job = jr.data as PrintJob;
  const access = (await getAccess(sb))!;
  const [sr, pr, cr, names, pgr, members] = await Promise.all([
    sb.from("print_steps").select("id,job_id,title,assignee_id,due_date,done,done_by,position").eq("job_id", id).order("position"),
    sb.from("print_proofs").select("id,job_id,version,sent_at,result,notes,created_by").eq("job_id", id).order("version", { ascending: false }),
    sb.from("clients").select("id,name").eq("active", true).order("name"),
    loadMemberNames(sb),
    sb.from("print_pages").select(PAGE_COLS).eq("job_id", id).order("position"),
    loadMembers(sb, access.orgModules),
  ]);
  const pages = (pgr.data ?? []) as PrintPage[];
  const people = members.filter((m) => m.modules.includes("impressos")).map((m) => ({ id: m.id, name: m.name }));
  const steps = (sr.data ?? []) as PrintStep[];
  const proofs = (pr.data ?? []) as PrintProof[];
  const clients = (cr.data ?? []) as { id: string; name: string }[];
  const st = statusOf(job.status);
  const pg = stepProgress(steps);
  const mg = margin(job.price, job.cost);
  const today = todayISO();
  const late = isLateJob(job.due_date, job.status, today);
  const next = nextStatus(job.status);
  const erro = one(sp.erro);
  const spec = [job.size, job.pages ? `${job.pages} págs.` : null, job.colors, job.paper, job.finish].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <Link href="/impressos/trabalhos" className="text-sm text-accent underline">← Voltar aos trabalhos</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{kindOf(job.kind).icon} {job.title}</h1>
          <p className="text-sm text-slate-600">
            {job.client_id ? clients.find((c) => c.id === job.client_id)?.name ?? "Cliente" : "Interno"} · {kindOf(job.kind).label}
            {job.quantity ? ` · ${job.quantity.toLocaleString("pt-BR")} un.` : ""}{job.supplier ? ` · ${job.supplier}` : ""}
          </p>
          {spec && <p className="text-xs text-slate-500">{spec}</p>}
          {job.created_by && <p className="mt-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1">Criado por <Author name={names[job.created_by] ?? "Usuário"} /></span></p>}
          {job.completed_by && <p className="text-xs text-slate-500"><span className="inline-flex items-center gap-1">Entregue por <Author name={names[job.completed_by] ?? "Usuário"} />{job.delivered_at ? ` em ${fmtData(job.delivered_at)}` : ""}</span></p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${st.cls}`}>{st.label}</span>
          {next && (
            <form action={setJobStatus}>
              <input type="hidden" name="id" value={job.id} /><input type="hidden" name="current" value={job.status} /><input type="hidden" name="advance" value="1" /><input type="hidden" name="back" value={`/impressos/trabalhos/${job.id}?ok=1`} />
              <SubmitButton className="btn btn-accent">Avançar para “{statusOf(next).label}” →</SubmitButton>
            </form>
          )}
        </div>
      </div>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro ? ERR[erro] : undefined} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><div className="label">Prazo</div><div className={`text-2xl font-extrabold ${late ? "text-red-600" : "text-navy"}`}>{job.due_date ? fmtData(job.due_date) : "—"}</div>{late && <div className="text-xs text-red-700">Atrasado</div>}</div>
        <div className="card"><div className="label">Etapas</div><div className="text-2xl font-extrabold text-navy">{pg.pct}%</div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-green-500" style={{ width: `${pg.pct}%` }} /></div><div className="mt-1 text-xs text-slate-500">{pg.done}/{pg.total} concluídas</div></div>
        <div className="card"><div className="label">Valor cobrado</div><div className="text-2xl font-extrabold text-navy">{brl(job.price)}</div><div className="mt-1 text-xs text-slate-500">Custo: {brl(job.cost)}</div></div>
        <div className="card"><div className="label">Margem</div><div className="text-2xl font-extrabold text-navy">{mg ? brl(mg.value) : "—"}</div><div className="mt-1 text-xs text-slate-500">{mg?.pct != null ? `${mg.pct}% do valor` : "Informe custo e valor"}</div></div>
      </div>

      {pgr.error ? (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-800">Para usar as páginas/anunciantes, rode no Supabase a migração <code>20261119000020_impressos_paginas.sql</code>.</div>
      ) : (
        <PagesBoard jobId={id} pages={pages} capacity={job.pages} people={people} names={names} />
      )}

      <section id="etapas" className="card space-y-3">
        <h2 className="font-bold text-navy">Etapas</h2>
        <ul className="space-y-1.5">
          {steps.length === 0 && <li className="text-sm text-slate-500">Nenhuma etapa. Adicione abaixo.</li>}
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <form action={toggleStep}>
                <input type="hidden" name="id" value={s.id} /><input type="hidden" name="job_id" value={id} /><input type="hidden" name="done" value={s.done ? "1" : "0"} />
                <button className={`grid h-5 w-5 place-items-center rounded border text-xs ${s.done ? "border-green-600 bg-green-600 text-white" : "border-line bg-surface"}`} aria-label={s.done ? "Reabrir etapa" : "Concluir etapa"}>{s.done ? "✓" : ""}</button>
              </form>
              <span className={s.done ? "text-slate-400 line-through" : ""}>{s.title}</span>
              {s.due_date && <span className="text-xs text-slate-500">até {fmtData(s.due_date)}</span>}
              {s.done && s.done_by && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Author name={names[s.done_by] ?? "Usuário"} /></span>}
              <form action={deleteStep} className="ml-auto"><input type="hidden" name="id" value={s.id} /><input type="hidden" name="job_id" value={id} /><button className="text-xs text-slate-400 hover:text-red-600" aria-label="Excluir etapa">✕</button></form>
            </li>
          ))}
        </ul>
        <form action={addStep} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="job_id" value={id} />
          <div className="min-w-56 flex-1"><label className="label">Nova etapa</label><input name="title" className="input" placeholder="Ex.: Revisar anúncios" /></div>
          <div className="w-40"><label className="label">Prazo</label><DateInput name="due_date" /></div>
          <SubmitButton className="btn btn-ghost">Adicionar</SubmitButton>
        </form>
      </section>

      <section id="provas" className="card space-y-3">
        <h2 className="font-bold text-navy">Provas e aprovações do cliente</h2>
        <ul className="space-y-2">
          {proofs.length === 0 && <li className="text-sm text-slate-500">Nenhuma prova enviada ainda.</li>}
          {proofs.map((p) => {
            const r = proofOf(p.result);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2 text-sm">
                <strong>Prova {p.version}</strong><span className="text-xs text-slate-500">enviada em {fmtData(p.sent_at)}</span>
                <span className={`badge ${r.cls}`}>{r.label}</span>
                {p.notes && <span className="text-slate-600">· {p.notes}</span>}
                <form action={setProof} className="ml-auto flex items-center gap-1">
                  <input type="hidden" name="id" value={p.id} /><input type="hidden" name="job_id" value={id} />
                  <select name="result" defaultValue={p.result} className="input !w-auto !py-1 text-xs" aria-label="Resultado">{PROOF_RESULTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
                  <SubmitButton className="btn btn-ghost !px-2 !py-1 text-xs">Salvar</SubmitButton>
                </form>
                <form action={deleteProof}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="job_id" value={id} /><button className="text-xs text-slate-400 hover:text-red-600" aria-label="Excluir prova">✕</button></form>
              </li>
            );
          })}
        </ul>
        <form action={addProof} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="job_id" value={id} />
          <div className="w-40"><label className="label">Enviada em</label><DateInput name="sent_at" defaultValue={today} /></div>
          <div className="min-w-56 flex-1"><label className="label">Observação</label><input name="notes" className="input" placeholder="Ex.: enviada por WhatsApp" /></div>
          <SubmitButton className="btn btn-ghost">Registrar prova</SubmitButton>
        </form>
      </section>

      <details className="card">
        <summary className="cursor-pointer font-semibold text-navy">Editar dados do trabalho</summary>
        <div className="mt-4"><JobForm action={saveJob} clients={clients} initial={job} /></div>
      </details>

      <form action={deleteJob}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton className="btn btn-ghost !text-red-700" confirm="Excluir este trabalho, com etapas e provas? Não dá para desfazer.">Excluir trabalho</SubmitButton>
      </form>
    </div>
  );
}
