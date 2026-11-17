import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildReport, type ReportData } from "./aggregate";
import { loadDataset } from "./data";
import type { WeeklyNote } from "./types";

export async function loadReport(sb: SupabaseClient, clientId: string, week: string): Promise<ReportData | null> {
  const ds = await loadDataset(sb, clientId);
  if (!ds.clients.some((c) => c.id === clientId)) return null;
  const { data } = await sb.from("weekly_notes").select("client_id,week_start,comment,next_steps,public_token").eq("client_id", clientId).eq("week_start", week).maybeSingle();
  return buildReport(ds, clientId, week, (data as WeeklyNote | null) ?? undefined);
}

export const newToken = () => randomBytes(24).toString("base64url"); // 192 bits

/** Token público (somente leitura) do relatório do cliente/semana; cria se não existir. */
export async function ensureToken(sb: SupabaseClient, clientId: string, week: string): Promise<string> {
  const { data } = await sb.from("weekly_notes").select("public_token").eq("client_id", clientId).eq("week_start", week).maybeSingle();
  if (data?.public_token) return data.public_token as string;
  const token = newToken();
  const { error } = await sb.from("weekly_notes").upsert({ client_id: clientId, week_start: week, public_token: token, updated_at: new Date().toISOString() }, { onConflict: "client_id,week_start" });
  if (error) throw new Error(error.message);
  return token;
}

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const publicLink = (token: string) => `${appUrl()}/r/${token}`;
