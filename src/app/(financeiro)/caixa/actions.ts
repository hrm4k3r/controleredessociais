"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { addMonthsKeepDay, isValidISO, todayISO } from "@/lib/dates";
import { moneyField, textField } from "@/lib/form";
import { splitAmount } from "@/lib/caixa";

async function guard() {
  const sb = await createClient();
  await requireModule(sb, "financeiro");
  return sb;
}
/** Só aceita voltar para páginas do caixa. */
const backTo = (fd: FormData, fallback = "/caixa/lancamentos") => {
  const b = String(fd.get("back") ?? "");
  return b.startsWith("/caixa") ? b : fallback;
};
const withQ = (url: string, q: string) => `${url}${url.includes("?") ? "&" : "?"}${q}`;
const done = (url: string): never => {
  revalidatePath("/caixa", "layout");
  redirect(withQ(url, "ok=1"));
};
const fail = (url: string, code: string): never => redirect(withQ(url, `erro=${code}`));

export async function saveEntry(fd: FormData) {
  const sb = await guard();
  const back = backTo(fd);
  const id = textField(fd.get("id"));
  const kind = String(fd.get("kind"));
  const description = textField(fd.get("description"));
  const amount = moneyField(fd.get("amount"));
  const due_date = String(fd.get("due_date") ?? "");
  if (kind !== "entrada" && kind !== "saida") return fail(back, "dados");
  if (!description) return fail(back, "descricao");
  if (!amount || amount <= 0) return fail(back, "valor");
  if (!isValidISO(due_date)) return fail(back, "data");
  let paid_date: string | null = null;
  if (fd.get("paid") === "on") {
    const p = textField(fd.get("paid_date")) ?? todayISO();
    if (!isValidISO(p)) return fail(back, "data");
    paid_date = p;
  }
  const account_id = textField(fd.get("account_id"));
  let category_id = textField(fd.get("category_id"));
  if (category_id) {
    const { data: cat } = await sb.from("fin_categories").select("kind").eq("id", category_id).maybeSingle();
    if (!cat || cat.kind !== kind) category_id = null;
  }
  const base = { kind, account_id, category_id, client_id: textField(fd.get("client_id")), notes: textField(fd.get("notes")) };

  if (id) {
    const { error } = await sb.from("fin_entries").update({ ...base, description, amount, due_date, paid_date }).eq("id", id);
    if (error) throw new Error(error.message);
    return done(back);
  }
  const n = Math.min(60, Math.max(1, Math.floor(Number(String(fd.get("repeat") ?? "1")) || 1)));
  const split = fd.get("repeat_mode") === "parcelado";
  const amounts = n > 1 && split ? splitAmount(amount, n) : Array.from({ length: n }, () => amount);
  const group_id = n > 1 ? crypto.randomUUID() : null;
  const rows = amounts.map((a, i) => ({
    ...base, description: n > 1 ? `${description} (${i + 1}/${n})` : description, amount: a, due_date: addMonthsKeepDay(due_date, i),
    paid_date: i === 0 ? paid_date : null, group_id, installment: n > 1 ? i + 1 : null, installments: n > 1 ? n : null,
  }));
  const { error } = await sb.from("fin_entries").insert(rows);
  if (error) throw new Error(error.message);
  done(back);
}

export async function settleEntry(fd: FormData) {
  const sb = await guard();
  const back = backTo(fd);
  const paid = textField(fd.get("paid_date")) ?? todayISO();
  if (!isValidISO(paid)) return fail(back, "data");
  const { error } = await sb.from("fin_entries").update({ paid_date: paid }).eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  done(back);
}

export async function reopenEntry(fd: FormData) {
  const sb = await guard();
  const { error } = await sb.from("fin_entries").update({ paid_date: null }).eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  done(backTo(fd));
}

export async function deleteEntry(fd: FormData) {
  const sb = await guard();
  const { error } = await sb.from("fin_entries").delete().eq("id", String(fd.get("id")));
  if (error) throw new Error(error.message);
  done(backTo(fd));
}

/* ---------- Contas e categorias ---------- */
const CAD = "/caixa/cadastros";

