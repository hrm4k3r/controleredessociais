"use client";

import { useState, useTransition } from "react";
import { STATUSES } from "@/lib/constants";
import { updatePostStatus } from "@/app/(app)/postagens/actions";

const CLS: Record<string, string> = {
  Postado: "bg-green-100 text-green-800", "Não postado": "bg-red-100 text-red-800",
  Agendado: "bg-yellow-100 text-yellow-800", Planejado: "bg-blue-100 text-blue-800",
};

/** Troca o status do post direto na listagem (salva ao escolher). */
export default function StatusSelect({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={value} disabled={pending} aria-label="Status do post"
        onChange={(e) => {
          const prev = value;
          const next = e.target.value;
          setValue(next);
          setErr(null);
          start(async () => {
            const r = await updatePostStatus(id, next);
            if (!r.ok) { setValue(prev); setErr(r.error ?? "Erro ao salvar."); }
          });
        }}
        className={`rounded-full border-0 px-2 py-1 text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-60 ${CLS[value] ?? ""}`}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {pending && <span className="spinner text-slate-500" aria-label="Salvando" />}
      {err && <span className="text-xs text-red-600" role="alert">{err}</span>}
    </span>
  );
}
