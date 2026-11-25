"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { spToISO } from "@/lib/dates";
import { intField, textField } from "@/lib/form";
import { GOOGLE_FIELDS, isMonthly } from "@/lib/constants";
import { isMonthISO } from "@/lib/monthly";

const FIELDS = ["followers", "views", "reach", "interactions", "clicks", ...GOOGLE_FIELDS.map((g) => g.key)] as const;

export async function saveMonthly(fd: FormData) {
  const sb = await createClient();
  await requireModule(sb, "social");
  const month = String(fd.get("month"));
  if (!isMonthISO(month)) redirect("/mensal");
  const keys = new Set<string>();
  for (const k of fd.keys()) if (k.startsWith("m|")) keys.add(k.split("|").slice(1, 3).join("|"));
  const upserts: Record<string, unknown>[] = [];
  for (const key of keys) {
    const [client_id, network] = key.split("|");
    const row: Record<string, unknown> = { client_id, network, month, updated_at: new Date().toISOString() };
    for (const f of FIELDS) row[f] = intField(fd.get(`m|${key}|${f}`));
    // O painel do Google não tem seguidores, alcance nem cliques gerais: só visualizações, interações e os campos próprios.
    if (isMonthly(network)) for (const f of ["followers", "reach", "clicks"] as const) row[f] = null;
    row.learning = textField(fd.get(`m|${key}|learning`));
    if (FIELDS.every((f) => row[f] == null) && row.learning == null) {
      await sb.from("monthly_metrics").delete().eq("client_id", client_id).eq("network", network).eq("month", month);
    } else upserts.push(row);
  }
  if (upserts.length) {
    const { error } = await sb.from("monthly_metrics").upsert(upserts, { onConflict: "client_id,network,month" });
    if (error) throw new Error(error.message);
  }
  // Notas do mês e hora da coleta, por cliente.
  const clients = new Set([...keys].map((k) => k.split("|")[0]));
  const withData = new Set(upserts.map((u) => u.client_id as string));
  for (const client_id of clients) {
    const comment = textField(fd.get(`n|${client_id}|comment`));
    const next_steps = textField(fd.get(`n|${client_id}|next`));
    const collected_at = withData.has(client_id) ? spToISO(String(fd.get(`coll|${client_id}|date`) ?? ""), String(fd.get(`coll|${client_id}|time`) ?? "")) : null;
    if (!comment && !next_steps && !collected_at) {
      await sb.from("monthly_notes").delete().eq("client_id", client_id).eq("month", month);
      continue;
    }
    const { error } = await sb.from("monthly_notes").upsert({ client_id, month, comment, next_steps, collected_at, updated_at: new Date().toISOString() }, { onConflict: "client_id,month" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/", "layout");
  redirect(`/mensal?mes=${month}&ok=1`);
}
