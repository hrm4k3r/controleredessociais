"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireManager } from "@/lib/access";
import { canAssign, canManageTarget, type Role } from "@/lib/roles";

const back = (q: string): never => {
  revalidatePath("/usuarios");
  redirect(`/usuarios?${q}`);
};
const isRole = (v: string): v is Role => v === "colaborador" || v === "admin" || v === "owner";

function admin() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export async function createUser(fd: FormData) {
  const me = await requireManager(await createClient());
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const name = String(fd.get("name") ?? "").trim() || null;
  const password = String(fd.get("password") ?? "");
  const role = String(fd.get("role") ?? "colaborador");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("erro=email");
  if (password.length < 8) back("erro=senha");
  if (!isRole(role) || !canAssign(me.role, role)) back("erro=permissao");
  const sb = admin();
  if (!sb) return back("erro=chave");
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return back(/already|registered|exists/i.test(error?.message ?? "") ? "erro=existe" : "erro=criar");
  const { error: e2 } = await sb.from("organization_members").insert({ organization_id: me.orgId, user_id: data.user.id, role, display_name: name ?? email.split("@")[0] });
  if (e2) {
    await sb.auth.admin.deleteUser(data.user.id);
    back("erro=criar");
  }
  back("ok=1");
}

async function targetOf(fd: FormData, orgId: string) {
  const userId = String(fd.get("user_id") ?? "");
  const sb = admin();
  if (!sb) return back("erro=chave");
  const { data } = await sb.from("organization_members").select("role").eq("organization_id", orgId).eq("user_id", userId).maybeSingle();
  if (!data) return back("erro=permissao");
  return { sb, userId, role: data.role as Role };
}

export async function changeRole(fd: FormData) {
  const me = await requireManager(await createClient());
  const t = await targetOf(fd, me.orgId);
  const role = String(fd.get("role") ?? "");
  if (t.userId === me.userId || !isRole(role) || !canManageTarget(me.role, t.role) || !canAssign(me.role, role)) back("erro=permissao");
  const { error } = await t.sb.from("organization_members").update({ role }).eq("organization_id", me.orgId).eq("user_id", t.userId);
  if (error) back("erro=criar");
  back("ok=1");
}

export async function setDisplayName(fd: FormData) {
  const me = await requireManager(await createClient());
  const t = await targetOf(fd, me.orgId);
  const name = String(fd.get("name") ?? "").trim().slice(0, 60);
  if (!name) back("erro=nome");
  if (t.userId !== me.userId && !canManageTarget(me.role, t.role)) back("erro=permissao");
  const { error } = await t.sb.from("organization_members").update({ display_name: name }).eq("organization_id", me.orgId).eq("user_id", t.userId);
  if (error) back("erro=criar");
  back("ok=1");
}

export async function setPassword(fd: FormData) {
  const me = await requireManager(await createClient());
  const t = await targetOf(fd, me.orgId);
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) back("erro=senha");
  if (t.userId !== me.userId && !canManageTarget(me.role, t.role)) back("erro=permissao");
  const { error } = await t.sb.auth.admin.updateUserById(t.userId, { password });
  if (error) back("erro=criar");
  back("ok=1");
}

export async function removeUser(fd: FormData) {
  const me = await requireManager(await createClient());
  const t = await targetOf(fd, me.orgId);
  if (t.userId === me.userId || !canManageTarget(me.role, t.role)) back("erro=permissao");
  await t.sb.from("organization_members").delete().eq("organization_id", me.orgId).eq("user_id", t.userId);
  const { error } = await t.sb.auth.admin.deleteUser(t.userId);
  if (error) back("erro=criar");
  back("ok=1");
}
