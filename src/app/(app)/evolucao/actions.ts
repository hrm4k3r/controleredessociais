"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { newEvolutionToken } from "@/lib/public-evolution";

/** Cria (ou renova) o link público do antes × depois do cliente. `renew` invalida o link anterior. */
async function save(fd: FormData, renew: boolean) {
  const sb = await createClient();
  await requireModule(sb, "social");
  const client_id = String(fd.get("client_id"));
  if (!renew) {
    const { data } = await sb.from("evolution_links").select("public_token").eq("client_id", client_id).maybeSingle();
    if (data) { redirect("/evolucao"); }
  }
  const { data: cl } = await sb.from("clients").select("organization_id").eq("id", client_id).single();
  const { error } = await sb.from("evolution_links").upsert({ organization_id: cl?.organization_id, client_id, public_token: newEvolutionToken() }, { onConflict: "client_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/evolucao");
  redirect("/evolucao");
}
export async function createEvolutionLink(fd: FormData) { await save(fd, false); }
export async function regenerateEvolutionLink(fd: FormData) { await save(fd, true); }
