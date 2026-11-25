"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { newMonthlyToken } from "@/lib/monthly-data";

/** Cria (ou renova) o link público do relatório mensal do cliente. `renew` invalida o link anterior. */
async function save(fd: FormData, renew: boolean) {
  const sb = await createClient();
  await requireModule(sb, "social");
  const client_id = String(fd.get("client_id"));
  const back = `/mensal/relatorio?mes=${String(fd.get("mes") ?? "")}`;
  if (!renew) {
    const { data } = await sb.from("monthly_links").select("public_token").eq("client_id", client_id).maybeSingle();
    if (data) redirect(back);
  }
  const { data: cl } = await sb.from("clients").select("organization_id").eq("id", client_id).single();
  const { error } = await sb.from("monthly_links").upsert({ organization_id: cl?.organization_id, client_id, public_token: newMonthlyToken() }, { onConflict: "client_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/mensal/relatorio");
  redirect(back);
}
export async function createMonthlyLink(fd: FormData) { await save(fd, false); }
export async function regenerateMonthlyLink(fd: FormData) { await save(fd, true); }
