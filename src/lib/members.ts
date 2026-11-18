import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const local = (email?: string | null) => (email ? email.split("@")[0] : "");

/** Mapa user_id -> nome de exibição dos membros da organização (fallback: parte do e-mail antes do @). */
export async function loadMemberNames(sb: SupabaseClient): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  const missing: string[] = [];
  const { data } = await sb.from("organization_members").select("user_id,display_name");
  for (const m of data ?? []) {
    const n = (m.display_name as string | null)?.trim();
    if (n) names[m.user_id as string] = n; else missing.push(m.user_id as string);
  }
  const { data: me } = await sb.auth.getUser();
  if (me.user && !names[me.user.id] && local(me.user.email)) names[me.user.id] = local(me.user.email);
  if (missing.some((id) => !names[id])) {
    try {
      const { data: list } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
      for (const u of list?.users ?? []) if (!names[u.id] && local(u.email) && missing.includes(u.id)) names[u.id] = local(u.email);
    } catch {
      // sem service_role: segue sem nome para esses usuários
    }
  }
  return names;
}
