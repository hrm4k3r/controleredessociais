"use server";
import { createClient } from "@/lib/supabase/server";
import { addDays, isValidISO, weekStart } from "@/lib/dates";
import { isTaskStatus, type Task } from "@/lib/tasks";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const COLS = "id,client_id,title,notes,status,due_date,week_start,position";
const clean = (v: string | null | undefined) => (v && v.trim() !== "" ? v.trim() : null);
const optDate = (v: string | null | undefined) => (v && isValidISO(v) ? v : null);

export async function createTask(input: { title: string; client_id: string | null; status: string; week_start: string; position: number; due_date?: string | null; notes?: string | null }): Promise<R<{ task: Task }>> {
  const title = clean(input.title);
  if (!title) return { ok: false, error: "Informe o título." };
  if (!isTaskStatus(input.status) || !isValidISO(input.week_start)) return { ok: false, error: "Dados inválidos." };
  const sb = await createClient();
  const { data, error } = await sb.from("tasks").insert({
    title, client_id: clean(input.client_id), status: input.status, week_start: weekStart(input.week_start),
    position: input.position, due_date: optDate(input.due_date), notes: clean(input.notes),
  }).select(COLS).single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, task: data as Task };
}

export async function updateTask(id: string, patch: { title: string; client_id: string | null; status: string; due_date: string | null; notes: string | null; position?: number }): Promise<R> {
  const title = clean(patch.title);
  if (!title) return { ok: false, error: "Informe o título." };
  if (!isTaskStatus(patch.status)) return { ok: false, error: "Status inválido." };
  const sb = await createClient();
  const row: Record<string, unknown> = { title, client_id: clean(patch.client_id), status: patch.status, due_date: optDate(patch.due_date), notes: clean(patch.notes) };
  if (patch.position != null) row.position = patch.position;
  const { error } = await sb.from("tasks").update(row).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function moveTask(id: string, status: string, position: number): Promise<R> {
  if (!isTaskStatus(status) || !Number.isFinite(position)) return { ok: false, error: "Dados inválidos." };
  const sb = await createClient();
  const { error } = await sb.from("tasks").update({ status, position }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
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
