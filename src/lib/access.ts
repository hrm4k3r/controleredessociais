import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { canManageUsers, canSeeFinance, type Role } from "./roles";

export type Access = { userId: string; orgId: string | null; role: Role | null };

/** Usuário logado + organização e papel (null se não for membro de nenhuma organização). */
export async function getAccess(sb: SupabaseClient): Promise<Access | null> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const { data } = await sb.from("organization_members").select("organization_id,role").eq("user_id", u.user.id).order("created_at").limit(1);
  const m = data?.[0];
  return { userId: u.user.id, orgId: (m?.organization_id as string | undefined) ?? null, role: (m?.role as Role | undefined) ?? null };
}

export async function requireFinance(sb: SupabaseClient): Promise<Access> {
  const a = await getAccess(sb);
  if (!a) redirect("/login");
  if (!canSeeFinance(a.role)) redirect("/");
  return a;
}

export async function requireManager(sb: SupabaseClient): Promise<Access & { orgId: string }> {
  const a = await getAccess(sb);
  if (!a) redirect("/login");
  if (!canManageUsers(a.role) || !a.orgId) redirect("/");
  return a as Access & { orgId: string };
}
