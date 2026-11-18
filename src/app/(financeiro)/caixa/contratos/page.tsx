import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "@/lib/access";
import DateInput from "@/components/DateInput";
import { addMonths, firstOfMonth, fmtData, fmtMes, isValidISO, todayISO } from "@/lib/dates";
import { one, ok as okParam } from "@/lib/params";
import { brl } from "@/lib/finance";
import { Flash } from "@/components/ui";
import { inputFor, loadFinance, paymentStatus, summaryFor } from "@/lib/finance-data";
import { saveFinanceCadastro, savePayments } from "./actions";

export const dynamic = "force-dynamic";

const ST: Record<string, string> = {
  Pago: "bg-green-100 text-green-800", "Pago com atraso": "bg-yellow-100 text-yellow-800", Atrasado: "bg-red-100 text-red-800",
  Parcial: "bg-orange-100 text-orange-800", "A vencer": "bg-blue-100 text-blue-800", "Sem cadastro": "bg-slate-100 text-slate-600",
};

export default async function Financeiro({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();
  const m = one(sp.mes);
  const mes = isValidISO(m) ? firstOfMonth(m) : firstOfMonth(today);
  const sb = await createClient();
  await requireFinance(sb);
  const { clients, payments } = await loadFinance(sb);
  const totalMensal = clients.reduce((s, c) => s + c.monthly_amount, 0);
  const summaries = clients.map((c) => ({ c, s: summaryFor(c, payments, today) }));
  const inad = summaries.filter((x) => x.s.situation === "INADIMPLENTE").length;
  const totalAtraso = summaries.reduce((s, x) => s + x.s.overdueAmount, 0);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Contratos (mensalidades)</h1>
      <Flash ok={okParam(sp)} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><div className="label">Total mensal</div><div className="text-2xl font-bold text-navy">{brl(totalMensal)}</div></div>
        <div className="card"><div className="label">Inadimplentes</div><div className={`text-2xl font-bold ${inad ? "text-red-600" : "text-green-700"}`}>{inad}</div></div>
        <div className="card"><div className="label">Valor em atraso</div><div className="text-2xl font-bold text-navy">{brl(totalAtraso)}</div></div>
      </div>

      <section className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[760px]">
          <thead><tr>{["Cliente", "Valor mensal", "Vencimento (dia)", "Situação", "Parcelas em atraso", "Valor em atraso", "Último pagamento"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {summaries.map(({ c, s }) => (
              <tr key={c.id}>
                <td className="td font-semibold">{c.name}</td>
                <td className="td num">{brl(c.monthly_amount)}</td>
                <td className="td num">{c.due_day}</td>
                <td className="td"><span className={`badge ${s.situation === "INADIMPLENTE" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>{s.situation}</span></td>
                <td className="td num">{s.overdueCount}</td>
                <td className="td num">{brl(s.overdueAmount)}</td>
                <td className="td">{s.lastPayment ? fmtData(s.lastPayment) : "—"}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold"><td className="td">TOTAL</td><td className="td num">{brl(totalMensal)}</td><td className="td" /><td className="td">{inad} inadimplente(s)</td><td className="td num">{summaries.reduce((s, x) => s + x.s.overdueCount, 0)}</td><td className="td num">{brl(totalAtraso)}</td><td className="td" /></tr>
          </tbody>
        </table>
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-bold text-navy">Controle mensal — {fmtMes(mes)}</h2>
          <Link href={`/caixa/contratos?mes=${addMonths(mes, -1)}`} className="btn btn-ghost" aria-label="Mês anterior">←</Link>
          <Link href={`/caixa/contratos?mes=${addMonths(mes, 1)}`} className="btn btn-ghost" aria-label="Próximo mês">→</Link>
          <Link href="/caixa/contratos" className="btn btn-ghost">Mês atual</Link>
        </div>
        <p className="text-sm text-slate-600">Lance a data e o valor pago. Só a data (sem valor) registra pagamento integral. Nada é lançado automaticamente: confirme cada cliente aqui.</p>
        <form action={savePayments} className="space-y-3">
          <input type="hidden" name="mes" value={mes} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead><tr>{["Cliente", "Vencimento", "Valor devido", "Data do pagamento", "Valor pago (R$)", "Situação", "Observações"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {clients.map((c) => {
                  const pay = payments.find((p) => p.client_id === c.id && p.ref_month === mes);
                  const inp = inputFor(c, mes, pay, today);
                  const st = paymentStatus(inp);
                  return (
                    <tr key={c.id}>
                      <td className="td font-medium"><input type="hidden" name="id" value={c.id} />{c.name}</td>
                      <td className="td whitespace-nowrap">{fmtData(inp.due)}</td>
                      <td className="td num">{brl(inp.amountDue)}</td>
                      <td className="td"><DateInput name={`data|${c.id}`} defaultValue={pay?.paid_date ?? ""} className="input !w-40 !bg-yellow-50" /></td>
                      <td className="td"><input name={`pago|${c.id}`} inputMode="decimal" defaultValue={pay?.paid_amount != null ? String(pay.paid_amount).replace(".", ",") : ""} className="input !w-32 !bg-yellow-50 text-right" /></td>
                      <td className="td"><span className={`badge ${ST[st]}`}>{st}</span></td>
                      <td className="td"><input name={`obs|${c.id}`} defaultValue={pay?.notes ?? ""} className="input !min-w-48 !bg-yellow-50" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <SubmitButton className="btn btn-accent">Salvar pagamentos de {fmtMes(mes)}</SubmitButton>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold text-navy">Cadastro: valor mensal e dia de vencimento</h2>
        <form action={saveFinanceCadastro} className="space-y-2">
          <input type="hidden" name="mes" value={mes} />
          {clients.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_8rem_6rem] items-end gap-3 sm:grid-cols-[16rem_9rem_7rem]">
              <input type="hidden" name="id" value={c.id} />
              <div><label className="label">Cliente</label><div className="py-2 font-medium">{c.name}</div></div>
              <div><label className="label">Valor (R$)</label><input name={`valor|${c.id}`} inputMode="decimal" defaultValue={String(c.monthly_amount).replace(".", ",")} className="input !bg-yellow-50" /></div>
              <div><label className="label">Dia (1–31)</label><input name={`dia|${c.id}`} type="number" min={1} max={31} defaultValue={c.due_day} className="input !bg-yellow-50" /></div>
            </div>
          ))}
          <p className="text-xs text-slate-500">Se o dia não existe no mês (ex.: 31 em fevereiro), vale o último dia do mês. A Rixxer (conta própria) não entra no financeiro. Alterar o valor vale para meses ainda sem pagamento lançado.</p>
          <SubmitButton className="btn">Salvar cadastro</SubmitButton>
        </form>
      </section>
    </div>
  );
}
