"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidISO } from "@/lib/dates";
import { intField, textField } from "@/lib/form";

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
    const empty = FIELDS.every((f) => row[f] == null) && row.learning == null;
    if (empty) {
      await sb.from("weekly_metrics").delete().eq("client_id", client_id).eq("network", network).eq("week_start", week);
    } else upserts.push(row);
  }
  if (upserts.length) {
    const { error } = await sb.from("weekly_metrics").upsert(upserts, { onConflict: "client_id,network,week_start" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/", "layout");
  redirect(`/metricas?semana=${week}&ok=1`);
}
