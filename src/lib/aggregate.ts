import { addDays, diffDays, weekStart } from "./dates";
import { engagementRate, goalLevel, goalPct, hasAny, interactionsOfPost, newFollowers, rankDesc, sortByRate, sum, variation, verdict } from "./calc";
import { isMonthly, type GoalLevel, type Verdict } from "./constants";
import type { Account, Client, Dataset, Post, PostResult } from "./types";

export const isPosted = (p: Post) => p.status === "Postado";

export function postsOfWeek(ds: Dataset, clientId: string, week: string): Post[] {
  return ds.posts.filter((p) => p.client_id === clientId && weekStart(p.post_date) === week);
}
export function postsDone(ds: Dataset, clientId: string, week: string): number {
  return postsOfWeek(ds, clientId, week).filter(isPosted).length;
}
/** Posts "Postado" da semana marcados na rede (aba Semanal da planilha). */
export function postsOnNetwork(ds: Dataset, clientId: string, week: string, network: string): number {
  const ids = new Set(ds.postNetworks.filter((pn) => pn.network === network).map((pn) => pn.post_id));
  return postsOfWeek(ds, clientId, week).filter((p) => isPosted(p) && ids.has(p.id)).length;
}

export type NetworkRow = {
  network: string;
  /** Rede de dado mensal (comparada com o lançamento anterior, não com a semana anterior). */
  monthly: boolean;
  hasData: boolean;
  posts: number;
  followers: number | null;
  newFollowers: number | null;
  views: number | null;
  viewsVar: number | null;
  reach: number | null;
  interactions: number | null;
  clicks: number | null;
  engagement: number | null;
  learning: string | null;
};

/** Lançamento de referência para comparar: semana anterior; nas redes mensais, o último lançamento anterior (até ~2 meses). */
export function previousMetric(ds: Dataset, clientId: string, network: string, week: string) {
  const mine = ds.metrics.filter((m) => m.client_id === clientId && m.network === network);
  if (!isMonthly(network)) return mine.find((m) => m.week_start === addDays(week, -7));
  return mine.filter((m) => m.week_start < week && diffDays(m.week_start, week) <= 70).sort((a, b) => b.week_start.localeCompare(a.week_start))[0];
}

export function networkRows(ds: Dataset, clientId: string, week: string): NetworkRow[] {
  return ds.accounts.filter((a) => a.client_id === clientId).map((a) => {
    const cur = ds.metrics.find((m) => m.client_id === clientId && m.network === a.network && m.week_start === week);
    const prev = previousMetric(ds, clientId, a.network, week);
    return {
      network: a.network,
      monthly: isMonthly(a.network),
      hasData: !!cur && [cur.followers, cur.views, cur.reach, cur.interactions, cur.clicks].some((v) => v != null),
      posts: postsOnNetwork(ds, clientId, week, a.network),
      followers: cur?.followers ?? null,
      newFollowers: newFollowers(cur?.followers, prev?.followers),
      views: cur?.views ?? null,
      viewsVar: variation(cur?.views, prev?.views),
      reach: cur?.reach ?? null,
      interactions: cur?.interactions ?? null,
      clicks: cur?.clicks ?? null,
      engagement: engagementRate(cur?.interactions, cur?.reach),
      learning: cur?.learning ?? null,
    };
  });
}

export type ClientWeek = {
  client: Client;
  goal: number;
  done: number;
  pct: number | null;
  level: GoalLevel;
  followers: number | null;
  newFollowers: number | null;
  views: number | null;
  viewsVar: number | null;
  reach: number | null;
  interactions: number | null;
  engagement: number | null;
};

const sumOrNull = (xs: Array<number | null>) => (hasAny(xs) ? sum(xs) : null);

export function clientWeek(ds: Dataset, client: Client, week: string): ClientWeek {
  const all = networkRows(ds, client.id, week);
  const rows = all.filter((r) => !r.monthly); // dado mensal não entra nos totais semanais
  const prevViews = ds.metrics.filter((m) => m.client_id === client.id && m.week_start === addDays(week, -7) && !isMonthly(m.network)).map((m) => m.views);
  const views = sumOrNull(rows.map((r) => r.views));
  const done = postsDone(ds, client.id, week);
  const pct = goalPct(done, client.weekly_goal);
  const reach = sumOrNull(rows.map((r) => r.reach));
  const interactions = sumOrNull(rows.map((r) => r.interactions));
  return {
    client, goal: client.weekly_goal, done, pct, level: goalLevel(pct),
    followers: sumOrNull(all.map((r) => r.followers)),
    newFollowers: sumOrNull(rows.map((r) => r.newFollowers)),
    views,
    viewsVar: hasAny(prevViews) ? variation(views, sum(prevViews)) : null,
    reach, interactions, engagement: engagementRate(interactions, reach),
  };
}

