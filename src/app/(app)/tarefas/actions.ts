"use server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { addDays, isValidISO, todayISO, weekEnd, weekStart } from "@/lib/dates";
import { isTaskStatus, type PostSync, type Task } from "@/lib/tasks";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const COLS = "id,client_id,title,notes,status,due_date,week_start,position,post_id,created_by,completed_by,created_at,format,theme,networks,started_at,finished_at";

/** Cartão concluído vira um post "Planejado" (uma vez só; quem posta e quando é definido depois, em Postagens). */
async function syncPost(sb: SupabaseClient, id: string): Promise<PostSync> {
  const { data: t } = await sb.from("tasks").select(COLS).eq("id", id).single();
  const by = (t?.completed_by as string | null | undefined) ?? null;
  const tm = { started_at: (t?.started_at as string | null | undefined) ?? null, finished_at: (t?.finished_at as string | null | undefined) ?? null };
  if (!t || t.status !== "concluido") return { ...tm, completed_by: by, post_id: (t?.post_id as string | null) ?? null, state: "na" };
  if (t.post_id) return { ...tm, completed_by: by, post_id: t.post_id as string, state: "exists" };
  if (!t.client_id) return { ...tm, completed_by: by, post_id: null, state: "no_client" };
  const today = todayISO();
  const post_date = (t.due_date as string | null) ?? (today >= t.week_start && today <= weekEnd(t.week_start as string) ? today : (t.week_start as string));
  const { data: post, error } = await sb.from("posts").insert({ post_date, client_id: t.client_id, status: "Planejado", summary: t.title, notes: t.notes, format: t.format ?? null, theme: t.theme ?? null }).select("id").single();
  if (error || !post) return { ...tm, completed_by: by, post_id: null, state: "na" };
  // Redes: as escolhidas no cartão; se não escolheu e o cliente tem uma só rede, usa ela.
  let nets = ((t.networks as string[] | null) ?? []).filter(Boolean);
  if (nets.length === 0) {
    const { data: acc } = await sb.from("accounts").select("network").eq("client_id", t.client_id);
    if (acc?.length === 1) nets = [acc[0].network as string];
  }
  if (nets.length) await sb.from("post_networks").insert(nets.map((network) => ({ post_id: post.id, network })));
  await sb.from("tasks").update({ post_id: post.id }).eq("id", id);
  revalidatePath("/", "layout");
  return { ...tm, completed_by: by, post_id: post.id as string, state: "created" };
}
const clean = (v: string | null | undefined) => (v && v.trim() !== "" ? v.trim() : null);
const cleanNets = (n?: string[]) => [...new Set((n ?? []).map((x) => x.trim()).filter(Boolean))];
const optDate = (v: string | null | undefined) => (v && isValidISO(v) ? v : null);

export async function createTask(input: { title: string; client_id: string | null; status: string; week_start: string; position: number; due_date?: string | null; notes?: string | null; format?: string | null; theme?: string | null; networks?: string[] }): Promise<R<{ task: Task; post: PostSync }>> {
  const title = clean(input.title);
  if (!title) return { ok: false, error: "Informe o título." };
  if (!isTaskStatus(input.status) || !isValidISO(input.week_start)) return { ok: false, error: "Dados inválidos." };
  const sb = await createClient();
  const { data, error } = await sb.from("tasks").insert({
    title, client_id: clean(input.client_id), status: input.status, week_start: weekStart(input.week_start),
    position: input.position, due_date: optDate(input.due_date), notes: clean(input.notes),
    format: clean(input.format), theme: clean(input.theme), networks: cleanNets(input.networks),
  }).select(COLS).single();
  if (error) return { ok: false, error: error.message };
  const post = await syncPost(sb, (data as Task).id);
  return { ok: true, task: { ...(data as Task), post_id: post.post_id }, post };
}

export async function updateTask(id: string, patch: { title: string; client_id: string | null; status: string; due_date: string | null; notes: string | null; format: string | null; theme: string | null; networks: string[]; started_at?: string | null; finished_at?: string | null; position?: number }): Promise<R<{ post: PostSync }>> {
  const title = clean(patch.title);
  if (!title) return { ok: false, error: "Informe o título." };
  if (!isTaskStatus(patch.status)) return { ok: false, error: "Status inválido." };
  const sb = await createClient();
  const row: Record<string, unknown> = { title, client_id: clean(patch.client_id), status: patch.status, due_date: optDate(patch.due_date), notes: clean(patch.notes), format: clean(patch.format), theme: clean(patch.theme), networks: cleanNets(patch.networks) };
  if (patch.position != null) row.position = patch.position;
  if (patch.started_at !== undefined) row.started_at = patch.started_at;
  if (patch.finished_at !== undefined) row.finished_at = patch.finished_at;
  const { error } = await sb.from("tasks").update(row).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, post: await syncPost(sb, id) };
}

export async function moveTask(id: string, status: string, position: number): Promise<R<{ post: PostSync }>> {
  if (!isTaskStatus(status) || !Number.isFinite(position)) return { ok: false, error: "Dados inválidos." };
  const sb = await createClient();
  const { error } = await sb.from("tasks").update({ status, position }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, post: await syncPost(sb, id) };
}

export async function deleteTask(id: string): Promise<R> {
  const sb = await createClient();
  const { error } = await sb.from("tasks").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Leva os cartões não concluídos da semana para a seguinte. */
export async function carryOver(week: string): Promise<R<{ count: number }>> {
  if (!isValidISO(week)) return { ok: false, error: "Semana inválida." };
  const from = weekStart(week);
  const sb = await createClient();
  const { data, error } = await sb.from("tasks").update({ week_start: addDays(from, 7) }).eq("week_start", from).neq("status", "concluido").select("id");
  return error ? { ok: false, error: error.message } : { ok: true, count: data?.length ?? 0 };
}
