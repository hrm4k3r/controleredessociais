import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadMemberNames } from "@/lib/members";
import { ErrorBox, Flash } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import DateInput from "@/components/DateInput";
import MonthNav from "@/components/MonthNav";
import EntryForm from "@/components/EntryForm";
import Author from "@/components/Author";
import { one, ok as okParam } from "@/lib/params";
import { firstOfMonth, fmtDiaMes, isValidISO, monthEnd, todayISO } from "@/lib/dates";
import { brl } from "@/lib/finance";
import { ENTRY_COLS, STATUS_CLS, STATUS_LABEL, statusOf, type Account, type Category, type Entry } from "@/lib/caixa";
import { deleteEntry, reopenEntry, saveEntry, settleEntry } from "../actions";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { dados: "Dados inválidos.", descricao: "Informe a descrição.", valor: "Informe um valor maior que zero.", data: "Data inválida." };

export default async function Lancamentos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();
  const m = one(sp.mes);
  const month = isValidISO(m) ? firstOfMonth(m) : firstOfMonth(today);
  const tipo = one(sp.tipo) ?? "";
  const status = one(sp.status) ?? "";
  const conta = one(sp.conta) ?? "";
  const categoria = one(sp.categoria) ?? "";
  const sb = await createClient();
  const [en, ac, ca, cl, names] = await Promise.all([
    sb.from("fin_entries").select(ENTRY_COLS).gte("due_date", month).lte("due_date", monthEnd(month)).order("due_date").order("created_at"),
    sb.from("fin_accounts").select("id,name,kind,opening_balance,active,sort").order("sort"),
    sb.from("fin_categories").select("id,kind,name,active").order("name"),
    sb.from("clients").select("id,name").eq("active", true).order("name"),
    loadMemberNames(sb),
  ]);
  if (en.error) return <div className="space-y-5"><h1 className="page-title">Lançamentos</h1><div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">Não foi possível carregar. Rode a migração <code>20261118000007_financeiro_caixa.sql</code> no Supabase.</div></div>;
  const accounts = (ac.data ?? []).map((a) => ({ ...a, opening_balance: Number(a.opening_balance) })) as Account[];
  const categories = (ca.data ?? []) as Category[];
  const clients = (cl.data ?? []) as { id: string; name: string }[];
  const all = ((en.data ?? []) as Entry[]).map((e) => ({ ...e, amount: Number(e.amount) }));
  const rows = all.filter((e) => (!tipo || e.kind === tipo) && (!status || statusOf(e, today) === status) && (!conta || e.account_id === conta) && (!categoria || e.category_id === categoria));
  const accName = new Map(accounts.map((a) => [a.id, a.name]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const cliName = new Map(clients.map((c) => [c.id, c.name]));
  const entradas = rows.filter((e) => e.kind === "entrada").reduce((s, e) => s + e.amount, 0);
  const saidas = rows.filter((e) => e.kind === "saida").reduce((s, e) => s + e.amount, 0);
  const keep = { tipo, status, conta, categoria };
  const here = `/caixa/lancamentos?${new URLSearchParams({ mes: month, ...Object.fromEntries(Object.entries(keep).filter(([, v]) => v)) }).toString()}`;
  const erro = one(sp.erro);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Lançamentos</h1>
        <a className="btn btn-ghost" href={`/caixa/exportar?mes=${month}`}>Baixar CSV do mês</a>
      </div>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro ? ERR[erro] : undefined} />

      <details className="card">
        <summary className="cursor-pointer font-semibold text-navy">+ Novo lançamento</summary>
        <div className="mt-4"><EntryForm action={saveEntry} accounts={accounts} categories={categories} clients={clients} back={here} defaultDate={today >= month && today <= monthEnd(month) ? today : month} /></div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <MonthNav path="/caixa/lancamentos" month={month} extra={keep} />
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="mes" value={month} />
          <select name="tipo" defaultValue={tipo} className="input !w-auto" aria-label="Tipo"><option value="">Entradas e saídas</option><option value="entrada">Só entradas</option><option value="saida">Só saídas</option></select>
          <select name="status" defaultValue={status} className="input !w-auto" aria-label="Situação"><option value="">Todas as situações</option><option value="pago">Pagos/recebidos</option><option value="pendente">A vencer</option><option value="atrasado">Atrasados</option></select>
          <select name="conta" defaultValue={conta} className="input !w-auto" aria-label="Conta"><option value="">Todas as contas</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select name="categoria" defaultValue={categoria} className="input !w-auto" aria-label="Categoria"><option value="">Todas as categorias</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button className="btn btn-ghost">Filtrar</button>
        </form>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[1080px]">
          <thead><tr>{["Venc.", "Descrição", "Categoria", "Conta", "Valor", "Situação", "Lançado por", "Ações"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="td text-slate-500" colSpan={8}>Nenhum lançamento neste filtro.</td></tr>}
            {rows.map((e) => {
              const st = statusOf(e, today);
              return (
                <tr key={e.id}>
                  <td className="td whitespace-nowrap">{fmtDiaMes(e.due_date)}</td>
                  <td className="td"><div className="font-medium">{e.description}</div><div className="text-xs text-slate-500">{e.client_id ? cliName.get(e.client_id) : ""}{e.notes ? ` · ${e.notes}` : ""}</div></td>
                  <td className="td text-sm">{e.category_id ? catName.get(e.category_id) : "—"}</td>
                  <td className="td text-sm">{e.account_id ? accName.get(e.account_id) : "—"}</td>
                  <td className={`td whitespace-nowrap tabular-nums font-semibold ${e.kind === "entrada" ? "text-green-700" : "text-red-700"}`}>{e.kind === "entrada" ? "+" : "−"} {brl(e.amount)}</td>
                  <td className="td"><span className={`badge ${STATUS_CLS[st]}`}>{STATUS_LABEL[e.kind][st]}</span>{e.paid_date && <div className="mt-0.5 text-xs text-slate-500">{fmtDiaMes(e.paid_date)}</div>}</td>
                  <td className="td text-xs"><Author name={e.created_by ? names[e.created_by] ?? "Usuário" : null} label="Lançado por" /></td>
                  <td className="td">
                    <div className="flex flex-wrap items-center gap-2">
                      {e.paid_date ? (
                        <form action={reopenEntry}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="back" value={here} /><SubmitButton className="btn btn-ghost" pendingText="…" confirm="Desfazer a baixa deste lançamento?">Estornar</SubmitButton></form>
                      ) : (
                        <form action={settleEntry} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={e.id} /><input type="hidden" name="back" value={here} />
                          <DateInput name="paid_date" className="input !w-32 !py-1" defaultValue={today} ariaLabel="Data da baixa" />
                          <SubmitButton className="btn btn-ghost" pendingText="…">{e.kind === "entrada" ? "Receber" : "Pagar"}</SubmitButton>
                        </form>
                      )}
                      <Link href={`/caixa/lancamentos/${e.id}?back=${encodeURIComponent(here)}`} className="text-sm font-semibold text-navy underline">editar</Link>
                      <form action={deleteEntry}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="back" value={here} /><SubmitButton className="px-1 text-sm text-red-600 hover:underline" pendingText="…" confirm="Excluir este lançamento?">excluir</SubmitButton></form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr>
              <td className="td font-semibold" colSpan={4}>Total do filtro</td>
              <td className="td whitespace-nowrap tabular-nums font-semibold" colSpan={4}>
                <span className="text-green-700">+ {brl(entradas)}</span> · <span className="text-red-700">− {brl(saidas)}</span> · Resultado <span className={entradas - saidas >= 0 ? "text-green-700" : "text-red-700"}>{brl(entradas - saidas)}</span>
              </td>
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
