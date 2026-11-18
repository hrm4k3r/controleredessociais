import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from "./caixa";

/** Primeiro acesso: cria contas e categorias padrão (só quando não existe nenhuma). */
export async function ensureCaixaDefaults(sb: SupabaseClient) {
  const [{ data: a }, { data: c }] = await Promise.all([sb.from("fin_accounts").select("id").limit(1), sb.from("fin_categories").select("id").limit(1)]);
  if (!a?.length) await sb.from("fin_accounts").insert(DEFAULT_ACCOUNTS.map((x, i) => ({ ...x, sort: i + 1 })));
  if (!c?.length) await sb.from("fin_categories").insert(DEFAULT_CATEGORIES);
}
