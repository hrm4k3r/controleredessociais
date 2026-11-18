"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { brl } from "@/lib/finance";
import { fmtData } from "@/lib/dates";
import { parseEntryLines, parseMoney } from "@/lib/import-entries";
import type { Account, Category } from "@/lib/caixa";
import { importEntries, type ImportResult } from "@/app/(financeiro)/caixa/actions";

const SAMPLE = "Itaú\t13/11/2026\tR$ 120,00\tPendente\nVivo Empresarial\t17/11/2026\tR$ 72,50\tPendente\tFatura vencida em 25/10/2026";

export default function ImportEntries({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"saida" | "entrada">("saida");
  const [accountId, setAccountId] = useState(accounts.find((a) => a.active)?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [off, setOff] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const rows = useMemo(() => parseEntryLines(text), [text]);
  const valueOf = (i: number) => (amounts[i] !== undefined ? parseMoney(amounts[i]) : rows[i].amount);
  const usable = (i: number) => !rows[i].error && valueOf(i) != null && !off.has(i);
  const chosen = rows.map((_, i) => i).filter(usable);
  const total = chosen.reduce((s, i) => s + (valueOf(i) ?? 0), 0);
  const cats = categories.filter((c) => c.kind === kind && c.active);

  async function go() {
    setPending(true);
    const r = await importEntries({
      kind, account_id: accountId || null, category_id: categoryId || null,
      rows: chosen.map((i) => ({ description: rows[i].description, due_date: rows[i].due_date!, amount: valueOf(i)!, paid: rows[i].paid, notes: rows[i].notes })),
    });
    setPending(false);
    setResult(r);
    if (r.ok) { setText(""); setAmounts({}); setOff(new Set()); }
  }

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h2 className="font-bold text-navy">1. Cole as linhas da planilha</h2>
        <p className="text-sm text-slate-600">Uma linha por lançamento, na ordem: <b>descrição, vencimento (dd/mm/aaaa), valor, situação</b> e, se quiser, uma observação. Copie direto do Excel ou do Google Planilhas.</p>
        <textarea value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} rows={9} placeholder={SAMPLE} aria-label="Linhas da planilha" className="input font-mono text-xs" />
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold text-navy">2. Como lançar</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">Tipo</label><select value={kind} onChange={(e) => { setKind(e.target.value as "saida" | "entrada"); setCategoryId(""); }} className="input"><option value="saida">⬇ Saídas (despesas)</option><option value="entrada">⬆ Entradas (receitas)</option></select></div>
          <div><label className="label">Conta</label><select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input"><option value="">—</option>{accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div><label className="label">Categoria (todas as linhas)</label><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input"><option value="">Sem categoria</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        </div>
        <p className="text-xs text-slate-500">&quot;Pendente&quot; entra como a pagar/receber; &quot;Pago&quot; entra já baixado na data do vencimento. Lançamentos iguais (mesma descrição, vencimento e valor) que já existem são ignorados.</p>
      </section>

      {rows.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-bold text-navy">3. Confira e importe</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr>{["", "Descrição", "Vencimento", "Valor", "Situação", "Observação"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const v = valueOf(i);
                  const problem = r.error ?? (v == null ? "Informe o valor" : null);
                  return (
                    <tr key={i} className={problem ? "bg-yellow-50/40" : ""}>
                      <td className="td"><input type="checkbox" checked={usable(i)} disabled={!!r.error || v == null} onChange={() => setOff((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} aria-label="Importar esta linha" className="h-4 w-4" /></td>
                      <td className="td font-medium">{r.description}{r.error && <div className="text-xs font-normal text-red-700">{r.error}</div>}</td>
                      <td className="td whitespace-nowrap">{r.due_date ? fmtData(r.due_date) : "—"}</td>
                      <td className="td">
                        {r.amount == null ? <input value={amounts[i] ?? ""} onChange={(e) => setAmounts((a) => ({ ...a, [i]: e.target.value }))} inputMode="decimal" placeholder="Informe o valor" aria-label="Valor" className={`input !w-32 ${amounts[i] !== undefined && v == null ? "!border-red-400" : "!bg-yellow-50"}`} /> : <span className="tabular-nums">{brl(r.amount)}</span>}
                      </td>
                      <td className="td"><span className={`badge ${r.paid ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>{r.paid ? "Pago" : "Pendente"}</span></td>
                      <td className="td text-sm text-slate-600">{r.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm"><b>{chosen.length}</b> de {rows.length} linhas serão importadas · total <b className="tabular-nums">{brl(total)}</b></div>
            <button className="btn btn-accent" disabled={pending || chosen.length === 0} onClick={() => void go()}>{pending ? "Importando…" : `Importar ${chosen.length} lançamento${chosen.length === 1 ? "" : "s"}`}</button>
          </div>
        </section>
      )}

      {result && (result.ok ? (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
          {result.inserted} lançamento(s) importado(s){result.skipped ? `, ${result.skipped} já existia(m) e foi(ram) ignorado(s)` : ""}. <Link href={`/caixa/lancamentos?mes=${result.firstMonth}`} className="underline">Ver lançamentos</Link>
        </div>
      ) : <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{result.error}</div>)}
    </div>
  );
}
