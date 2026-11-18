import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { canManageUsers, canSeeFinance, type Role } from "./roles";
import { ALL_MODULES, effectiveModules, parseModules, type ModuleId } from "./modules";

export type Access = {
  userId: string; orgId: string | null; role: Role | null;
  /** Gestões contratadas pela organização. */
  orgModules: ModuleId[];
  /** Gestões que este usuário pode abrir. */
  modules: ModuleId[];
};

/** Usuário logado + organização, papel e módulos (null se não estiver logado). */
export async function getAccess(sb: SupabaseClient): Promise<Access | null> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const env = process.env.ENABLED_MODULES;
  let res = await sb.from("organization_members").select("organization_id,role,modules").eq("user_id", u.user.id).order("created_at").limit(1);
  // Antes da migração de módulos a coluna não existe: segue sem restrição (compatível).
  const legacy = !!res.error;
  if (legacy) res = (await sb.from("organization_members").select("organization_id,role").eq("user_id", u.user.id).order("created_at").limit(1)) as typeof res;
  const m = res.data?.[0] as { organization_id?: string; role?: Role; modules?: unknown } | undefined;
  const orgId = m?.organization_id ?? null;
  let orgModules: ModuleId[] = ALL_MODULES;
  if (orgId && !legacy) {
    const { data: o, error } = await sb.from("organizations").select("modules").eq("id", orgId).maybeSingle();
    if (!error && o) orgModules = parseModules(o.modules);
  }
  const role = m?.role ?? null;
  const allowedOrg = effectiveModules({ org: orgModules, member: null, role: "owner", env });
  // O Financeiro (caixa) é restrito a proprietário/administrador, mesmo que o módulo esteja liberado.
  const modules = orgId ? effectiveModules({ org: orgModules, member: m?.modules ?? null, role, env }).filter((x) => x !== "financeiro" || canSeeFinance(role)) : [];
  return { userId: u.user.id, orgId, role, orgModules: allowedOrg, modules };
}

export async function requireFinance(sb: SupabaseClient): Promise<Access> {
  const a = await getAccess(sb);
  if (!a) redirect("/login");
  if (!a.modules.includes("social") || !canSeeFinance(a.role)) redirect("/");
  return a;
}

export async function requireManager(sb: SupabaseClient): Promise<Access & { orgId: string }> {
  const a = await getAccess(sb);
  if (!a) redirect("/login");
  if (!canManageUsers(a.role) || !a.orgId) redirect("/modulos");
  return a as Access & { orgId: string };
}

/** Exige acesso a uma gestão; sem acesso, volta para a escolha de gestão. */
export async function requireModule(sb: SupabaseClient, mod: ModuleId): Promise<Access> {
  const a = await getAccess(sb);
  if (!a) redirect("/login");
  if (!a.modules.includes(mod)) redirect("/modulos");
  return a;
}
