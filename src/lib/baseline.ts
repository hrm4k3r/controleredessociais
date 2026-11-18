import { engagementRate } from "./calc";

export type Nums = { followers: number | null; views: number | null; reach: number | null; interactions: number | null; clicks: number | null };
export const METRICS: { key: "followers" | "views" | "reach" | "interactions" | "clicks" | "engagement"; label: string; pct?: boolean }[] = [
  { key: "followers", label: "Seguidores" },
  { key: "reach", label: "Alcance (7 dias)" },
  { key: "views", label: "Visualizações (7 dias)" },
  { key: "interactions", label: "Interações (7 dias)" },
  { key: "clicks", label: "Cliques/visitas (7 dias)" },
  { key: "engagement", label: "Engajamento", pct: true },
];

export type Line = { key: (typeof METRICS)[number]["key"]; label: string; pct: boolean; before: number | null; after: number | null; delta: number | null; deltaPct: number | null };

const val = (n: Nums, key: Line["key"]): number | null => (key === "engagement" ? engagementRate(n.interactions, n.reach) : n[key]);

/** Antes × depois de uma conta. Variação % é relativa ao "antes"; no engajamento, `delta` é em pontos percentuais. */
export function compare(before: Nums, after: Nums): Line[] {
  return METRICS.map((m) => {
    const b = val(before, m.key), a = val(after, m.key);
    const delta = b != null && a != null ? a - b : null;
    const deltaPct = b != null && a != null && b > 0 && m.key !== "engagement" ? (a - b) / b : null;
    return { key: m.key, label: m.label, pct: !!m.pct, before: b, after: a, delta, deltaPct };
  });
}

/** Soma números de várias contas; só entra no total quem tem o dado nos dois lados (comparação justa). */
export function totals(pairs: { before: Nums; after: Nums }[]): Line[] {
  const sumOf = (key: "followers" | "views" | "reach" | "interactions" | "clicks") => {
    const ok = pairs.filter((p) => p.before[key] != null && p.after[key] != null);
    return { b: ok.reduce((s, p) => s + p.before[key]!, 0), a: ok.reduce((s, p) => s + p.after[key]!, 0), n: ok.length };
  };
  const base = (["followers", "reach", "views", "interactions", "clicks"] as const).map((key) => {
    const s = sumOf(key);
    const m = METRICS.find((x) => x.key === key)!;
    const has = s.n > 0;
    return { key, label: m.label, pct: false, before: has ? s.b : null, after: has ? s.a : null, delta: has ? s.a - s.b : null, deltaPct: has && s.b > 0 ? (s.a - s.b) / s.b : null } as Line;
  });
  // engajamento geral = interações ÷ alcance, só com contas que têm os dois números nos dois lados
  const both = pairs.filter((p) => p.before.reach && p.after.reach && p.before.interactions != null && p.after.interactions != null);
  const eb = both.length ? engagementRate(both.reduce((s, p) => s + p.before.interactions!, 0), both.reduce((s, p) => s + p.before.reach!, 0)) : null;
  const ea = both.length ? engagementRate(both.reduce((s, p) => s + p.after.interactions!, 0), both.reduce((s, p) => s + p.after.reach!, 0)) : null;
  base.push({ key: "engagement", label: "Engajamento", pct: true, before: eb, after: ea, delta: eb != null && ea != null ? ea - eb : null, deltaPct: null });
  return base;
}

/** Último domingo (inclusive hoje, se for domingo) a partir de uma data aaaa-mm-dd. */
export function lastSunday(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}
