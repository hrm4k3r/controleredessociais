"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DateInput from "@/components/DateInput";
import { fmtDiaMes, todayISO } from "@/lib/dates";
import Link from "next/link";
import Author from "@/components/Author";
import { positionAt, TASK_COLUMNS, type PostSync, type Task, type TaskStatus } from "@/lib/tasks";
import { carryOver, createTask, deleteTask, moveTask, updateTask } from "@/app/(app)/tarefas/actions";

type ClientOpt = { id: string; name: string };

const hue = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
const byPos = (a: Task, b: Task) => a.position - b.position;

export default function Kanban({ week, initial, clients, nextWeekHref, defaultClientId, names }: {
  week: string; initial: Task[]; clients: ClientOpt[]; nextWeekHref: string; defaultClientId?: string; names: Record<string, string>;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ col: TaskStatus; index: number } | null>(null);
  const [adding, setAdding] = useState<TaskStatus | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; href?: string; warn?: boolean } | null>(null);
  const [busy, start] = useTransition();
  const today = todayISO();
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const col = (id: TaskStatus) => tasks.filter((t) => t.status === id).sort(byPos);
  const fail = (msg: string) => setError(msg);
  /** Aplica o resultado da geração automática de post (cartão concluído -> "Planejado"). */
  function applyPost(id: string, p: PostSync) {
    setTasks((cur) => cur.map((x) => (x.id === id ? { ...x, post_id: p.post_id ?? x.post_id, completed_by: p.completed_by } : x)));
    if (p.state === "created") setNotice({ text: "Post \"Planejado\" criado em Postagens a partir do cartão.", href: `/postagens/${p.post_id}` });
    else if (p.state === "no_client") setNotice({ text: "Cartão concluído sem cliente: nenhum post foi criado. Defina o cliente e salve o cartão para gerar.", warn: true });
  }

  function indexFromPointer(e: React.DragEvent<HTMLElement>): number {
    const cards = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-card]")].filter((el) => el.dataset.card !== dragId);
    return cards.filter((el) => { const r = el.getBoundingClientRect(); return e.clientY > r.top + r.height / 2; }).length;
  }

  function drop(target: TaskStatus, index: number) {
    const t = tasks.find((x) => x.id === dragId);
    setDragId(null); setOver(null);
    if (!t) return;
    const others = col(target).filter((x) => x.id !== t.id);
    const position = positionAt(others.map((x) => x.position), index);
    if (t.status === target && position === t.position) return;
    const snapshot = tasks;
    setTasks(tasks.map((x) => (x.id === t.id ? { ...x, status: target, position } : x)));
    setError(null); setNotice(null);
    start(async () => {
      const r = await moveTask(t.id, target, position);
      if (!r.ok) { setTasks(snapshot); fail(r.error); } else applyPost(t.id, r.post);
    });
  }

  async function add(status: TaskStatus, title: string, client_id: string | null) {
    const position = positionAt(col(status).map((x) => x.position), col(status).length);
    const r = await createTask({ title, client_id, status, week_start: week, position });
    if (!r.ok) return fail(r.error);
    setTasks((cur) => [...cur, r.task]);
    setError(null); setNotice(null);
    applyPost(r.task.id, r.post);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Arraste os cartões entre as colunas. Clique em um cartão para editar. Ao concluir, o cartão vira um post "Planejado" em Postagens.</p>
        <button
          className="btn btn-ghost" disabled={busy}
          onClick={() => {
            if (!window.confirm("Levar os cartões não concluídos desta semana para a próxima?")) return;
            start(async () => { const r = await carryOver(week); if (r.ok) router.push(nextWeekHref); else fail(r.error); });
          }}
        >Levar pendentes para a próxima semana →</button>
      </div>
      {notice && (
        <div role="status" className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-medium ${notice.warn ? "border-yellow-300 bg-yellow-50 text-yellow-800" : "border-green-200 bg-green-50 text-green-800"}`}>
          <span>{notice.text}{notice.href && <> <Link href={notice.href} className="underline">Abrir post</Link></>}</span>
          <button className="px-1" aria-label="Fechar aviso" onClick={() => setNotice(null)}>×</button>
        </div>
      )}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</div>}

      <div className="flex items-start gap-3 overflow-x-auto pb-3">
        {TASK_COLUMNS.map((c) => {
          const list = col(c.id);
          const visible = list.filter((t) => t.id !== dragId);
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
                {list.map((t) => {
                  const showInd = over?.col === c.id && visible[over.index]?.id === t.id;
                  const late = t.due_date && t.status !== "concluido" && t.due_date < today;
                  return (
                    <div key={t.id} className="contents">
                      {showInd && indicator}
                      <article
                        data-card={t.id} draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", t.id); setDragId(t.id); }}
                        onDragEnd={() => { setDragId(null); setOver(null); }}
                        onClick={() => setEditing(t)}
                        className={`cursor-grab rounded-xl border border-line bg-surface p-3 text-sm shadow-sm hover:border-accent active:cursor-grabbing ${dragId === t.id ? "opacity-40" : ""}`}
                        style={t.client_id ? { borderLeft: `4px solid hsl(${hue(clientName.get(t.client_id) ?? t.client_id)} 65% 55%)` } : undefined}
                      >
                        <div className={t.status === "concluido" ? "text-slate-500 line-through" : "font-medium"}>{t.title}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          {t.client_id && <span className="badge bg-slate-100 text-slate-700">{clientName.get(t.client_id) ?? "Cliente"}</span>}
                          {t.due_date && <span className={`badge ${late ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>⏰ {fmtDiaMes(t.due_date)}</span>}
                          {t.notes && <span title="Tem anotações" aria-label="Tem anotações">📝</span>}
                          {t.post_id && <Link href={`/postagens/${t.post_id}`} onClick={(e) => e.stopPropagation()} className="badge bg-blue-100 text-blue-800 hover:underline" draggable={false}>📌 Post planejado</Link>}
                        </div>
                        {(t.created_by || t.completed_by) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                            {t.created_by && <Author name={names[t.created_by] ?? "Usuário"} label="Criado por" />}
                            {t.completed_by && <span className="inline-flex items-center gap-1 text-green-700">✔ <Author name={names[t.completed_by] ?? "Usuário"} label="Concluído por" /></span>}
                          </div>
                        )}
                      </article>
                    </div>
                  );
                })}
                {over?.col === c.id && over.index >= visible.length && indicator}
              </div>

              {adding === c.id ? (
                <AddCard
                  clients={clients} defaultClientId={defaultClientId}
                  onCancel={() => setAdding(null)}
                  onAdd={async (title, cid) => { await add(c.id, title, cid); }}
                />
              ) : (
                <button className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-surface" onClick={() => setAdding(c.id)}>+ Adicionar cartão</button>
              )}
            </section>
          );
        })}
      </div>

      <EditDialog
        task={editing} clients={clients} names={names} onClose={() => setEditing(null)}
        onSave={async (t, v) => {
          const moved = v.status !== t.status;
          const position = moved ? positionAt(col(v.status).filter((x) => x.id !== t.id).map((x) => x.position), col(v.status).filter((x) => x.id !== t.id).length) : undefined;
          const r = await updateTask(t.id, { ...v, position });
          if (!r.ok) return r.error;
          setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, ...v, ...(position != null ? { position } : {}) } : x)));
          setNotice(null);
          applyPost(t.id, r.post);
          return null;
        }}
        onDelete={async (t) => {
          const r = await deleteTask(t.id);
          if (!r.ok) return r.error;
          setTasks((cur) => cur.filter((x) => x.id !== t.id));
          return null;
        }}
      />
    </div>
  );
}

