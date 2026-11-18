import type { SupabaseClient } from "@supabase/supabase-js";

let present = false;

/**
 * Restringe consultas de `clients` aos clientes da gestão de redes sociais (clients.modules contém 'social').
 * Antes da migração de módulos a coluna não existe: então não filtra (compatível).
 */
export async function socialClientFilter(sb: SupabaseClient): Promise<<Q>(q: Q) => Q> {
  if (!present) {
    const { error } = await sb.from("clients").select("modules").limit(1);
    present = !error;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Q,>(q: Q): Q => (present ? (q as any).contains("modules", ["social"]) : q);
}
