import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadAccounts } from "@/lib/caixa-server";
import ImportEntries from "@/components/ImportEntries";
import type { Category } from "@/lib/caixa";

export const dynamic = "force-dynamic";

export default async function Importar() {
  const sb = await createClient();
  const [accounts, ca] = await Promise.all([loadAccounts(sb), sb.from("fin_categories").select("id,kind,name,active").order("name")]);
  return (
    <div className="space-y-5">
      <Link href="/caixa/lancamentos" className="text-sm text-accent underline">← Voltar aos lançamentos</Link>
      <h1 className="page-title">Importar planilha</h1>
      <ImportEntries accounts={accounts} categories={(ca.data ?? []) as Category[]} />
    </div>
  );
}
