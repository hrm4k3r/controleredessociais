"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidISO, spToISO } from "@/lib/dates";
import { intField, textField } from "@/lib/form";
import { GOOGLE_FIELDS, isMonthly } from "@/lib/constants";

const FIELDS = ["followers", "views", "reach", "interactions", "clicks"] as const;

export async function saveMetrics(fd: FormData) {
  const sb = await createClient();
  const week = String(fd.get("week"));
  if (!isValidISO(week)) redirect("/metricas");
  const keys = new Set<string>();
  for (const k of fd.keys()) if (k.startsWith("m|")) keys.add(k.split("|").slice(1, 3).join("|"));
  const upserts: Record<string, unknown>[] = [];
  for (const key of keys) {
    const [client_id, network] = key.split("|");
    const row: Record<string, unknown> = { client_id, network, week_start: week, updated_at: new Date().toISOString() };
    for (const f of FIELDS) row[f] = intField(fd.get(`m|${key}|${f}`));
    row.learning = textField(fd.get(`m|${key}|learning`));
    // Números próprios do Google (só vêm no formulário da linha mensal).
    let extras = false;
    if (isMonthly(network)) for (const g of GOOGLE_FIELDS) { row[g.key] = intField(fd.get(`m|${key}|${g.key}`)); extras ||= row[g.key] != null; }
    const empty = FIELDS.every((f) => row[f] == null) && row.learning == null && !extras;
    if (empty) {
      await sb.from("weekly_metrics").delete().eq("client_id", client_id).eq("network", network).eq("week_start", week);
    } else upserts.push(row);
  }
  if (upserts.length) {
    const { error } = await sb.from("weekly_metrics").upsert(upserts, { onConflict: "client_id,network,week_start" });
    if (error) throw new Error(error.message);
  }
  // Hora da coleta: só para clientes que têm dados lançados nesta semana.
  let aviso = "";
  const withData = new Set(upserts.map((u) => u.client_id as string));
  for (const client_id of withData) {
    const date = String(fd.get(`coll|${client_id}|date`) ?? "");
    const time = String(fd.get(`coll|${client_id}|time`) ?? "");
    const iso = spToISO(date, time);
    if (!iso) continue;
    const { error } = await sb.from("weekly_notes").upsert({ client_id, week_start: week, collected_at: iso }, { onConflict: "client_id,week_start" });
    if (error) aviso = "&aviso=coleta";
  }
  revalidatePath("/", "layout");
  redirect(`/metricas?semana=${week}&ok=1${aviso}`);
}
