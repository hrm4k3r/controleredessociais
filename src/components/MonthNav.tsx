import Link from "next/link";
import { addMonths, fmtMes } from "@/lib/dates";

/** Navegação de mês (anterior / atual / próximo). `extra` = parâmetros mantidos nos links. */
export default function MonthNav({ path, month, extra = {} }: { path: string; month: string; extra?: Record<string, string | undefined> }) {
  const href = (m: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
    q.set("mes", m);
    return `${path}?${q.toString()}`;
  };
  return (
    <div className="flex items-center gap-2">
      <Link href={href(addMonths(month, -1))} className="btn btn-ghost" aria-label="Mês anterior">←</Link>
      <div className="min-w-36 rounded-lg border border-line bg-surface px-3 py-2 text-center text-sm font-semibold capitalize text-navy">{fmtMes(month)}</div>
      <Link href={href(addMonths(month, 1))} className="btn btn-ghost" aria-label="Próximo mês">→</Link>
    </div>
  );
}
