"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { isValidISO } from "@/lib/dates";
import { intField, textField } from "@/lib/form";

const FIELDS = ["followers", "views", "reach", "interactions", "clicks"] as const;

/** Salva o marco inicial por conta (cliente + rede). Linha toda vazia remove o marco da conta. */
export async function saveBaselines(fd: FormData) {
  const sb = await createClient();
  await requireModule(sb, "social");
  const dates = new Map<string, string>();
  for (const [k, v] of fd.entries()) if (k.startsWith("date|")) dates.set(k.split("|")[1], String(v));
  const keys = new Set<string>();
  for (const k of fd.keys()) if (k.startsWith("b|")) keys.add(k.split("|").slice(1, 3).join("|"));
  const upserts: Record<string, unknown>[] = [];
  for (const key of keys) {
    const [client_id, network] = key.split("|");
    const row: Record<string, unknown> = { client_id, network, baseline_date: dates.get(client_id), updated_at: new Date().toISOString() };
    for (const f of FIELDS) row[f] = intField(fd.get(`b|${key}|${f}`));
    row.notes = textField(fd.get(`b|${key}|notes`));
    const empty = FIELDS.every((f) => row[f] == null) && row.notes == null;
    if (empty) { await sb.from("account_baselines").delete().eq("client_id", client_id).eq("network", network); continue; }
    if (!isValidISO(row.baseline_date as string)) redirect("/marco-inicial?erro=data");
    upserts.push(row);
  }
  if (upserts.length) {
    const { error } = await sb.from("account_baselines").upsert(upserts, { onConflict: "client_id,network" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/", "layout");
  redirect("/marco-inicial?ok=1");
}
