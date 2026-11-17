import "server-only";
import { createAdminClient } from "./supabase/admin";
import { loadReport } from "./report-data";

/** Resolve o token público -> relatório (apenas dados do cliente/semana do token). */
export async function reportByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const sb = createAdminClient();
  const { data } = await sb.from("weekly_notes").select("client_id,week_start").eq("public_token", token).maybeSingle();
  if (!data) return null;
  return loadReport(sb, data.client_id as string, data.week_start as string);
}
