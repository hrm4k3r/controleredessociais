import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PrintHint from "@/components/PrintHint";
import SubmitButton from "@/components/SubmitButton";
import { fmtDiaMes, todayISO } from "@/lib/dates";
import { BOARD_STATUSES, brl, isLateJob, kindOf, nextStatus, stepProgress, type PrintJob } from "@/lib/impressos";
import { setJobStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function Quadro() {
  const sb = await createClient();
  const [jr, sr, cr, pr] = await Promise.all([
    sb.from("print_jobs").select("id,client_id,title,kind,status,quantity,due_date,price").neq("status", "cancelado").order("due_date", { nullsFirst: false }),
    sb.from("print_steps").select("job_id,done").limit(20000),
    sb.from("clients").select("id,name"),
    sb.from("print_pages").select("job_id,status").limit(20000), // tolerante: antes da migração a tabela não existe
  ]);
  if (jr.error) return <div className="space-y-5"><h1 className="page-title">Quadro</h1><PrintHint /></div>;
  const cname = new Map(((cr.data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));
  const all = (jr.data ?? []) as PrintJob[];
  const steps = new Map<string, { done: boolean }[]>();
  for (const s of (sr.data ?? []) as { job_id: string; done: boolean }[]) (steps.get(s.job_id) ?? steps.set(s.job_id, []).get(s.job_id)!).push(s);
  const pagesBy = new Map<string, { status: string }[]>();
  for (const p of (pr.error ? [] : (pr.data ?? [])) as { job_id: string; status: string }[]) (pagesBy.get(p.job_id) ?? pagesBy.set(p.job_id, []).get(p.job_id)!).push(p);
  const today = todayISO();
  // Entregues só aparecem no quadro se forem recentes (as demais ficam em "Trabalhos").
  const jobs = all.filter((j) => j.status !== "entregue" || (j.due_date ?? today) >= today.slice(0, 8) + "01");
  const active = all.filter((j) => j.status !== "entregue");
  const late = active.filter((j) => isLateJob(j.due_date, j.status, today));
  const toDeliver = active.filter((j) => j.status === "pronto");
  const total = active.reduce((s, j) => s + Number(j.price ?? 0), 0);

  const Stat = ({ label, value, tone }: { label: string; value: string | number; tone?: string }) => (
    <div className="card"><div className="label">{label}</div><div className={`text-3xl font-extrabold ${tone ?? "text-navy"}`}>{value}</div></div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Quadro de impressos</h1>
        <Link href="/impressos/trabalhos" className="btn btn-accent">+ Novo trabalho</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Em andamento" value={active.length} />
        <Stat label="Atrasados" value={late.length} tone={late.length ? "text-red-600" : undefined} />
        <Stat label="Prontos p/ entrega" value={toDeliver.length} />
        <Stat label="Valor em andamento" value={brl(total)} />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {BOARD_STATUSES.map((col) => {
          const list = jobs.filter((j) => j.status === col.id);
          return (
            <section key={col.id} className="w-64 shrink-0 space-y-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-900/40">
              <h2 className="flex items-center justify-between px-1 text-sm font-bold text-navy"><span>{col.label}</span><span className="badge bg-white text-slate-600">{list.length}</span></h2>
              {list.length === 0 && <p className="px-1 py-3 text-xs text-slate-400">Vazio</p>}
              {list.map((j) => {
                const pg = stepProgress(steps.get(j.id) ?? []);
                const pp = pagesBy.get(j.id) ?? [];
                const k = kindOf(j.kind);
                const next = nextStatus(j.status);
                const isLate = isLateJob(j.due_date, j.status, today);
                return (
                  <article key={j.id} className="card space-y-2 !p-3">
                    <Link href={`/impressos/trabalhos/${j.id}`} className="block font-semibold text-navy hover:underline">{k.icon} {j.title}</Link>
                    <div className="text-xs text-slate-500">{j.client_id ? cname.get(j.client_id) ?? "Cliente" : "Interno"}{j.quantity ? ` · ${j.quantity.toLocaleString("pt-BR")} un.` : ""}</div>
                    {pp.length > 0 && <div className="text-[11px] font-semibold text-slate-600">📄 {pp.filter((x) => x.status === "aprovado").length}/{pp.length} páginas aprovadas</div>}
                    {pg.total > 0 && (
                      <div><div className="mb-1 text-[11px] text-slate-500">{pg.done}/{pg.total} etapas</div><div className="h-1.5 rounded bg-slate-200"><div className="h-1.5 rounded bg-green-500" style={{ width: `${pg.pct}%` }} /></div></div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${isLate ? "font-semibold text-red-700" : "text-slate-500"}`}>{j.due_date ? `${isLate ? "Atrasado · " : "Entrega "}${fmtDiaMes(j.due_date)}` : "Sem prazo"}</span>
                      {next && (
                        <form action={setJobStatus}>
                          <input type="hidden" name="id" value={j.id} /><input type="hidden" name="current" value={j.status} /><input type="hidden" name="advance" value="1" /><input type="hidden" name="back" value="/impressos" />
                          <SubmitButton className="btn btn-ghost !px-2 !py-1 text-xs">Avançar →</SubmitButton>
                        </form>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
