"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { isValidISO, todayISO } from "@/lib/dates";
import {
  isItemStatus, isItemType, isPriority, ITEM_COLS, parseHours, PROJECT_KINDS, PROJECT_STATUSES, type DevItem,
} from "@/lib/dev";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const txt = (fd: FormData, k: string) => { const v = String(fd.get(k) ?? "").trim(); return v === "" ? null : v; };
const date = (v: string | null | undefined) => (v && isValidISO(v) ? v : null);
const refresh = () => revalidatePath("/dev", "layout");

async function dev() {
  const sb = await createClient();
  const access = await requireModule(sb, "dev");
  return { sb, access };
}

/** Garante que o cliente também aparece na gestão de projetos (clients.modules contém 'dev'). */
async function clientForProject(sb: Awaited<ReturnType<typeof createClient>>, fd: FormData): Promise<string | null> {
  const sel = String(fd.get("client_id") ?? "");
  const newName = txt(fd, "new_client");
  if (newName) {
    const { data: found } = await sb.from("clients").select("id,modules").eq("name", newName).maybeSingle();
    if (found) { await addDevModule(sb, found.id as string, found.modules as string[] | null); return found.id as string; }
    const { data: last } = await sb.from("clients").select("sort").order("sort", { ascending: false }).limit(1);
    const { data, error } = await sb.from("clients").insert({ name: newName, weekly_goal: 0, sort: (last?.[0]?.sort ?? 0) + 1, modules: ["dev"] }).select("id").single();
    if (error) throw new Error(error.message);
    return data.id as string;
  }
  if (!sel) return null;
  const { data: c } = await sb.from("clients").select("id,modules").eq("id", sel).maybeSingle();
  if (!c) return null;
  await addDevModule(sb, c.id as string, c.modules as string[] | null);
  return c.id as string;
}
async function addDevModule(sb: Awaited<ReturnType<typeof createClient>>, id: string, modules: string[] | null) {
  if (modules?.includes("dev")) return;
  await sb.from("clients").update({ modules: [...(modules ?? []), "dev"] }).eq("id", id);
}

/* ---------- Projetos ---------- */
export async function saveProject(fd: FormData) {
  const { sb } = await dev();
  const id = txt(fd, "id");
  const name = txt(fd, "name");
  if (!name) redirect(id ? `/dev/projetos/${id}?erro=nome` : "/dev/projetos?erro=nome");
  const kind = String(fd.get("kind") ?? "sistema");
  const status = String(fd.get("status") ?? "planejamento");
  if (!PROJECT_KINDS.some((k) => k.id === kind) || !PROJECT_STATUSES.some((s) => s.id === status)) redirect("/dev/projetos?erro=dados");
  const row = {
    name, kind, status, client_id: await clientForProject(sb, fd), description: txt(fd, "description"), repo_url: txt(fd, "repo_url"),
    stack: txt(fd, "stack"), start_date: date(txt(fd, "start_date")), due_date: date(txt(fd, "due_date")),
  };
  let pid = id;
  if (id) {
    const { error } = await sb.from("dev_projects").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await sb.from("dev_projects").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    pid = data.id as string;
  }
  refresh();
  redirect(`/dev/projetos/${pid}?ok=1`);
}

export async function deleteProject(fd: FormData) {
  const { sb } = await dev();
  const { error } = await sb.from("dev_projects").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect("/dev/projetos?ok=1");
}

/* ---------- Marcos ---------- */
export async function saveMilestone(fd: FormData) {
  const { sb } = await dev();
  const project_id = String(fd.get("project_id"));
  const name = txt(fd, "name");
  if (!name) redirect(`/dev/projetos/${project_id}?erro=nome`);
  const { error } = await sb.from("dev_milestones").insert({ project_id, name, due_date: date(txt(fd, "due_date")), notes: txt(fd, "notes") });
  if (error) throw new Error(error.message);
  refresh();
  redirect(`/dev/projetos/${project_id}?ok=1`);
}
export async function toggleMilestone(fd: FormData) {
  const { sb } = await dev();
  const project_id = String(fd.get("project_id"));
  const delivered = fd.get("delivered") === "1";
  const { error } = await sb.from("dev_milestones").update({ delivered_at: delivered ? null : todayISO() }).eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect(`/dev/projetos/${project_id}?ok=1`);
}
export async function deleteMilestone(fd: FormData) {
  const { sb } = await dev();
  const project_id = String(fd.get("project_id"));
  const { error } = await sb.from("dev_milestones").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect(`/dev/projetos/${project_id}?ok=1`);
}

