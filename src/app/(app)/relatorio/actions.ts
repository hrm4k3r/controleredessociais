"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidISO } from "@/lib/dates";
import { textField } from "@/lib/form";
import { ensureToken, newToken } from "@/lib/report-data";

const url = (c: string, w: string, extra = "ok=1") => `/relatorio?cliente=${c}&semana=${w}&${extra}`;

export async function saveNotes(fd: FormData) {
  const sb = await createClient();
  const client_id = String(fd.get("client_id"));
  const week = String(fd.get("week"));
  if (!isValidISO(week)) redirect("/relatorio");
  const { error } = await sb.from("weekly_notes").upsert(
    { client_id, week_start: week, comment: textField(fd.get("comment")), next_steps: textField(fd.get("next_steps")), updated_at: new Date().toISOString() },
    { onConflict: "client_id,week_start" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/relatorio");
  redirect(url(client_id, week));
}

export async function createLink(fd: FormData) {
  const sb = await createClient();
  const client_id = String(fd.get("client_id"));
  const week = String(fd.get("week"));
  await ensureToken(sb, client_id, week);
  revalidatePath("/relatorio");
  redirect(url(client_id, week));
}

export async function regenerateLink(fd: FormData) {
  const sb = await createClient();
  const client_id = String(fd.get("client_id"));
  const week = String(fd.get("week"));
  const { error } = await sb.from("weekly_notes").upsert({ client_id, week_start: week, public_token: newToken(), updated_at: new Date().toISOString() }, { onConflict: "client_id,week_start" });
  if (error) throw new Error(error.message);
  revalidatePath("/relatorio");
  redirect(url(client_id, week));
}
