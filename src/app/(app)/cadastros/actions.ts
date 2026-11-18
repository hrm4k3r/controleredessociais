"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { intField, textField } from "@/lib/form";

const done = (msg = "ok=1") => {
  revalidatePath("/", "layout");
  redirect(`/cadastros?${msg}`);
};
const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export async function saveAccounts(fd: FormData) {
  const sb = await createClient();
  const client_id = String(fd.get("client_id"));
  const wanted = new Set(fd.getAll("net").map(String));
  const { data } = await sb.from("accounts").select("network").eq("client_id", client_id);
  const have = new Set((data ?? []).map((a) => a.network as string));
  const add = [...wanted].filter((n) => !have.has(n)).map((network) => ({ client_id, network }));
  const del = [...have].filter((n) => !wanted.has(n));
  if (add.length) fail((await sb.from("accounts").insert(add)).error);
  if (del.length) fail((await sb.from("accounts").delete().eq("client_id", client_id).in("network", del)).error);
  done();
}

export async function addEmail(fd: FormData) {
  const sb = await createClient();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) done("erro=email");
  fail((await sb.from("client_emails").upsert({ client_id: String(fd.get("client_id")), email, name: textField(fd.get("name")) }, { onConflict: "client_id,email" })).error);
  done();
}

export async function removeEmail(fd: FormData) {
  const sb = await createClient();
  fail((await sb.from("client_emails").delete().eq("id", String(fd.get("id")))).error);
  done();
}

export async function addListItem(fd: FormData) {
  const sb = await createClient();
  const kind = String(fd.get("kind"));
  const label = textField(fd.get("label"));
  if (!label || !["network", "format", "theme"].includes(kind)) done();
  const { data: last } = await sb.from("list_items").select("sort").eq("kind", kind).order("sort", { ascending: false }).limit(1);
  const { error } = await sb.from("list_items").insert({ kind, label, sort: (last?.[0]?.sort ?? 0) + 1 });
  if (error && error.code !== "23505") fail(error); // 23505 = item já existe
  done();
}

export async function removeListItem(fd: FormData) {
  const sb = await createClient();
  fail((await sb.from("list_items").delete().eq("kind", String(fd.get("kind"))).eq("label", String(fd.get("label")))).error);
  done();
}
