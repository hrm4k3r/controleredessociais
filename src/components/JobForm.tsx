import SubmitButton from "@/components/SubmitButton";
import DateInput from "@/components/DateInput";
import { PRINT_KINDS, PRINT_STATUSES, type PrintJob } from "@/lib/impressos";

const money = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

export default function JobForm({ action, clients, initial, submitLabel = "Salvar trabalho" }: {
  action: (fd: FormData) => void | Promise<void>; clients: { id: string; name: string }[]; initial?: PrintJob; submitLabel?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2"><label className="label">Título do trabalho</label><input name="title" required defaultValue={initial?.title} className="input" placeholder="Ex.: Revista Edição 12 · Cartões João Silva" /></div>
        <div><label className="label">Tipo</label><select name="kind" defaultValue={initial?.kind ?? "outro"} className="input">{PRINT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.icon} {k.label}</option>)}</select></div>
        <div><label className="label">Situação</label><select name="status" defaultValue={initial?.status ?? "briefing"} className="input">{PRINT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label className="label">Cliente</label>
          <select name="client_id" defaultValue={initial?.client_id ?? ""} className="input"><option value="">Sem cliente / interno</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label">…ou novo cliente</label><input name="new_client" className="input" placeholder="Nome do cliente" /></div>
        <div><label className="label">Prazo de entrega</label><DateInput name="due_date" defaultValue={initial?.due_date} /></div>
        <div><label className="label">Gráfica / fornecedor</label><input name="supplier" defaultValue={initial?.supplier ?? ""} className="input" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div><label className="label">Tiragem (qtd.)</label><input name="quantity" type="number" min={1} defaultValue={initial?.quantity ?? ""} className="input" placeholder="Ex.: 1000" /></div>
        <div><label className="label">Páginas</label><input name="pages" type="number" min={1} defaultValue={initial?.pages ?? ""} className="input" placeholder="Revistas/catálogos" /></div>
        <div><label className="label">Formato final</label><input name="size" defaultValue={initial?.size ?? ""} className="input" placeholder="21x28 cm · 9x5 cm" /></div>
        <div><label className="label">Cores</label><input name="colors" defaultValue={initial?.colors ?? ""} className="input" placeholder="4x4 · 4x0 · P&B" /></div>
        <div><label className="label">Papel</label><input name="paper" defaultValue={initial?.paper ?? ""} className="input" placeholder="Couchê 90g · 250g" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label">Acabamento</label><input name="finish" defaultValue={initial?.finish ?? ""} className="input" placeholder="Laminação fosca, verniz, grampo…" /></div>
        <div><label className="label">Custo (R$)</label><input name="cost" inputMode="decimal" defaultValue={money(initial?.cost)} className="input" placeholder="0,00" /></div>
        <div><label className="label">Valor cobrado (R$)</label><input name="price" inputMode="decimal" defaultValue={money(initial?.price)} className="input" placeholder="0,00" /></div>
      </div>
      <div><label className="label">Observações / briefing</label><textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className="input" /></div>
      {!initial && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="steps" value="1" defaultChecked className="h-4 w-4" /> Criar as etapas padrão do tipo escolhido (você pode editar depois)</label>
      )}
      <SubmitButton className="btn btn-accent">{submitLabel}</SubmitButton>
    </form>
  );
}
