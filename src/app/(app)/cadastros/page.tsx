import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { socialClientFilter } from "@/lib/social-clients";
import { getAccess } from "@/lib/access";
import { loadLists } from "@/lib/data";
import { ErrorBox, Flash } from "@/components/ui";
import { one, ok as okParam } from "@/lib/params";
import { addEmail, addListItem, removeEmail, removeListItem, saveAccounts } from "./actions";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = { nome: "Informe o nome do cliente.", email: "E-mail inválido." };

export default async function Cadastros({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const onlySocial = await socialClientFilter(sb);
  const [{ data: clients }, { data: accounts }, { data: emails }, lists] = await Promise.all([
    onlySocial(sb.from("clients").select("id,name,is_internal,weekly_goal,sort").eq("active", true)).order("sort"),
    sb.from("accounts").select("client_id,network"),
    sb.from("client_emails").select("id,client_id,email,name").order("email"),
    loadLists(sb),
  ]);
  const erro = one(sp.erro);
  const finance = (await getAccess(sb))?.modules.includes("financeiro") ?? false;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Cadastros</h1>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro ? ERR[erro] : undefined} />

      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-navy">Clientes e meta de posts por semana</h2>
          <p className="text-sm text-slate-600">O cadastro de clientes é único para todas as gestões (nome, serviços usados e meta de posts).</p>
        </div>
        <Link href="/clientes" className="btn">Gerenciar clientes</Link>
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold text-navy">Contas (redes) de cada cliente</h2>
        {(clients ?? []).map((c) => {
          const have = new Set((accounts ?? []).filter((a) => a.client_id === c.id).map((a) => a.network));
          return (
            <form key={c.id} action={saveAccounts} className="flex flex-wrap items-center gap-2 border-b border-line pb-3 last:border-0">
              <input type="hidden" name="client_id" value={c.id} />
              <span className="w-48 font-semibold">{c.name}</span>
              {lists.networks.map((n) => (
                <label key={n} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-sm"><input type="checkbox" name="net" value={n} defaultChecked={have.has(n)} /> {n}</label>
              ))}
              <SubmitButton className="btn btn-ghost ml-auto">Salvar</SubmitButton>
            </form>
          );
        })}
        <p className="text-xs text-slate-500">Desmarcar uma rede remove a conta da lista; dados já lançados continuam guardados no banco.</p>
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold text-navy">E-mails dos destinatários do relatório</h2>
        {(clients ?? []).map((c) => (
          <div key={c.id} className="border-b border-line pb-3 last:border-0">
            <div className="mb-2 font-semibold">{c.name}</div>
            <div className="mb-2 flex flex-wrap gap-2">
              {(emails ?? []).filter((e) => e.client_id === c.id).map((e) => (
                <form key={e.id} action={removeEmail} className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm">
                  <input type="hidden" name="id" value={e.id} />{e.name ? `${e.name} · ` : ""}{e.email}
                  <button className="rounded-full px-2 text-red-600 hover:bg-red-100" aria-label="Remover">×</button>
                </form>
              ))}
              {!(emails ?? []).some((e) => e.client_id === c.id) && <span className="text-sm text-slate-500">nenhum e-mail cadastrado</span>}
            </div>
            <form action={addEmail} className="flex flex-wrap gap-2">
              <input type="hidden" name="client_id" value={c.id} />
              <input name="email" type="email" required placeholder="email@cliente.com.br" className="input !w-64" />
              <input name="name" placeholder="Nome (opcional)" className="input !w-48" />
              <SubmitButton className="btn btn-ghost">Adicionar</SubmitButton>
            </form>
          </div>
        ))}
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold text-navy">Listas editáveis</h2>
        <p className="text-sm text-slate-600">Status do post é fixo (Postado, Agendado, Planejado, Não postado), pois “Postado” é a regra da meta.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {([["network", "Redes", lists.networks], ["format", "Formatos", lists.formats], ["theme", "Temas", lists.themes]] as const).map(([kind, title, items]) => (
            <div key={kind}>
              <h3 className="mb-2 text-sm font-semibold">{title}</h3>
              <ul className="mb-2 space-y-1">
                {items.map((label) => (
                  <li key={label}>
                    <form action={removeListItem} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-sm">
                      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="label" value={label} />
                      {label}<button className="px-2 text-red-600" aria-label={`Remover ${label}`}>×</button>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={addListItem} className="flex gap-2"><input type="hidden" name="kind" value={kind} /><input name="label" required className="input" placeholder="Novo item" /><SubmitButton className="btn btn-ghost" pendingText="…">+</SubmitButton></form>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold text-navy">Backup (exportar dados)</h2>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href="/exportar/xlsx">Baixar tudo (XLSX)</a>
          {["clientes", "postagens", "resultados", "metricas", ...(finance ? ["pagamentos"] : [])].map((t) => <a key={t} className="btn btn-ghost" href={`/exportar/csv/${t}`}>{t}.csv</a>)}
        </div>
      </section>
    </div>
  );
}
