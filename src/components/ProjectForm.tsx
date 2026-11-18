import SubmitButton from "@/components/SubmitButton";
import DateInput from "@/components/DateInput";
import { PROJECT_KINDS, PROJECT_STATUSES, type DevProject } from "@/lib/dev";

export default function ProjectForm({ action, clients, initial, submitLabel = "Salvar projeto" }: {
  action: (fd: FormData) => void | Promise<void>; clients: { id: string; name: string }[]; initial?: DevProject; submitLabel?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2"><label className="label">Nome do projeto</label><input name="name" required defaultValue={initial?.name} className="input" placeholder="Ex.: Sistema de pedidos" /></div>
        <div><label className="label">Tipo</label><select name="kind" defaultValue={initial?.kind ?? "sistema"} className="input">{PROJECT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></div>
        <div><label className="label">Situação</label><select name="status" defaultValue={initial?.status ?? "planejamento"} className="input">{PROJECT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label className="label">Cliente</label>
          <select name="client_id" defaultValue={initial?.client_id ?? ""} className="input"><option value="">Sem cliente / interno</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label">…ou novo cliente</label><input name="new_client" className="input" placeholder="Nome do cliente" /></div>
        <div><label className="label">Início</label><DateInput name="start_date" defaultValue={initial?.start_date} /></div>
        <div><label className="label">Prazo de entrega</label><DateInput name="due_date" defaultValue={initial?.due_date} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Tecnologias</label><input name="stack" defaultValue={initial?.stack ?? ""} className="input" placeholder="Ex.: Next.js, Postgres, Flutter" /></div>
        <div><label className="label">Repositório</label><input name="repo_url" type="url" defaultValue={initial?.repo_url ?? ""} className="input" placeholder="https://github.com/…" /></div>
      </div>
      <div><label className="label">Descrição / escopo</label><textarea name="description" rows={4} defaultValue={initial?.description ?? ""} className="input" placeholder="Objetivo, escopo, premissas, contatos do cliente…" /></div>
      <SubmitButton className="btn btn-accent">{submitLabel}</SubmitButton>
    </form>
  );
}
