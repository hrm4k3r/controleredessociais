"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { intField, textField } from "@/lib/form";
import { CLIENT_SERVICES, parseModules } from "@/lib/modules";

async function guard() {
  const sb = await createClient();
  const a = await getAccess(sb);
  if (!a) redirect("/login");
  if (a.modules.length === 0) redirect("/modulos");
  return { sb, a };
}
const done = (q: string): never => {
  revalidatePath("/", "layout");
  redirect(`/clientes?${q}`);
};

/** Serviços marcados, limitados aos que a organização contratou. */
const services = (fd: FormData, key: string, allowed: string[]) => parseModules(fd.getAll(key).map(String)).filter((m) => CLIENT_SERVICES.includes(m) && allowed.includes(m));

export async function saveClients(fd: FormData) {
  const { sb, a } = await guard();
  const rows = fd.getAll("id").map(String).map((id) => ({
    id, name: textField(fd.get(`name|${id}`)), weekly_goal: intField(fd.get(`goal|${id}`)) ?? 0,
    modules: services(fd, `svc|${id}`, a.orgModules), active: fd.get(`active|${id}`) === "on",
  }));
  if (rows.some((r) => !r.name)) done("erro=nome");
  if (rows.some((r) => r.active && r.modules.length === 0)) done("erro=servico");
  for (const r of rows) {
    const { error } = await sb.from("clients").update({ name: r.name, weekly_goal: r.weekly_goal, modules: r.modules.length ? r.modules : ["social"], active: r.active }).eq("id", r.id);
    if (error) throw new Error(error.message);
  }
  done("ok=1");
}

export async function addClient(fd: FormData) {
  const { sb, a } = await guard();
  const name = textField(fd.get("name"));
  if (!name) done("erro=nome");
  const mods = services(fd, "svc", a.orgModules);
  if (mods.length === 0) done("erro=servico");
  const { data: dup } = await sb.from("clients").select("id").eq("name", name!).maybeSingle();
  if (dup) done("erro=existe");
  const { data: last } = await sb.from("clients").select("sort").order("sort", { ascending: false }).limit(1);
  const { error } = await sb.from("clients").insert({
    name, modules: mods, weekly_goal: intField(fd.get("goal")) ?? 0, is_internal: fd.get("internal") === "on", sort: (last?.[0]?.sort ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  done("ok=1");
}
