import Link from "next/link";
import type { GoalLevel, Verdict } from "@/lib/constants";
import { addDays, fmtPeriodo } from "@/lib/dates";

export function Flash({ ok, text = "Salvo com sucesso." }: { ok?: boolean; text?: string }) {
  if (!ok) return null;
  return <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">{text}</div>;
}

export function ErrorBox({ text }: { text?: string }) {
  if (!text) return null;
  return <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{text}</div>;
}

/** Barra de semana: anterior / próxima / seletor de data. `extra` = parâmetros mantidos (ex.: cliente). */
export function WeekBar({ path, week, extra = {} }: { path: string; week: string; extra?: Record<string, string | undefined> }) {
  const href = (w: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
    q.set("semana", w);
    return `${path}?${q.toString()}`;
  };
  return (
    <form method="get" action={path} className="flex flex-wrap items-center gap-2">
      {Object.entries(extra).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <Link href={href(addDays(week, -7))} className="btn btn-ghost" aria-label="Semana anterior">←</Link>
      <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-navy">Semana {fmtPeriodo(week)}</div>
      <Link href={href(addDays(week, 7))} className="btn btn-ghost" aria-label="Próxima semana">→</Link>
      <input type="date" name="semana" defaultValue={week} className="input !w-auto" aria-label="Ir para a semana da data" />
      <button className="btn btn-ghost">Ir</button>
    </form>
  );
}

const LEVEL: Record<GoalLevel, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  none: "bg-slate-100 text-slate-600",
};
export const levelClass = (l: GoalLevel) => LEVEL[l];

const VERDICT: Record<Verdict, string> = {
  Repetir: "bg-green-100 text-green-800",
  Adaptar: "bg-red-100 text-red-800",
  "Na média": "bg-slate-200 text-slate-700",
  "Poucos dados": "bg-yellow-50 text-yellow-800",
};
export const VerdictBadge = ({ v }: { v: Verdict | null }) => (v ? <span className={`badge ${VERDICT[v]}`}>{v}</span> : <span className="text-slate-400">—</span>);

export const pct = (v: number | null | undefined, d = 0) => (v == null ? "—" : `${(v * 100).toFixed(d).replace(".", ",")}%`);
export const int = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR"));
export const delta = (v: number | null | undefined) => (v == null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`);
export const deltaInt = (v: number | null | undefined) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR")}`);
export const deltaColor = (v: number | null | undefined) => (v == null || v === 0 ? "" : v > 0 ? "text-green-700" : "text-red-700");
