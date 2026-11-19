import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ErrorBox, Flash } from "@/components/ui";
import JobForm from "@/components/JobForm";
import PrintHint from "@/components/PrintHint";
import { one, ok as okParam } from "@/lib/params";
import { fmtData, todayISO } from "@/lib/dates";
import { brl, isLateJob, kindOf, PRINT_KINDS, PRINT_STATUSES, statusOf, type PrintJob } from "@/lib/impressos";
import { saveJob } from "../actions";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { titulo: "Informe o título do trabalho.", dados: "Dados inválidos." };

export default async function Trabalhos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filtro = one(sp.status) ?? "abertos";
  const tipo = one(sp.tipo) ?? "";
  const sb = await createClient();
  const [jr, cr] = await Promise.all([
    sb.from("print_jobs").select("id,client_id,title,kind,status,quantity,due_date,price,cost,delivered_at").order("created_at", { ascending: false }),
    sb.from("clients").select("id,name").eq("active", true).order("name"),
  ]);
  if (jr.error) return <div className="space-y-5"><h1 className="page-title">Trabalhos</h1><PrintHint /></div>;
  const clients = (cr.data ?? []) as { id: string; name: string }[];
  const cname = new Map(clients.map((c) => [c.id, c.name]));
  const all = (jr.data ?? []) as PrintJob[];
  const today = todayISO();
  const list = all.filter((j) => (filtro === "todos" ? true : filtro === "abertos" ? !["entregue", "cancelado"].includes(j.status) : j.status === filtro) && (!tipo || j.kind === tipo));
  const erro = one(sp.erro);

  return (
    <div className="space-y-5">
      <h1 className="page-title">Trabalhos</h1>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro ? ERR[erro] : undefined} />
      <details className="card" open={all.length === 0}>
        <summary className="cursor-pointer font-semibold text-navy">+ Novo trabalho</summary>
        <div className="mt-4"><JobForm action={saveJob} clients={clients} submitLabel="Criar trabalho" /></div>
      </details>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <select name="status" defaultValue={filtro} className="input !w-auto" aria-label="Situação">
          <option value="abertos">Em aberto</option>
          {PRINT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          <option value="todos">Todos</option>
        </select>
        <select name="tipo" defaultValue={tipo} className="input !w-auto" aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {PRINT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <button className="btn btn-ghost">Filtrar</button>
      </form>

      <section className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[720px]">
          <thead><tr>{["Trabalho", "Cliente", "Situação", "Tiragem", "Prazo", "Valor"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {list.length === 0 && <tr><td className="td text-slate-500" colSpan={6}>Nenhum trabalho nesta visão.</td></tr>}
            {list.map((j) => {
              const st = statusOf(j.status);
              const late = isLateJob(j.due_date, j.status, today);
              return (
                <tr key={j.id}>
                  <td className="td"><Link href={`/impressos/trabalhos/${j.id}`} className="font-semibold text-navy underline">{kindOf(j.kind).icon} {j.title}</Link><div className="text-xs text-slate-500">{kindOf(j.kind).label}</div></td>
                  <td className="td">{j.client_id ? cname.get(j.client_id) ?? "Cliente" : "Interno"}</td>
                  <td className="td"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                  <td className="td">{j.quantity ? j.quantity.toLocaleString("pt-BR") : "—"}</td>
                  <td className={`td whitespace-nowrap ${late ? "font-semibold text-red-700" : ""}`}>{j.due_date ? fmtData(j.due_date) : "—"}</td>
                  <td className="td whitespace-nowrap">{brl(j.price)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
