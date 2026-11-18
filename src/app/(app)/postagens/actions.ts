"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidISO, weekStart } from "@/lib/dates";
import { STATUSES } from "@/lib/constants";

const txt = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};

export async function savePost(fd: FormData) {
  const sb = await createClient();
  const id = txt(fd, "id");
  const post_date = String(fd.get("post_date") ?? "");
  const status = String(fd.get("status") ?? "Planejado");
  const client_id = String(fd.get("client_id") ?? "");
  if (!isValidISO(post_date) || !client_id || !(STATUSES as readonly string[]).includes(status)) redirect("/postagens?erro=dados");
  const row = { post_date, client_id, status, format: txt(fd, "format"), theme: txt(fd, "theme"), summary: txt(fd, "summary"), link: txt(fd, "link"), notes: txt(fd, "notes") };
  let postId = id;
  if (id) {
    const { error } = await sb.from("posts").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await sb.from("posts").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    postId = data.id;
  }
  const nets = fd.getAll("net").map(String);
  await sb.from("post_networks").delete().eq("post_id", postId!);
  if (nets.length) {
    const { error } = await sb.from("post_networks").insert(nets.map((network) => ({ post_id: postId!, network })));
    if (error) throw new Error(error.message);
  }
  revalidatePath("/", "layout");
  redirect(`/postagens?semana=${weekStart(post_date)}&ok=1`);
}

export async function deletePost(fd: FormData) {
  const sb = await createClient();
  const id = String(fd.get("id"));
  const { error } = await sb.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/postagens?ok=1");
}

export async function updatePostStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  if (!(STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Status inválido." };
  const sb = await createClient();
  const { error } = await sb.from("posts").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
