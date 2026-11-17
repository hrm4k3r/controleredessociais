"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidISO } from "@/lib/dates";
import { moneyField, textField, intField } from "@/lib/form";

export async function saveFinanceCadastro(fd: FormData) {
  const sb = await createClient();
  const rows = fd.getAll("id").map(String).map((client_id) => ({
    client_id,
    monthly_amount: moneyField(fd.get(`valor|${client_id}`)) ?? 0,
    due_day: Math.min(31, Math.max(1, intField(fd.get(`dia|${client_id}`)) ?? 1)),
  }));
  const { error } = await sb.from("client_finance").upsert(rows, { onConflict: "client_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/financeiro");
  redirect(`/financeiro?mes=${String(fd.get("mes"))}&ok=1`);
}

export async function savePayments(fd: FormData) {
  const sb = await createClient();
  const mes = String(fd.get("mes"));
  if (!isValidISO(mes)) redirect("/financeiro");
  const ids = fd.getAll("id").map(String);
  const { data: fin } = await sb.from("client_finance").select("client_id,monthly_amount");
  const amountOf = new Map((fin ?? []).map((f) => [f.client_id as string, Number(f.monthly_amount)]));
  const upserts: Record<string, unknown>[] = [];
  for (const client_id of ids) {
    const paid_date = textField(fd.get(`data|${client_id}`));
    let paid_amount = moneyField(fd.get(`pago|${client_id}`));
    const notes = textField(fd.get(`obs|${client_id}`));
    if (paid_date && !isValidISO(paid_date)) continue;
    if (!paid_date && paid_amount == null && !notes) {
      await sb.from("payments").delete().eq("client_id", client_id).eq("ref_month", mes);
      continue;
    }
    const existing = await sb.from("payments").select("amount_due").eq("client_id", client_id).eq("ref_month", mes).maybeSingle();
    const amount_due = (existing.data?.amount_due as number | null | undefined) ?? amountOf.get(client_id) ?? null;
    if (paid_date && paid_amount == null) paid_amount = amount_due; // data sem valor = pagamento integral
    upserts.push({ client_id, ref_month: mes, amount_due, paid_date, paid_amount, notes, updated_at: new Date().toISOString() });
  }
  if (upserts.length) {
    const { error } = await sb.from("payments").upsert(upserts, { onConflict: "client_id,ref_month" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/financeiro");
  redirect(`/financeiro?mes=${mes}&ok=1`);
}
