"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { intField } from "@/lib/form";

const FIELDS = ["views", "reach", "likes", "comments", "shares", "saves", "clicks"] as const;

export async function saveResults(fd: FormData) {
  const sb = await createClient();
  const back = String(fd.get("back") ?? "/resultados");
  const keys = new Set<string>();
  for (const k of fd.keys()) if (k.startsWith("r|")) keys.add(k.split("|").slice(1, 3).join("|"));
  const upserts: Record<string, unknown>[] = [];
  for (const key of keys) {
    const [post_id, network] = key.split("|");
    const row: Record<string, unknown> = { post_id, network, updated_at: new Date().toISOString() };
    for (const f of FIELDS) row[f] = intField(fd.get(`r|${key}|${f}`));
    if (FIELDS.every((f) => row[f] == null)) await sb.from("post_results").delete().eq("post_id", post_id).eq("network", network);
    else upserts.push(row);
  }
  if (upserts.length) {
    const { error } = await sb.from("post_results").upsert(upserts, { onConflict: "post_id,network" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/", "layout");
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=1`);
}