function AddCard({ clients, defaultClientId, onAdd, onCancel }: {
  clients: ClientOpt[]; defaultClientId?: string; onAdd: (title: string, clientId: string | null) => Promise<void>; onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [cid, setCid] = useState(defaultClientId ?? "");
  const [pending, setPending] = useState(false);
  async function submit() {
    if (!title.trim() || pending) return;
    setPending(true);
    await onAdd(title, cid || null);
    setPending(false);
    setTitle("");
  }
  return (
    <div className="mt-2 space-y-2">
      <textarea
        autoFocus rows={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do cartão…" className="input resize-none"
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } if (e.key === "Escape") onCancel(); }}
      />
      <select value={cid} onChange={(e) => setCid(e.target.value)} className="input" aria-label="Cliente">
        <option value="">Sem cliente</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="flex items-center gap-2">
        <button className="btn btn-accent" disabled={pending || !title.trim()} onClick={() => void submit()}>{pending ? "Adicionando…" : "Adicionar"}</button>
        <button className="px-2 text-sm text-slate-600 hover:underline" onClick={onCancel}>Fechar</button>
      </div>
    </div>
  );
}

type Values = { title: string; client_id: string | null; status: TaskStatus; due_date: string | null; notes: string | null };

function EditDialog({ task, clients, names, onClose, onSave, onDelete }: {
  task: Task | null; clients: ClientOpt[]; names: Record<string, string>; onClose: () => void;
  onSave: (t: Task, v: Values) => Promise<string | null>; onDelete: (t: Task) => Promise<string | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (task && !d.open) { setErr(null); d.showModal(); }
    if (!task && d.open) d.close();
  }, [task]);

  return (
    <dialog
      ref={ref} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      className="m-auto w-[min(92vw,32rem)] rounded-2xl border border-line bg-surface p-0 text-slate-800 backdrop:bg-black/50"
    >
      {task && (
        <form
          key={task.id} className="space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setPending(true);
            const msg = await onSave(task, {
              title: String(f.get("title") ?? ""), client_id: String(f.get("client_id") ?? "") || null,
              status: String(f.get("status")) as TaskStatus, due_date: String(f.get("due_date") ?? "") || null,
              notes: String(f.get("notes") ?? "") || null,
            });
            setPending(false);
            if (msg) setErr(msg); else ref.current?.close();
          }}
        >
          <h2 className="text-lg font-bold text-navy">Editar cartão</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {task.created_by && <span className="inline-flex items-center gap-1">Criado por <Author name={names[task.created_by] ?? "Usuário"} /> em {fmtDiaMes(task.created_at.slice(0, 10))}</span>}
            {task.completed_by && <span className="inline-flex items-center gap-1 text-green-700">Concluído por <Author name={names[task.completed_by] ?? "Usuário"} /></span>}
          </div>
          {err && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{err}</div>}
          <div><label className="label">Título</label><input name="title" required defaultValue={task.title} className="input" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Cliente</label>
              <select name="client_id" defaultValue={task.client_id ?? ""} className="input"><option value="">Sem cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Coluna</label>
              <select name="status" defaultValue={task.status} className="input">{TASK_COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          </div>
          <div className="max-w-48"><label className="label">Prazo</label><DateInput name="due_date" defaultValue={task.due_date} /></div>
          <div><label className="label">Anotações</label><textarea name="notes" rows={4} defaultValue={task.notes ?? ""} className="input" placeholder="Briefing, referências, links…" /></div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button" className="btn btn-danger" disabled={pending}
              onClick={async () => { if (!window.confirm("Excluir este cartão?")) return; setPending(true); const msg = await onDelete(task); setPending(false); if (msg) setErr(msg); else ref.current?.close(); }}
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
