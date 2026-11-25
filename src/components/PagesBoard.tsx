import SubmitButton from "@/components/SubmitButton";
import DateInput from "@/components/DateInput";
import Author from "@/components/Author";
import { fmtData } from "@/lib/dates";
import { brl, fmtPages, PAGE_KINDS, PAGE_SIZES, PAGE_STATUSES, pageKindOf, pagesSummary, sizeLabel, type PrintPage } from "@/lib/impressos";
import { deletePage, savePage, setPageStatus } from "@/app/(impressos)/impressos/actions";

type Person = { id: string; name: string };
const money = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

function PageForm({ jobId, people, initial, today, compact }: { jobId: string; people: Person[]; initial?: PrintPage; today?: string; compact?: boolean }) {
  // compact = dentro do cartão estreito do quadro (duas colunas no máximo); senão, formulário largo.
  const g1 = compact ? "grid grid-cols-1 gap-3 @[19rem]:grid-cols-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";
  const g2 = compact ? "grid grid-cols-1 gap-3 @[19rem]:grid-cols-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-5";
  const g3 = compact ? "grid grid-cols-1 gap-3" : "grid gap-3 sm:grid-cols-4";
  const span2 = compact ? "@[19rem]:col-span-2" : "lg:col-span-2";
  return (
    <div className={compact ? "@container" : undefined}>
    <form action={savePage} className="space-y-3">
      <input type="hidden" name="job_id" value={jobId} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className={g1}>
        <div className={span2}><label className="label">Anunciante / título da página</label><input name="title" required defaultValue={initial?.title} className="input" placeholder="Ex.: Mecânica MM · Matéria: O Rei do Consórcio" /></div>
        <div><label className="label">Tipo</label><select name="kind" defaultValue={initial?.kind ?? "anuncio"} className="input">{PAGE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.icon} {k.label}</option>)}</select></div>
        <div><label className="label">Tamanho</label><select name="size" defaultValue={initial?.size ?? "1"} className="input">{PAGE_SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
      </div>
      <div className={g2}>
        <div><label className="label">Nº da página</label><input name="page_number" type="number" min={1} defaultValue={initial?.page_number ?? ""} className="input" placeholder="Opcional" /></div>
        <div><label className="label">Prazo</label><DateInput name="due_date" defaultValue={initial?.due_date ?? (initial ? null : today)} /></div>
        <div className={compact ? "@[19rem]:col-span-2" : ""}><label className="label">Contratante</label><input name="advertiser" defaultValue={initial?.advertiser ?? ""} className="input" placeholder="Se diferente do título" /></div>
        <div><label className="label">Valor (R$)</label><input name="value" inputMode="decimal" defaultValue={money(initial?.value)} className="input" placeholder="0,00" /></div>
        <div><label className="label">Responsável</label><select name="assignee_id" defaultValue={initial?.assignee_id ?? ""} className="input"><option value="">—</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      </div>
      <div className={g3}>
        <div><label className="label">Situação</label><select name="status" defaultValue={initial?.status ?? "para_fazer"} className="input">{PAGE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
        <div className={compact ? "" : "sm:col-span-3"}><label className="label">Observações</label>{compact ? <textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} className="input" placeholder="Material recebido, pedidos do cliente…" /> : <input name="notes" defaultValue={initial?.notes ?? ""} className="input" placeholder="Material recebido, cores, pedidos do cliente…" />}</div>
      </div>
      <SubmitButton className="btn btn-accent">{initial ? "Salvar página" : "Adicionar página"}</SubmitButton>
    </form>
    </div>
  );
}

