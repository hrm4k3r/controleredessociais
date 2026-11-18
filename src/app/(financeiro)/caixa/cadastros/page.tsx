import { createClient } from "@/lib/supabase/server";
import { ErrorBox, Flash } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { one, ok as okParam } from "@/lib/params";
import { ACCOUNT_KINDS, type Account, type Category } from "@/lib/caixa";
import { addAccount, addCategory, saveAccounts, saveCategories } from "../actions";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { nome: "Informe o nome.", existe: "Já existe um item com esse nome.", criar: "Não foi possível salvar." };

export default async function Cadastros({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const [ac, ca] = await Promise.all([
    sb.from("fin_accounts").select("id,name,kind,opening_balance,active,sort").order("sort"),
    sb.from("fin_categories").select("id,kind,name,active").order("name"),
  ]);
  const accounts = ((ac.data ?? []) as Account[]).map((a) => ({ ...a, opening_balance: Number(a.opening_balance) }));
  const categories = (ca.data ?? []) as Category[];
  const erro = one(sp.erro);
  const Kind = ({ name, value }: { name: string; value: string }) => <select name={name} defaultValue={value} className="input">{ACCOUNT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Contas e categorias</h1>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro ? ERR[erro] : undefined} />

      <section className="card space-y-3">
        <h2 className="font-bold text-navy">Contas</h2>
        <p className="text-sm text-slate-600">O saldo inicial é o valor que a conta tinha antes do primeiro lançamento. O saldo atual soma o que foi recebido e subtrai o que foi pago.</p>
        <form action={saveAccounts} className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="grid items-end gap-3 sm:grid-cols-[1fr_12rem_9rem_auto]">
              <input type="hidden" name="id" value={a.id} />
              <div><label className="label">Nome</label><input name={`name|${a.id}`} defaultValue={a.name} className="input" /></div>
              <div><label className="label">Tipo</label><Kind name={`kind|${a.id}`} value={a.kind} /></div>
              <div><label className="label">Saldo inicial (R$)</label><input name={`opening|${a.id}`} inputMode="decimal" defaultValue={String(a.opening_balance).replace(".", ",")} className="input" /></div>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name={`active|${a.id}`} defaultChecked={a.active} className="h-4 w-4" /> Ativa</label>
            </div>
          ))}
          <SubmitButton className="btn">Salvar contas</SubmitButton>
        </form>
        <form action={addAccount} className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
          <div><label className="label">Nova conta</label><input name="name" required className="input" /></div>
          <div><label className="label">Tipo</label><Kind name="kind" value="banco" /></div>
          <div><label className="label">Saldo inicial (R$)</label><input name="opening" inputMode="decimal" defaultValue="0" className="input !w-32" /></div>
          <SubmitButton className="btn btn-ghost" pendingText="Adicionando…">Adicionar</SubmitButton>
        </form>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["entrada", "saida"] as const).map((kind) => (
          <section key={kind} className="card space-y-3">
            <h2 className="font-bold text-navy">{kind === "entrada" ? "Categorias de entrada" : "Categorias de saída"}</h2>
            <form action={saveCategories} className="space-y-2">
              {categories.filter((c) => c.kind === kind).map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <input type="hidden" name="id" value={c.id} />
                  <input name={`name|${c.id}`} defaultValue={c.name} aria-label="Nome da categoria" className="input" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={`active|${c.id}`} defaultChecked={c.active} className="h-4 w-4" /> Ativa</label>
                </div>
              ))}
              <SubmitButton className="btn">Salvar categorias</SubmitButton>
            </form>
            <form action={addCategory} className="flex items-end gap-3 border-t border-line pt-3">
              <input type="hidden" name="kind" value={kind} />
              <div className="flex-1"><label className="label">Nova categoria</label><input name="name" required className="input" /></div>
              <SubmitButton className="btn btn-ghost" pendingText="…">Adicionar</SubmitButton>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
