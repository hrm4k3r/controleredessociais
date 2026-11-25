import { socialClientFilter } from "./social-clients";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account, Client, Dataset, Post, PostNetwork, PostResult, WeeklyMetric } from "./types";

const PAGE = 1000;

/** Busca todas as linhas (o Supabase limita 1000 por requisição). */
export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** Carrega o conjunto de dados de gestão. Com clientId, só daquele cliente (usado na página pública). */
export async function loadDataset(sb: SupabaseClient, clientId?: string): Promise<Dataset> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byClient = (q: any, col = "client_id") => (clientId ? q.eq(col, clientId) : q);
  const onlySocial = await socialClientFilter(sb);
  const clients = await fetchAll<Client>((a, b) => byClient(onlySocial(sb.from("clients").select("id,name,is_internal,weekly_goal,sort").eq("active", true)), "id").order("sort").range(a, b));
  const accounts = await fetchAll<Account>((a, b) => byClient(sb.from("accounts").select("id,client_id,network")).order("network").range(a, b));
  const posts = await fetchAll<Post>((a, b) => byClient(sb.from("posts").select("id,post_date,client_id,status,format,theme,summary,link,notes")).order("post_date").order("id").range(a, b));
  const ids = new Set(posts.map((p) => p.id));
  const postNetworks = (await fetchAll<PostNetwork>((a, b) => sb.from("post_networks").select("post_id,network").order("post_id").order("network").range(a, b))).filter((x) => ids.has(x.post_id));
  const results = (await fetchAll<PostResult>((a, b) => sb.from("post_results").select("post_id,network,views,reach,likes,comments,shares,saves,clicks").order("post_id").order("network").range(a, b))).filter((x) => ids.has(x.post_id));
  const baseCols = "client_id,network,week_start,followers,views,reach,interactions,clicks,learning";
  const load = (cols: string) => fetchAll<WeeklyMetric>((a, b) => byClient(sb.from("weekly_metrics").select(cols)).order("week_start").order("network").range(a, b));
  // Antes da migração dos números do Google as colunas extras não existem: cai para as colunas básicas.
  const metrics = await load(`${baseCols},calls,directions,website_clicks,chat_clicks,bookings`).catch(() => load(baseCols));
  return { clients, accounts, posts, postNetworks, results, metrics };
}

export type Lists = { networks: string[]; formats: string[]; themes: string[] };

export async function loadLists(sb: SupabaseClient): Promise<Lists> {
  const { data, error } = await sb.from("list_items").select("kind,label,sort").order("sort").order("label");
  if (error) throw new Error(error.message);
  const pick = (k: string) => (data ?? []).filter((r) => r.kind === k).map((r) => r.label as string);
  return { networks: pick("network"), formats: pick("format"), themes: pick("theme") };
}
