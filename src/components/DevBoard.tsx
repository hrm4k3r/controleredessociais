"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Author from "@/components/Author";
import DateInput from "@/components/DateInput";
import { fmtDiaMes, todayISO } from "@/lib/dates";
import { DEV_COLUMNS, ITEM_TYPES, PRIORITIES, isLate, priorityOf, typeOf, type DevItem, type ItemStatus } from "@/lib/dev";
import { positionAt } from "@/lib/tasks";
import { createItem, deleteItem, moveItem, updateItem, type ItemInput } from "@/app/(dev)/dev/actions";

type Person = { id: string; name: string };
type Milestone = { id: string; name: string };

const byPos = (a: DevItem, b: DevItem) => a.position - b.position;
const EMPTY: ItemInput = { title: "", description: null, type: "tarefa", status: "backlog", priority: "media", assignee_id: null, milestone_id: null, estimate_hours: null, due_date: null };

export default function DevBoard({ projectId, initial, people, milestones, names, meId }: {
  projectId: string; initial: DevItem[]; people: Person[]; milestones: Milestone[]; names: Record<string, string>; meId: string;
}) {
  const [items, setItems] = useState<DevItem[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ col: ItemStatus; index: number } | null>(null);
  const [adding, setAdding] = useState<ItemStatus | null>(null);
  const [editing, setEditing] = useState<DevItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [q, setQ] = useState("");
  const [, start] = useTransition();
  const today = todayISO();
  const msName = new Map(milestones.map((m) => [m.id, m.name]));
  const matches = (i: DevItem) => (!onlyMine || i.assignee_id === meId) && (!q.trim() || i.title.toLowerCase().includes(q.trim().toLowerCase()));
  const col = (id: ItemStatus) => items.filter((i) => i.status === id).sort(byPos);
  const nameOf = (id: string | null) => (id ? names[id] ?? "Usuário" : null);

  function indexFromPointer(e: React.DragEvent<HTMLElement>): number {
    const cards = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-card]")].filter((el) => el.dataset.card !== dragId);
    return cards.filter((el) => { const r = el.getBoundingClientRect(); return e.clientY > r.top + r.height / 2; }).length;
  }

  function drop(target: ItemStatus, index: number) {
    const it = items.find((x) => x.id === dragId);
    setDragId(null); setOver(null);
    if (!it) return;
    const others = col(target).filter((x) => x.id !== it.id);
    const position = positionAt(others.map((x) => x.position), index);
    if (it.status === target && position === it.position) return;
    const snapshot = items;
    setItems(items.map((x) => (x.id === it.id ? { ...x, status: target, position } : x)));
    setError(null);
    start(async () => {
      const r = await moveItem(it.id, target, position);
      if (!r.ok) { setItems(snapshot); setError(r.error); return; }
      setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, completed_by: r.completed_by } : x)));
    });
  }

  async function add(status: ItemStatus, input: ItemInput) {
    const position = positionAt(col(status).map((x) => x.position), col(status).length);
    const r = await createItem(projectId, { ...input, status }, position);
    if (!r.ok) { setError(r.error); return; }
    setItems((cur) => [...cur, r.item]);
    setError(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no quadro…" aria-label="Buscar no quadro" className="input !w-56" />
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="h-4 w-4" /> Só os meus</label>
        <span className="text-xs text-slate-500">Arraste os cartões entre as colunas; clique para editar.</span>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</div>}

      <div className="flex items-start gap-3 overflow-x-auto pb-3">
        {DEV_COLUMNS.map((c) => {
          const list = col(c.id).filter(matches);
          const visible = list.filter((i) => i.id !== dragId);
          const indicator = <div key="ind" className="h-1.5 rounded-full bg-accent" />;
          return (
            <section
              key={c.id}
              className={`w-72 shrink-0 rounded-2xl bg-slate-100 p-2 ${over?.col === c.id ? "ring-2 ring-orange-300" : ""}`}
              onDragOver={(e) => { if (!dragId) return; e.preventDefault(); const i = indexFromPointer(e); if (over?.col !== c.id || over.index !== i) setOver({ col: c.id, index: i }); }}
              onDrop={(e) => { e.preventDefault(); drop(c.id, over?.col === c.id ? over.index : visible.length); }}
            >
              <h2 className="flex items-center justify-between px-2 py-1 text-sm font-bold text-navy">
                {c.label}<span className="rounded-full bg-surface px-2 text-xs font-semibold text-slate-600">{list.length}</span>
              </h2>
              <div className="flex min-h-10 flex-col gap-2">
                {list.map((it) => {
                  const showInd = over?.col === c.id && visible[over.index]?.id === it.id;
                  const t = typeOf(it.type);
                  const pr = priorityOf(it.priority);
                  const late = isLate(it.due_date, it.status, today);
                  return (
                    <div key={it.id} className="contents">
                      {showInd && indicator}
                      <article
                        data-card={it.id} draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", it.id); setDragId(it.id); }}
                        onDragEnd={() => { setDragId(null); setOver(null); }}
                        onClick={() => setEditing(it)}
                        className={`cursor-grab rounded-xl border border-line bg-surface p-3 text-sm shadow-sm hover:border-accent active:cursor-grabbing ${dragId === it.id ? "opacity-40" : ""} ${it.type === "bug" ? "border-l-4 !border-l-red-500" : ""}`}
                      >
                        <div className={it.status === "concluido" ? "text-slate-500 line-through" : "font-medium"}><span aria-label={t.label} title={t.label}>{t.icon}</span> {it.title}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className={`badge ${pr.cls}`}>{pr.label}</span>
                          {it.due_date && <span className={`badge ${late ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>⏰ {fmtDiaMes(it.due_date)}</span>}
                          {it.estimate_hours != null && <span className="badge bg-slate-100 text-slate-700">⏱ {String(it.estimate_hours).replace(".", ",")}h</span>}
                          {it.milestone_id && <span className="badge bg-slate-100 text-slate-700" title="Marco de entrega">🏁 {msName.get(it.milestone_id) ?? "Marco"}</span>}
                          {it.description && <span title="Tem descrição" aria-label="Tem descrição">📝</span>}
                        </div>
                        <div className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                          {it.assignee_id && <Author name={nameOf(it.assignee_id)} label="Responsável" className="font-medium" />}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                            {it.created_by && <Author name={nameOf(it.created_by)} label="Criado por" />}
                            {it.completed_by && <span className="inline-flex items-center gap-1 text-green-700">✔ <Author name={nameOf(it.completed_by)} label="Concluído por" /></span>}
                          </div>
                        </div>
                      </article>
                    </div>
                  );
                })}
                {over?.col === c.id && over.index >= visible.length && indicator}
              </div>

              {adding === c.id ? (
                <AddItem onCancel={() => setAdding(null)} onAdd={(input) => add(c.id, input)} />
              ) : (
                <button className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-surface" onClick={() => setAdding(c.id)}>+ Adicionar item</button>
              )}
            </section>
          );
        })}
      </div>

      <EditDialog
        item={editing} people={people} milestones={milestones} names={names} onClose={() => setEditing(null)}
        onSave={async (it, v) => {
          const moved = v.status !== it.status;
          const others = col(v.status as ItemStatus).filter((x) => x.id !== it.id);
          const position = moved ? positionAt(others.map((x) => x.position), others.length) : undefined;
          const r = await updateItem(it.id, v, position);
          if (!r.ok) return r.error;
          setItems((cur) => cur.map((x) => (x.id === it.id ? r.item : x)));
          return null;
        }}
        onDelete={async (it) => {
          const r = await deleteItem(it.id);
          if (!r.ok) return r.error;
          setItems((cur) => cur.filter((x) => x.id !== it.id));
          return null;
        }}
      />
    </div>
  );
}

function AddItem({ onAdd, onCancel }: { onAdd: (input: ItemInput) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("tarefa");
  const [priority, setPriority] = useState("media");
  const [pending, setPending] = useState(false);
  async function submit() {
    if (!title.trim() || pending) return;
    setPending(true);
    await onAdd({ ...EMPTY, title, type, priority });
    setPending(false);
    setTitle("");
  }
  return (
    <div className="mt-2 space-y-2">
      <textarea
        autoFocus rows={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" className="input resize-none"
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } if (e.key === "Escape") onCancel(); }}
      />
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="input" aria-label="Tipo">{ITEM_TYPES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input" aria-label="Prioridade">{PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-accent" disabled={pending || !title.trim()} onClick={() => void submit()}>{pending ? "Adicionando…" : "Adicionar"}</button>
        <button className="px-2 text-sm text-slate-600 hover:underline" onClick={onCancel}>Fechar</button>
      </div>
    </div>
  );
}

function EditDialog({ item, people, milestones, names, onClose, onSave, onDelete }: {
  item: DevItem | null; people: Person[]; milestones: Milestone[]; names: Record<string, string>; onClose: () => void;
  onSave: (it: DevItem, v: ItemInput) => Promise<string | null>; onDelete: (it: DevItem) => Promise<string | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) { setErr(null); d.showModal(); }
    if (!item && d.open) d.close();
  }, [item]);

  return (
    <dialog
      ref={ref} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      className="m-auto w-[min(94vw,36rem)] rounded-2xl border border-line bg-surface p-0 text-slate-800 backdrop:bg-black/50"
    >
      {item && (
        <form
          key={item.id} className="space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const est = String(f.get("estimate") ?? "").trim().replace(",", ".");
            setPending(true);
            const msg = await onSave(item, {
              title: String(f.get("title") ?? ""), description: String(f.get("description") ?? "") || null,
              type: String(f.get("type")), status: String(f.get("status")), priority: String(f.get("priority")),
              assignee_id: String(f.get("assignee") ?? "") || null, milestone_id: String(f.get("milestone") ?? "") || null,
              estimate_hours: est === "" ? null : Number(est), due_date: String(f.get("due_date") ?? "") || null,
            });
            setPending(false);
            if (msg) setErr(msg); else ref.current?.close();
          }}
        >
          <h2 className="text-lg font-bold text-navy">Editar item</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {item.created_by && <span className="inline-flex items-center gap-1">Criado por <Author name={names[item.created_by] ?? "Usuário"} /> em {fmtDiaMes(item.created_at.slice(0, 10))}</span>}
            {item.completed_by && <span className="inline-flex items-center gap-1 text-green-700">Concluído por <Author name={names[item.completed_by] ?? "Usuário"} /></span>}
          </div>
          {err && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{err}</div>}
          <div><label className="label">Título</label><input name="title" required defaultValue={item.title} className="input" /></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label">Tipo</label><select name="type" defaultValue={item.type} className="input">{ITEM_TYPES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select></div>
            <div><label className="label">Prioridade</label><select name="priority" defaultValue={item.priority} className="input">{PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
            <div><label className="label">Coluna</label><select name="status" defaultValue={item.status} className="input">{DEV_COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Responsável</label>
              <select name="assignee" defaultValue={item.assignee_id ?? ""} className="input"><option value="">Ninguém</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label">Marco de entrega</label>
              <select name="milestone" defaultValue={item.milestone_id ?? ""} className="input"><option value="">Nenhum</option>{milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Prazo</label><DateInput name="due_date" defaultValue={item.due_date} /></div>
            <div><label className="label">Estimativa (horas)</label><input name="estimate" inputMode="decimal" defaultValue={item.estimate_hours ?? ""} className="input" placeholder="ex.: 4" /></div>
          </div>
          <div><label className="label">Descrição</label><textarea name="description" rows={5} defaultValue={item.description ?? ""} className="input" placeholder="Requisitos, critérios de aceite, passos para reproduzir o bug, links…" /></div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button" className="btn btn-danger" disabled={pending}
              onClick={async () => { if (!window.confirm("Excluir este item?")) return; setPending(true); const msg = await onDelete(item); setPending(false); if (msg) setErr(msg); else ref.current?.close(); }}
            >Excluir</button>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>Cancelar</button>
              <button className="btn btn-accent" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        </form>
      )}
    </dialog>
  );
}