export async function addAccount(fd: FormData) {
  const sb = await guard();
  const name = textField(fd.get("name"));
  if (!name) return fail(CAD, "nome");
  const { data: last } = await sb.from("fin_accounts").select("sort").order("sort", { ascending: false }).limit(1);
  const { error } = await sb.from("fin_accounts").insert({ name, kind: String(fd.get("kind") ?? "banco"), opening_balance: moneyField(fd.get("opening")) ?? 0, sort: (last?.[0]?.sort ?? 0) + 1 });
  if (error) return fail(CAD, error.code === "23505" ? "existe" : "criar");
  done(CAD);
}

export async function saveAccounts(fd: FormData) {
  const sb = await guard();
  const contractAcc = textField(fd.get("contract_account"));
  if (contractAcc) {
    await sb.from("fin_accounts").update({ receives_contracts: false }).eq("receives_contracts", true);
    await sb.from("fin_accounts").update({ receives_contracts: true }).eq("id", contractAcc);
  }
  for (const id of fd.getAll("id").map(String)) {
    const name = textField(fd.get(`name|${id}`));
    if (!name) return fail(CAD, "nome");
    const { error } = await sb.from("fin_accounts").update({
      name, kind: String(fd.get(`kind|${id}`) ?? "banco"), opening_balance: moneyField(fd.get(`opening|${id}`)) ?? 0, active: fd.get(`active|${id}`) === "on",
    }).eq("id", id);
    if (error) return fail(CAD, error.code === "23505" ? "existe" : "criar");
  }
  done(CAD);
}

export async function addCategory(fd: FormData) {
  const sb = await guard();
  const name = textField(fd.get("name"));
  const kind = String(fd.get("kind"));
  if (!name || (kind !== "entrada" && kind !== "saida")) return fail(CAD, "nome");
  const { error } = await sb.from("fin_categories").insert({ name, kind });
  if (error) return fail(CAD, error.code === "23505" ? "existe" : "criar");
  done(CAD);
}

export async function saveCategories(fd: FormData) {
  const sb = await guard();
  for (const id of fd.getAll("id").map(String)) {
    const name = textField(fd.get(`name|${id}`));
    if (!name) return fail(CAD, "nome");
    const { error } = await sb.from("fin_categories").update({ name, active: fd.get(`active|${id}`) === "on" }).eq("id", id);
    if (error) return fail(CAD, error.code === "23505" ? "existe" : "criar");
  }
  done(CAD);
}

/* ---------- Importação de planilha (texto colado) ---------- */
export type ImportRow = { description: string; due_date: string; amount: number; paid: boolean; notes: string | null };
export type ImportResult = { ok: true; inserted: number; skipped: number; firstMonth: string } | { ok: false; error: string };

export async function importEntries(input: { kind: string; account_id: string | null; category_id: string | null; rows: ImportRow[] }): Promise<ImportResult> {
  const sb = await guard();
  if (input.kind !== "entrada" && input.kind !== "saida") return { ok: false, error: "Tipo inválido." };
  const rows = input.rows.filter((r) => r.description.trim() && isValidISO(r.due_date) && r.amount > 0);
  if (rows.length === 0) return { ok: false, error: "Nenhuma linha válida para importar." };
  if (rows.length > 500) return { ok: false, error: "Importe no máximo 500 linhas por vez." };
  let category_id = input.category_id;
  if (category_id) {
    const { data: cat } = await sb.from("fin_categories").select("kind").eq("id", category_id).maybeSingle();
    if (!cat || cat.kind !== input.kind) category_id = null;
  }
  const dates = rows.map((r) => r.due_date).sort();
  const { data: existing } = await sb.from("fin_entries").select("description,due_date,amount").eq("kind", input.kind).gte("due_date", dates[0]).lte("due_date", dates[dates.length - 1]);
  const key = (d: string, due: string, a: number) => `${d.trim().toLowerCase()}|${due}|${Number(a).toFixed(2)}`;
  const seen = new Set((existing ?? []).map((e) => key(e.description as string, e.due_date as string, Number(e.amount))));
  const fresh = rows.filter((r) => !seen.has(key(r.description, r.due_date, r.amount)));
  if (fresh.length) {
    const { error } = await sb.from("fin_entries").insert(fresh.map((r) => ({
      kind: input.kind, description: r.description.trim(), amount: r.amount, due_date: r.due_date, paid_date: r.paid ? r.due_date : null,
      account_id: input.account_id, category_id, notes: r.notes,
    })));
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/caixa", "layout");
  return { ok: true, inserted: fresh.length, skipped: rows.length - fresh.length, firstMonth: `${dates[0].slice(0, 7)}-01` };
}
