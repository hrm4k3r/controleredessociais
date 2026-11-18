import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MonthNav from "@/components/MonthNav";
import { one } from "@/lib/params";
import { addMonths, firstOfMonth, fmtDiaMes, fmtMes, isValidISO, todayISO } from "@/lib/dates";
import { brl } from "@/lib/finance";
import { loadFinance } from "@/lib/finance-data";
import { loadAccounts } from "@/lib/caixa-server";
import {
  CONTRACT_CATEGORY, CONTRACT_CATEGORY_LABEL, ENTRY_COLS, balances, byCategory, contractAccountId, contractEntries, forecast, monthlySeries, pending, realized, statusOf,
  type Category, type Entry,
} from "@/lib/caixa";

export const dynamic = "force-dynamic";

export default async function CaixaPainel({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();
  const m = one(sp.mes);
  const month = isValidISO(m) ? firstOfMonth(m) : firstOfMonth(today);
  const sb = await createClient();
  const [en, accounts, ca, fin] = await Promise.all([
    sb.from("fin_entries").select(ENTRY_COLS).limit(50000),
    loadAccounts(sb),
    sb.from("fin_categories").select("id,kind,name,active"),
    loadFinance(sb),
  ]);
  if (en.error) return <div className="space-y-5"><h1 className="page-title">Fluxo de caixa</h1><div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">Não foi possível carregar. Rode a migração <code>20261118000007_financeiro_caixa.sql</code> no Supabase.</div></div>;
  const contracts = contractEntries(fin.clients, fin.payments, today, contractAccountId(accounts));
  const entries: Entry[] = [...((en.data ?? []) as Entry[]).map((e) => ({ ...e, amount: Number(e.amount) })), ...contracts];
  const catName = new Map<string | null, string>([...((ca.data ?? []) as Category[]).map((c) => [c.id, c.name] as [string, string]), [CONTRACT_CATEGORY, CONTRACT_CATEGORY_LABEL]]);
  const cReal = realized(contracts, month), cPrev = forecast(contracts, month), cPend = pending(contracts, "entrada", today);
  const bal = balances(accounts, entries, today);
  const totalBalance = [...bal.entries()].filter(([id]) => accounts.find((a) => a.id === id)?.active).reduce((s, [, v]) => s + v, 0);
  const real = realized(entries, month);
  const prev = forecast(entries, month);
  const receber = pending(entries, "entrada", today);
  const pagar = pending(entries, "saida", today);
  const series = monthlySeries(entries, month, 6);
  const maxSerie = Math.max(1, ...series.flatMap((s) => [s.entradas, s.saidas]));
  const upcoming = entries.filter((e) => !e.paid_date).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 8);

  const Card = ({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) => (
    <div className="card"><div className="label">{label}</div><div className={`text-2xl font-extrabold tabular-nums ${tone ?? "text-navy"}`}>{value}</div>{sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}</div>
  );
  const Bars = ({ title, kind, color }: { title: string; kind: "entrada" | "saida"; color: string }) => {
    const rows = byCategory(entries, kind, month);
    const max = Math.max(1, ...rows.map((r) => r.total));
    return (
      <div className="card"><h3 className="mb-3 font-bold text-navy">{title}</h3>
        {rows.length === 0 && <p className="text-sm text-slate-500">Sem movimentações realizadas neste mês.</p>}
        <div className="space-y-2">{rows.map((r) => (
          <div key={r.id ?? "none"} className="text-sm">
            <div className="mb-0.5 flex justify-between"><span className="truncate pr-2">{r.id ? catName.get(r.id) ?? "Categoria" : "Sem categoria"}</span><span className="font-semibold tabular-nums">{brl(r.total)}</span></div>
            <div className="h-2.5 rounded bg-slate-100"><div className={`h-2.5 rounded ${color}`} style={{ width: `${(r.total / max) * 100}%` }} /></div>
          </div>
        ))}</div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Fluxo de caixa</h1>
        <MonthNav path="/caixa" month={month} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Saldo atual (contas ativas)" value={brl(totalBalance)} tone={totalBalance < 0 ? "text-red-600" : undefined} sub="Saldo inicial + recebido − pago até hoje" />
        <Card label={`Entradas em ${fmtMes(month)}`} value={brl(real.entradas)} tone="text-green-700" sub={`Previsto: ${brl(prev.entradas)}`} />
        <Card label={`Saídas em ${fmtMes(month)}`} value={brl(real.saidas)} tone="text-red-600" sub={`Previsto: ${brl(prev.saidas)}`} />
        <Card label="Resultado do mês" value={brl(real.resultado)} tone={real.resultado < 0 ? "text-red-600" : "text-green-700"} sub={`Previsto: ${brl(prev.resultado)}`} />
      </div>

      <Link href={`/caixa/contratos?mes=${month}`} className="card block hover:border-accent">
        <div className="label">Contratos (mensalidades) — {fmtMes(month)}</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="text-2xl font-extrabold tabular-nums text-green-700">{brl(cReal.entradas)}</span>
          <span className="text-sm text-slate-600">recebido de {brl(cPrev.entradas)} previstos · {brl(cPend.overdue)} em atraso (todos os meses)</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">As mensalidades entram nas entradas, no saldo e nos gráficos abaixo. Clique para dar baixa nos contratos.</div>
      </Link>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/caixa/lancamentos?tipo=entrada&status=atrasado" className="card block hover:border-accent"><div className="label">A receber (total)</div><div className="text-2xl font-extrabold tabular-nums text-navy">{brl(receber.total)}</div><div className={`mt-1 text-xs ${receber.overdue ? "font-semibold text-red-700" : "text-slate-500"}`}>{receber.overdue ? `${brl(receber.overdue)} em atraso` : "Nada em atraso"}</div></Link>
        <Link href="/caixa/lancamentos?tipo=saida&status=atrasado" className="card block hover:border-accent"><div className="label">A pagar (total)</div><div className="text-2xl font-extrabold tabular-nums text-navy">{brl(pagar.total)}</div><div className={`mt-1 text-xs ${pagar.overdue ? "font-semibold text-red-700" : "text-slate-500"}`}>{pagar.overdue ? `${brl(pagar.overdue)} vencido` : "Nada vencido"}</div></Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-bold text-navy">Últimos 6 meses (realizado)</h3>
          <div className="flex h-44 items-end gap-3">
            {series.map((s) => (
              <div key={s.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-36 w-full items-end justify-center gap-1">
                  <div className="w-1/2 rounded-t bg-green-500" style={{ height: `${(s.entradas / maxSerie) * 100}%` }} title={`Entradas ${brl(s.entradas)}`} />
                  <div className="w-1/2 rounded-t bg-red-400" style={{ height: `${(s.saidas / maxSerie) * 100}%` }} title={`Saídas ${brl(s.saidas)}`} />
                </div>
                <div className="text-xs capitalize text-slate-600">{fmtMes(s.month).split(" ")[0].slice(0, 3)}</div>
                <div className={`text-[11px] tabular-nums ${s.resultado < 0 ? "text-red-600" : "text-slate-500"}`}>{brl(s.resultado)}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-slate-500"><span><span className="mr-1 inline-block h-2 w-2 rounded bg-green-500" />Entradas</span><span><span className="mr-1 inline-block h-2 w-2 rounded bg-red-400" />Saídas</span></div>
        </div>

        <div className="card">
          <h3 className="mb-3 font-bold text-navy">Saldo por conta</h3>
          <ul className="space-y-2 text-sm">
            {accounts.length === 0 && <li className="text-slate-500">Nenhuma conta.</li>}
            {accounts.map((a) => (
              <li key={a.id} className={`flex justify-between ${a.active ? "" : "opacity-50"}`}><span>{a.name}{a.active ? "" : " (inativa)"}</span><span className={`font-semibold tabular-nums ${(bal.get(a.id) ?? 0) < 0 ? "text-red-600" : ""}`}>{brl(bal.get(a.id) ?? 0)}</span></li>
            ))}
          </ul>
          <Link href="/caixa/cadastros" className="mt-3 inline-block text-sm text-accent underline">Gerenciar contas e saldos iniciais</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2"><Bars title={`Entradas por categoria — ${fmtMes(month)}`} kind="entrada" color="bg-green-500" /><Bars title={`Saídas por categoria — ${fmtMes(month)}`} kind="saida" color="bg-red-400" /></div>

      <div className="card space-y-2">
        <h3 className="font-bold text-navy">Próximos vencimentos</h3>
        {upcoming.length === 0 && <p className="text-sm text-slate-500">Nada pendente.</p>}
        <ul className="divide-y divide-line text-sm">
          {upcoming.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2">
              <span><span className={statusOf(e, today) === "atrasado" ? "font-semibold text-red-700" : "text-slate-500"}>{fmtDiaMes(e.due_date)}</span> · {e.description}</span>
              <span className={`tabular-nums font-semibold ${e.kind === "entrada" ? "text-green-700" : "text-red-700"}`}>{e.kind === "entrada" ? "+" : "−"} {brl(e.amount)}</span>
            </li>
          ))}
        </ul>
        <Link href={`/caixa/lancamentos?mes=${addMonths(month, 0)}`} className="inline-block text-sm text-accent underline">Ver todos os lançamentos do mês</Link>
      </div>
    </div>
  );
}
