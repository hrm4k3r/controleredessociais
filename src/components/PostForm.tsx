"use client";
import { useState } from "react";
import { STATUSES } from "@/lib/constants";

type Props = {
  action: (fd: FormData) => void | Promise<void>;
  clients: { id: string; name: string }[];
  accountsByClient: Record<string, string[]>;
  formats: string[];
  themes: string[];
  today: string;
  initial?: { id?: string; post_date: string; client_id: string; status: string; format: string | null; theme: string | null; summary: string | null; link: string | null; notes: string | null; networks: string[] };
  submitLabel?: string;
  defaultClientId?: string;
};

export default function PostForm({ action, clients, accountsByClient, formats, themes, today, initial, submitLabel = "Salvar post", defaultClientId }: Props) {
  const [clientId, setClientId] = useState(initial?.client_id ?? defaultClientId ?? clients[0]?.id ?? "");
  const [sel, setSel] = useState<string[]>(initial?.networks ?? []);
  const nets = accountsByClient[clientId] ?? [];
  const toggle = (n: string) => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  return (
    <form action={action} className="space-y-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label">Data</label>
          <input type="date" name="post_date" required defaultValue={initial?.post_date ?? today} className="input" />
        </div>
        <div>
          <label className="label">Cliente</label>
          <select name="client_id" value={clientId} onChange={(e) => { setClientId(e.target.value); setSel([]); }} className="input">
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={initial?.status ?? "Planejado"} className="input">
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Formato</label>
          <select name="format" defaultValue={initial?.format ?? ""} className="input">
            <option value="">—</option>
            {formats.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tema</label>
          <select name="theme" defaultValue={initial?.theme ?? ""} className="input">
            <option value="">—</option>
            {themes.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="label">Resumo (o que foi postado)</label>
          <input name="summary" defaultValue={initial?.summary ?? ""} className="input" />
        </div>
      </div>
      <div>
        <span className="label">Redes em que o post saiu</span>
        <div className="flex flex-wrap gap-2">
          {nets.length === 0 && <span className="text-sm text-slate-500">Este cliente não tem contas cadastradas.</span>}
          {nets.map((n) => (
            <label key={n} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${sel.includes(n) ? "border-green-600 bg-green-50 font-semibold text-green-800" : "border-line bg-white"}`}>
              <input type="checkbox" name="net" value={n} checked={sel.includes(n)} onChange={() => toggle(n)} className="h-4 w-4" />
              {n}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">Um post em várias redes conta como 1 para a meta. Só o status “Postado” conta.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Link da postagem</label>
          <input type="url" name="link" defaultValue={initial?.link ?? ""} placeholder="https://" className="input" />
        </div>
        <div>
          <label className="label">Observações</label>
          <input name="notes" defaultValue={initial?.notes ?? ""} className="input" />
        </div>
      </div>
      <button className="btn btn-accent">{submitLabel}</button>
    </form>
  );
}
