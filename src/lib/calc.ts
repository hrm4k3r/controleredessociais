import type { GoalLevel, Verdict } from "./constants";

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** interações = curtidas + comentários + compartilhamentos + salvamentos */
export function interactionsOfPost(r: { likes?: number | null; comments?: number | null; shares?: number | null; saves?: number | null }): number | null {
  const vals = [r.likes, r.comments, r.shares, r.saves];
  if (vals.every((v) => v == null)) return null;
  return vals.reduce<number>((s, v) => s + n(v), 0);
}

/** taxa de engajamento = interações / alcance (null se não há alcance) */
export function engagementRate(interactions: number | null | undefined, reach: number | null | undefined): number | null {
  if (interactions == null || !reach || reach <= 0) return null;
  return interactions / reach;
}

/** % da meta de posts (null se meta 0). */
export function goalPct(done: number, goal: number): number | null {
  if (!goal || goal <= 0) return null;
  return done / goal;
}

/** verde ≥100%, amarelo 70–99%, vermelho <70% */
export function goalLevel(pct: number | null): GoalLevel {
  if (pct == null) return "none";
  if (pct >= 1) return "green";
  if (pct >= 0.7) return "yellow";
  return "red";
}

export function goalText(done: number, goal: number): string {
  const pct = goalPct(done, goal);
  if (pct == null) return "Defina a meta de posts";
  if (pct >= 1) return "Meta batida";
  const falta = Math.max(0, goal - done);
  return pct >= 0.7 ? `Quase lá — faltaram ${falta} post(s)` : `Abaixo da meta — faltaram ${falta} post(s)`;
}

/** variação relativa vs. período anterior (null se anterior vazio/zero) */
export function variation(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return curr / prev - 1;
}

/** novos seguidores = seguidores desta semana − da semana anterior (null se faltar um dos dois) */
export function newFollowers(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (curr == null || prev == null) return null;
  return curr - prev;
}

/**
 * Veredito vs. média histórica da conta:
 * "Poucos dados" se a conta tem < 3 posts com resultado; "Repetir" ≥120% da média; "Adaptar" ≤80%; senão "Na média".
 */
export function verdict(rate: number | null, accountRates: number[]): Verdict | null {
  if (rate == null) return null;
  if (accountRates.length < 3) return "Poucos dados";
  const avg = accountRates.reduce((s, v) => s + v, 0) / accountRates.length;
  if (rate >= 1.2 * avg) return "Repetir";
  if (rate <= 0.8 * avg) return "Adaptar";
  return "Na média";
}

/** Ranking por competição (empates dividem a posição): 1 = maior taxa. */
export function rankDesc<T>(items: T[], rate: (t: T) => number | null): Map<T, number> {
  const out = new Map<T, number>();
  for (const it of items) {
    const r = rate(it);
    if (r == null) continue;
    out.set(it, items.filter((o) => (rate(o) ?? -Infinity) > r).length + 1);
  }
  return out;
}

/** Ordena do maior para o menor engajamento (estável), ignorando itens sem taxa. */
export function sortByRate<T>(items: T[], rate: (t: T) => number | null): T[] {
  return items
    .map((it, i) => ({ it, i, r: rate(it) }))
    .filter((x) => x.r != null)
    .sort((a, b) => (b.r! - a.r!) || a.i - b.i)
    .map((x) => x.it);
}

export const sum = (xs: Array<number | null | undefined>) => xs.reduce<number>((s, v) => s + n(v), 0);
export const hasAny = (xs: Array<number | null | undefined>) => xs.some((v) => v != null);
