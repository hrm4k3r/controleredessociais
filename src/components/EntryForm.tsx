import SubmitButton from "@/components/SubmitButton";
import DateInput from "@/components/DateInput";
import type { Account, Category, Entry } from "@/lib/caixa";

/** Formulário de lançamento (novo ou edição). */
export default function EntryForm({ action, accounts, categories, clients, initial, back, defaultDate, submitLabel = "Lançar" }: {
  action: (fd: FormData) => void | Promise<void>; accounts: Account[]; categories: Category[]; clients: { id: string; name: string }[];
  initial?: Entry; back: string; defaultDate: string; submitLabel?: string;
}) {
  const acc = accounts.filter((a) => a.active || a.id === initial?.account_id);
  const cats = categories.filter((c) => c.active || c.id === initial?.category_id);
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="back" value={back} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label className="label">Tipo</label>
          <select name="kind" defaultValue={initial?.kind ?? "entrada"} className="input"><option value="entrada">⬆ Entrada (receita)</option><option value="saida">⬇ Saída (despesa)</option></select></div>
        <div className="lg:col-span-2"><label className="label">Descrição</label><input name="description" required defaultValue={initial?.description} className="input" placeholder="Ex.: Mensalidade Paradise Sup & Surf" /></div>
        <div><label className="label">Valor (R$)</label><input name="amount" required inputMode="decimal" defaultValue={initial ? String(initial.amount).replace(".", ",") : ""} className="input" placeholder="0,00" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label className="label">Vencimento</label><DateInput name="due_date" required defaultValue={initial?.due_date ?? defaultDate} /></div>
        <div><label className="label">Conta</label>
          <select name="account_id" defaultValue={initial?.account_id ?? acc[0]?.id ?? ""} className="input"><option value="">—</option>{acc.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div><label className="label">Categoria</label>
          <select name="category_id" defaultValue={initial?.category_id ?? ""} className="input">
            <option value="">Sem categoria</option>
            <optgroup label="Entradas">{cats.filter((c) => c.kind === "entrada").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            <optgroup label="Saídas">{cats.filter((c) => c.kind === "saida").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
          </select></div>
        <div><label className="label">Cliente (opcional)</label>
          <select name="client_id" defaultValue={initial?.client_id ?? ""} className="input"><option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <label className="flex items-center gap-2 pb-2 text-sm font-medium"><input type="checkbox" name="paid" defaultChecked={!!initial?.paid_date} className="h-4 w-4" /> Já foi pago/recebido</label>
        <div><label className="label">Data do pagamento</label><DateInput name="paid_date" defaultValue={initial?.paid_date} /></div>
        <div className="sm:col-span-2"><label className="label">Observações</label><input name="notes" defaultValue={initial?.notes ?? ""} className="input" /></div>
      </div>
      {!initial && (
        <div className="grid gap-4 rounded-lg border border-dashed border-line p-3 sm:grid-cols-3">
          <div><label className="label">Repetir por quantos meses?</label><input name="repeat" type="number" min={1} max={60} defaultValue={1} className="input" /></div>
          <div><label className="label">Como repetir</label>
            <select name="repeat_mode" defaultValue="recorrente" className="input"><option value="recorrente">Recorrente: mesmo valor todo mês</option><option value="parcelado">Parcelado: divide o valor total</option></select></div>
          <p className="self-end text-xs text-slate-500">1 = lançamento único. Se marcar &quot;já foi pago&quot;, só a primeira parcela entra como paga.</p>
        </div>
      )}
      <SubmitButton className="btn btn-accent">{submitLabel}</SubmitButton>
    </form>
  );
}
