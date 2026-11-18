import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { loadDataset } from "./data";
import { currentWeekStart } from "./dates";
import { evolutionOf, type Base, type EvoClient } from "./evolution";

export const newEvolutionToken = () => randomBytes(24).toString("base64url");

export async function loadEvolution(sb: SupabaseClient, clientId: string): Promise<{ data: EvoClient; asOf: string | null } | null> {
  const ds = await loadDataset(sb, clientId);
  const { data: bl } = await sb.from("account_baselines").select("client_id,network,baseline_date,followers,views,reach,interactions,clicks,notes").eq("client_id", clientId);
  const data = evolutionOf(ds, (bl ?? []) as Base[], clientId, currentWeekStart());
  if (!data) return null;
  const asOf = data.items.map((i) => i.week).filter((w): w is string => !!w).sort().pop() ?? null;
  return { data, asOf };
}

/** Resolve o token público -> evolução do cliente (somente dele). */
export async function evolutionByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const sb = createAdminClient();
  const { data } = await sb.from("evolution_links").select("client_id").eq("public_token", token).maybeSingle();
  if (!data) return null;
  return loadEvolution(sb, data.client_id as string);
}
