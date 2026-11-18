/** Estatísticas do relatório de tempo (minutos). */
export type Stats = { n: number; avg: number | null; median: number | null; total: number };

export function stats(xs: number[]): Stats {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return { n: 0, avg: null, median: null, total: 0 };
  const total = v.reduce((s, x) => s + x, 0);
  const mid = Math.floor(v.length / 2);
  const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  return { n: v.length, avg: total / v.length, median, total };
}

/** Minutos entre início e fim (ISO). Ignora negativos e durações acima do limite (padrão 7 dias: cartão esquecido aberto). */
export function elapsedMin(start?: string | null, end?: string | null, maxMin = 7 * 24 * 60): number | null {
  if (!start || !end) return null;
  const m = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  return Number.isFinite(m) && m >= 0 && m <= maxMin ? m : null;
}

/** "1h15", "45min", "2h", "—" */
export function fmtMin(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m)) return "—";
  const r = Math.round(m);
  const h = Math.floor(r / 60), mm = r % 60;
  return h === 0 ? `${mm}min` : mm === 0 ? `${h}h` : `${h}h${String(mm).padStart(2, "0")}`;
}

export function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) { const k = key(r); const l = out.get(k); if (l) l.push(r); else out.set(k, [r]); }
  return out;
}

/** Desvio do real em relação ao estimado, em %: +20 = 20% acima do estimado; null sem estimativa. */
export function deviationPct(estimated: number, actual: number): number | null {
  return estimated > 0 ? Math.round(((actual - estimated) / estimated) * 100) : null;
}