export type ResultRow = {
  post: Post;
  network: string;
  result: PostResult | null;
  interactions: number | null;
  rate: number | null;
  rankInWeek: number | null; // por conta (cliente+rede) na semana
  verdict: Verdict | null;
  alert: string | null;
  markedNetwork: boolean;
};

/** Uma linha por post × rede marcada (e redes com resultado lançado mesmo sem marcação). */
export function resultRows(ds: Dataset, clientId: string, week: string): ResultRow[] {
  const posts = postsOfWeek(ds, clientId, week).filter((p) => p.status === "Postado" || ds.results.some((r) => r.post_id === p.id));
  const rows: ResultRow[] = [];
  for (const p of posts) {
    const marked = new Set(ds.postNetworks.filter((pn) => pn.post_id === p.id).map((pn) => pn.network));
    const withResult = ds.results.filter((r) => r.post_id === p.id).map((r) => r.network);
    for (const network of new Set([...marked, ...withResult])) {
      const result = ds.results.find((r) => r.post_id === p.id && r.network === network) ?? null;
      const interactions = result ? interactionsOfPost(result) : null;
      const rate = result ? engagementRate(interactions, result.reach) : null;
      rows.push({
        post: p, network, result, interactions, rate, rankInWeek: null, verdict: null,
        alert: marked.has(network) ? null : "Rede não marcada nesse post",
        markedNetwork: marked.has(network),
      });
    }
  }
  // veredito: média histórica da conta (todos os posts com taxa)
  for (const row of rows) {
    row.verdict = verdict(row.rate, accountRates(ds, clientId, row.network));
  }
  // ranking na semana, por conta
  for (const network of new Set(rows.map((r) => r.network))) {
    const grp = rows.filter((r) => r.network === network);
    const ranks = rankDesc(grp, (r) => r.rate);
    for (const r of grp) r.rankInWeek = ranks.get(r) ?? null;
  }
  return rows.sort((a, b) => a.post.post_date.localeCompare(b.post.post_date) || a.network.localeCompare(b.network));
}

/** Taxas de engajamento de todos os posts com resultado da conta (histórico completo). */
export function accountRates(ds: Dataset, clientId: string, network: string): number[] {
  const ids = new Set(ds.posts.filter((p) => p.client_id === clientId).map((p) => p.id));
  const out: number[] = [];
  for (const r of ds.results) {
    if (r.network !== network || !ids.has(r.post_id)) continue;
    const rate = engagementRate(interactionsOfPost(r), r.reach);
    if (rate != null) out.push(rate);
  }
  return out;
}

export type ReportData = {
  client: Client;
  week: string;
  summary: ClientWeek;
  networks: NetworkRow[];
  top: ResultRow[];
  adapt: ResultRow | null;
  comment: string;
  nextSteps: string;
  /** Instante (ISO) em que os dados da semana foram coletados; null se não informado. */
  collectedAt: string | null;
};

export function buildReport(ds: Dataset, clientId: string, week: string, note?: { comment?: string | null; next_steps?: string | null; collected_at?: string | null }): ReportData {
  const client = ds.clients.find((c) => c.id === clientId)!;
  const rows = resultRows(ds, clientId, week).filter((r) => r.rate != null && r.markedNetwork);
  const sorted = sortByRate(rows, (r) => r.rate);
  const top = sorted.slice(0, 3);
  // post para adaptar: o de menor engajamento (precisa de ao menos 2 posts com taxa)
  const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null;
  return {
    client, week,
    summary: clientWeek(ds, client, week),
    networks: networkRows(ds, clientId, week),
    top,
    adapt: worst,
    comment: note?.comment ?? "",
    nextSteps: note?.next_steps ?? "",
    collectedAt: note?.collected_at ?? null,
  };
}

export function accountsOf(ds: Dataset, clientId: string): Account[] {
  return ds.accounts.filter((a) => a.client_id === clientId);
}