/** Quadro de produção das páginas de um trabalho (ex.: cada anunciante de uma revista). */
export default function PagesBoard({ jobId, pages, capacity, people, names }: { jobId: string; pages: PrintPage[]; capacity: number | null; people: Person[]; names: Record<string, string> }) {
  const sum = pagesSummary(pages, capacity);
  const sorted = [...pages].sort((a, b) => (a.page_number ?? 9999) - (b.page_number ?? 9999) || a.position - b.position);
  return (
    <section id="paginas" className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-navy">Páginas e anunciantes</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge bg-slate-100 text-slate-700">{sum.approved}/{sum.total} aprovadas</span>
          <span className="badge bg-blue-100 text-blue-800">{fmtPages(sum.used)}{capacity ? ` de ${capacity}` : ""} pág. ocupadas</span>
          {sum.free != null && sum.free > 0 && <span className="badge bg-yellow-100 text-yellow-800">{fmtPages(sum.free)} pág. livres</span>}
          {sum.value > 0 && <span className="badge bg-green-100 text-green-800">Contratos: {brl(sum.value)}</span>}
        </div>
      </div>
      {sum.total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/impressos/trabalhos/${jobId}/resumo`} className="btn btn-accent">Baixar resumo (PDF)</a>
          <a href={`/impressos/trabalhos/${jobId}/resumo?valores=1`} className="text-xs text-slate-500 underline" title="Uso interno: inclui o valor de cada contrato">com valores dos contratos (uso interno)</a>
          <span className="text-xs text-slate-500">Para enviar ao cliente: mostra a situação de cada página, sem valores.</span>
        </div>
      )}
      {sum.total > 0 && <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-green-500" style={{ width: `${sum.pct}%` }} /></div>}

      <details className="rounded-lg border border-line p-3" open={pages.length === 0}>
        <summary className="cursor-pointer text-sm font-semibold text-navy">+ Adicionar página / anunciante</summary>
        <div className="mt-3"><PageForm jobId={jobId} people={people} /></div>
      </details>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {PAGE_STATUSES.map((col) => {
          const list = sorted.filter((p) => p.status === col.id);
          return (
            <div key={col.id} className="space-y-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-900/40">
              <h3 className="flex items-center justify-between px-1 text-sm font-bold text-navy"><span>{col.label}</span><span className="badge bg-white text-slate-600">{list.length}</span></h3>
              {list.length === 0 && <p className="px-1 py-2 text-xs text-slate-400">Vazio</p>}
              {list.map((p) => {
                const k = pageKindOf(p.kind);
                return (
                  <article key={p.id} className="card space-y-2 !p-3">
                    <div className="flex items-start gap-2">
                      {p.page_number != null && <span className="badge bg-navy text-white">p. {p.page_number}</span>}
                      <div className="min-w-0 flex-1 font-semibold text-navy">{k.icon} {p.title}</div>
                    </div>
                    <div className="text-xs text-slate-500">{sizeLabel(p.size)}{p.advertiser ? ` · ${p.advertiser}` : ""}{p.value != null ? ` · ${brl(p.value)}` : ""}</div>
                    {(p.due_date || p.assignee_id) && <div className="text-xs text-slate-500">{p.due_date ? `Prazo ${fmtData(p.due_date)}` : ""}{p.due_date && p.assignee_id ? " · " : ""}{p.assignee_id ? names[p.assignee_id] ?? "Responsável" : ""}</div>}
                    {p.notes && <p className="text-xs text-slate-600">{p.notes}</p>}
                    {p.status === "aprovado" && p.approved_by && <div className="text-xs text-slate-500"><span className="inline-flex items-center gap-1">Aprovada por <Author name={names[p.approved_by] ?? "Usuário"} /></span></div>}
                    <div className="flex flex-wrap items-center gap-1">
                      <form action={setPageStatus} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={p.id} /><input type="hidden" name="job_id" value={jobId} />
                        <select name="status" defaultValue={p.status} className="input !w-auto !py-1 text-xs" aria-label="Mover para">{PAGE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                        <SubmitButton className="btn btn-ghost !px-2 !py-1 text-xs">Mover</SubmitButton>
                      </form>
                      {p.status !== "aprovado" && (
                        <form action={setPageStatus}>
                          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="job_id" value={jobId} /><input type="hidden" name="advance" value="1" /><input type="hidden" name="current" value={p.status} />
                          <SubmitButton className="btn btn-ghost !px-2 !py-1 text-xs">Avançar →</SubmitButton>
                        </form>
                      )}
                    </div>
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-accent">Editar</summary>
                      <div className="mt-2 space-y-2">
                        <PageForm jobId={jobId} people={people} initial={p} compact />
                        <form action={deletePage}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="job_id" value={jobId} /><SubmitButton className="btn btn-ghost !text-red-700 !py-1 text-xs" confirm="Excluir esta página?">Excluir</SubmitButton></form>
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
