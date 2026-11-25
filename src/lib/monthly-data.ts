import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { socialClientFilter } from "./social-clients";
import { monthlyReport, type MonthlyNote, type MonthlyReport, type MonthlyRow } from "./monthly";

export const newMonthlyToken = () => randomBytes(24).toString("base64url");
const COLS = "client_id,network,month,followers,views,reach,interactions,clicks,calls,directions,website_clicks,chat_clicks,bookings,learning";

export type MonthlyData = {
  clients: { id: string; name: string; is_internal: boolean }[];
  accounts: { client_id: string; network: string }[];
  rows: MonthlyRow[];
  notes: MonthlyNote[];
};

/** Dados do fechamento mensal (null se a migração ainda não foi rodada). Com clientId, só daquele cliente. */
export async function loadMonthly(sb: SupabaseClient, clientId?: string): Promise<MonthlyData | null> {
  const onlySocial = await socialClientFilter(sb);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const by = (q: any, col = "client_id") => (clientId ? q.eq(col, clientId) : q);
  const [cl, ac, mr, nt] = await Promise.all([
    by(onlySocial(sb.from("clients").select("id,name,is_internal").eq("active", true)), "id").order("sort"),
    by(sb.from("accounts").select("client_id,network")).order("network"),
    by(sb.from("monthly_metrics").select(COLS)).limit(20000),
    by(sb.from("monthly_notes").select("client_id,month,comment,next_steps,collected_at")).limit(5000),
  ]);
  if (mr.error || nt.error) return null;
  return { clients: cl.data ?? [], accounts: ac.data ?? [], rows: mr.data ?? [], notes: nt.data ?? [] };
}

export function reportOf(d: MonthlyData, clientId: string, month: string): MonthlyReport | null {
  const c = d.clients.find((x) => x.id === clientId);
  if (!c) return null;
  const nets = d.accounts.filter((a) => a.client_id === clientId).map((a) => a.network);
  return monthlyReport(c, nets, d.rows, d.notes, month);
}

/** Resolve o token público -> dados do cliente (somente dele) e o relatório do mês pedido. */
export async function monthlyByToken(token: string, month: string): Promise<{ report: MonthlyReport; collectedAt: string | null; months: string[] } | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const sb = createAdminClient();
  const { data } = await sb.from("monthly_links").select("client_id").eq("public_token", token).maybeSingle();
  if (!data) return null;
  const d = await loadMonthly(sb, data.client_id as string);
  if (!d) return null;
  const report = reportOf(d, data.client_id as string, month);
  if (!report) return null;
  const months = [...new Set(d.rows.map((r) => r.month))].sort().reverse();
  return { report, collectedAt: report.note?.collected_at ?? null, months };
}
