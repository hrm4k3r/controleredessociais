import { diffDays, weekEnd } from "./dates";
import { compare, totals, type Line, type Nums } from "./baseline";
import type { Client, Dataset } from "./types";

export type Base = Nums & { client_id: string; network: string; baseline_date: string; notes: string | null };
export type EvoItem = { network: string; baseline_date: string; before: Nums; after: Nums; week: string | null; lines: Line[] };
export type EvoClient = { client: Client; items: EvoItem[]; lines: Line[]; since: string; weeks: number };

const EMPTY: Nums = { followers: null, views: null, reach: null, interactions: null, clicks: null };

/** Antes × depois de um cliente: marco inicial de cada rede contra os números mais recentes até `week`. */
export function evolutionOf(ds: Dataset, bases: Base[], clientId: string, week: string): EvoClient | null {
  const client = ds.clients.find((c) => c.id === clientId);
  const mine = bases.filter((b) => b.client_id === clientId);
  if (!client || mine.length === 0) return null;
  const metrics = ds.metrics.filter((m) => m.client_id === clientId && m.week_start <= week);
  const items = mine.map((b): EvoItem => {
    const rows = metrics.filter((m) => m.network === b.network && m.week_start > b.baseline_date).sort((a, c) => c.week_start.localeCompare(a.week_start));
    const cur = rows[0] ?? null;
    const followers = rows.find((m) => m.followers != null)?.followers ?? null; // a semana mais nova pode vir sem seguidores
    const after: Nums = cur ? { followers, views: cur.views, reach: cur.reach, interactions: cur.interactions, clicks: cur.clicks } : { ...EMPTY, followers };
    const before: Nums = { followers: b.followers, views: b.views, reach: b.reach, interactions: b.interactions, clicks: b.clicks };
    return { network: b.network, baseline_date: b.baseline_date, before, after, week: cur?.week_start ?? null, lines: compare(before, after) };
  });
  const since = items.map((i) => i.baseline_date).sort()[0];
  return { client, items, lines: totals(items.map((i) => ({ before: i.before, after: i.after }))), since, weeks: Math.max(0, Math.round(diffDays(since, weekEnd(week)) / 7)) };
}
