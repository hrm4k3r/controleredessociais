import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadMemberNames } from "@/lib/members";
import { ErrorBox } from "@/components/ui";
import EntryForm from "@/components/EntryForm";
import Author from "@/components/Author";
import { one } from "@/lib/params";
import { todayISO } from "@/lib/dates";
import { ENTRY_COLS, type Account, type Category, type Entry } from "@/lib/caixa";
import { saveEntry } from "../../actions";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { dados: "Dados inválidos.", descricao: "Informe a descrição.", valor: "Informe um valor maior que zero.", data: "Data inválida." };

export default async function EditarLancamento({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const sb = await createClient();
  const [en, ac, ca, cl, names] = await Promise.all([
    sb.from("fin_entries").select(ENTRY_COLS).eq("id", id).maybeSingle(),
    sb.from("fin_accounts").select("id,name,kind,opening_balance,active,sort").order("sort"),
    sb.from("fin_categories").select("id,kind,name,active").order("name"),
    sb.from("clients").select("id,name").eq("active", true).order("name"),
    loadMemberNames(sb),
  ]);
  if (!en.data) notFound();
  const e = { ...(en.data as Entry), amount: Number(en.data.amount) };
  const back = one(sp.back)?.startsWith("/caixa") ? one(sp.back)! : "/caixa/lancamentos";
  const erro = one(sp.erro);
  return (
    <div className="space-y-5">
      <Link href={back} className="text-sm text-accent underline">← Voltar aos lançamentos</Link>
      <h1 className="page-title">Editar lançamento</h1>
      {e.created_by && <p className="-mt-3 text-xs text-slate-600"><span className="inline-flex items-center gap-1">Lançado por <Author name={names[e.created_by] ?? "Usuário"} /></span></p>}
      <ErrorBox text={erro ? ERR[erro] : undefined} />
      <div className="card">
        <EntryForm action={saveEntry} accounts={(ac.data ?? []).map((a) => ({ ...a, opening_balance: Number(a.opening_balance) })) as Account[]} categories={(ca.data ?? []) as Category[]} clients={(cl.data ?? []) as { id: string; name: string }[]} initial={e} back={back} defaultDate={todayISO()} submitLabel="Salvar alterações" />
      </div>
    </div>
  );
}
