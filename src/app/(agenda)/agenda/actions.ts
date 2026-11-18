"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { isValidISO } from "@/lib/dates";
import { minutes, RECURRENCES, type Recurrence } from "@/lib/agenda";

type R = { ok: true } | { ok: false; error: string };
export type EventInput = {
  id?: string; title: string; description: string | null; location: string | null; color: string; visibility: string; recurrence: string;
  recur_until: string | null; start_date: string; end_date: string | null; start_time: string | null; end_time: string | null;
};
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveEvent(input: EventInput): Promise<R> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Informe o título." };
  if (!isValidISO(input.start_date)) return { ok: false, error: "Data inválida." };
  const allDay = !input.start_time;
  if (input.start_time && !TIME.test(input.start_time)) return { ok: false, error: "Horário inicial inválido (use hh:mm)." };
  if (input.end_time && !TIME.test(input.end_time)) return { ok: false, error: "Horário final inválido (use hh:mm)." };
  if (input.start_time && input.end_time && minutes(input.end_time) <= minutes(input.start_time)) return { ok: false, error: "O horário final precisa ser depois do inicial." };
  if (allDay && input.end_date && (!isValidISO(input.end_date) || input.end_date < input.start_date)) return { ok: false, error: "A data final precisa ser igual ou depois da inicial." };
  const rec = input.recurrence as Recurrence;
  if (!RECURRENCES.some((r) => r.id === rec)) return { ok: false, error: "Repetição inválida." };
  if (input.recur_until && (!isValidISO(input.recur_until) || input.recur_until < input.start_date)) return { ok: false, error: "O fim da repetição precisa ser depois do início." };
  const row = {
    title, description: input.description?.trim() || null, location: input.location?.trim() || null, color: input.color || "blue",
    visibility: input.visibility === "team" ? "team" : "private", recurrence: rec, recur_until: rec === "none" ? null : input.recur_until || null,
    start_date: input.start_date, end_date: allDay && input.end_date && input.end_date !== input.start_date ? input.end_date : null,
    start_time: input.start_time || null, end_time: input.start_time ? input.end_time || null : null,
  };
  const sb = await createClient();
  await requireModule(sb, "agenda");
  const { error } = input.id ? await sb.from("agenda_events").update(row).eq("id", input.id) : await sb.from("agenda_events").insert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agenda");
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<R> {
  const sb = await createClient();
  await requireModule(sb, "agenda");
  const { error } = await sb.from("agenda_events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agenda");
  return { ok: true };
}