/* ---------- Itens do quadro (chamados pelo componente cliente) ---------- */
export type ItemInput = {
  title: string; description: string | null; type: string; status: string; priority: string; assignee_id: string | null;
  milestone_id: string | null; estimate_hours: number | null; due_date: string | null;
};
function itemRow(i: ItemInput): R<{ row: Record<string, unknown> }> {
  const title = i.title.trim();
  if (!title) return { ok: false, error: "Informe o título." };
  if (!isItemType(i.type) || !isItemStatus(i.status) || !isPriority(i.priority)) return { ok: false, error: "Dados inválidos." };
  const est = i.estimate_hours != null && Number.isFinite(i.estimate_hours) && i.estimate_hours >= 0 ? i.estimate_hours : null;
  return { ok: true, row: {
    title, description: i.description?.trim() || null, type: i.type, status: i.status, priority: i.priority,
    assignee_id: i.assignee_id || null, milestone_id: i.milestone_id || null, estimate_hours: est, due_date: date(i.due_date),
  } };
}

export async function createItem(project_id: string, input: ItemInput, position: number): Promise<R<{ item: DevItem }>> {
  const r = itemRow(input);
  if (!r.ok) return r;
  const { sb } = await dev();
  const { data, error } = await sb.from("dev_items").insert({ ...r.row, project_id, position }).select(ITEM_COLS).single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, item: data as DevItem };
}

export async function updateItem(id: string, input: ItemInput, position?: number): Promise<R<{ item: DevItem }>> {
  const r = itemRow(input);
  if (!r.ok) return r;
  const { sb } = await dev();
  const row = position != null ? { ...r.row, position } : r.row;
  const { data, error } = await sb.from("dev_items").update(row).eq("id", id).select(ITEM_COLS).single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, item: data as DevItem };
}

export async function moveItem(id: string, status: string, position: number): Promise<R<{ completed_by: string | null }>> {
  if (!isItemStatus(status) || !Number.isFinite(position)) return { ok: false, error: "Dados inválidos." };
  const { sb } = await dev();
  const { data, error } = await sb.from("dev_items").update({ status, position }).eq("id", id).select("completed_by").single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, completed_by: (data?.completed_by as string | null) ?? null };
}

export async function deleteItem(id: string): Promise<R> {
  const { sb } = await dev();
  const { error } = await sb.from("dev_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Troca rápida de status (página "Minhas tarefas"). */
export async function quickStatus(fd: FormData) {
  const { sb } = await dev();
  const status = String(fd.get("status") ?? "");
  if (!isItemStatus(status)) redirect("/dev/minhas");
  const { error } = await sb.from("dev_items").update({ status }).eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect("/dev/minhas?ok=1");
}

/* ---------- Horas ---------- */
export async function addTime(fd: FormData) {
  const { sb } = await dev();
  const week = String(fd.get("semana") ?? "");
  const back = (q: string) => `/dev/horas?${week ? `semana=${week}&` : ""}${q}`;
  const target = String(fd.get("target") ?? "");
  const hours = parseHours(String(fd.get("hours") ?? ""));
  const work_date = String(fd.get("work_date") ?? "");
  if (!hours) redirect(back("erro=horas"));
  if (!isValidISO(work_date)) redirect(back("erro=data"));
  let project_id: string | null = null;
  let item_id: string | null = null;
  if (target.startsWith("p:")) project_id = target.slice(2);
  if (target.startsWith("i:")) {
    item_id = target.slice(2);
    const { data } = await sb.from("dev_items").select("project_id").eq("id", item_id).maybeSingle();
    project_id = (data?.project_id as string | undefined) ?? null;
  }
  if (!project_id) redirect(back("erro=projeto"));
  const { error } = await sb.from("dev_time_entries").insert({ project_id, item_id, work_date, hours, notes: txt(fd, "notes") });
  if (error) throw new Error(error.message);
  refresh();
  redirect(back("ok=1"));
}
export async function deleteTime(fd: FormData) {
  const { sb } = await dev();
  const week = String(fd.get("semana") ?? "");
  const { error } = await sb.from("dev_time_entries").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  redirect(`/dev/horas?${week ? `semana=${week}&` : ""}ok=1`);
}
