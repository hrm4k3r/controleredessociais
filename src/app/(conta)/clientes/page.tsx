import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { ErrorBox, Flash } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import { one, ok as okParam } from "@/lib/params";
import { CLIENT_SERVICES, parseModules, shortName } from "@/lib/modules";
import { redirect } from "next/navigation";
import { addClient, saveClients } from "./actions";

export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { nome: "Informe o nome do cliente.", servico: "Cada cliente ativo precisa usar ao menos um serviço.", existe: "Já existe um cliente com esse nome." };

/** Cadastro único de clientes, compartilhado entre as gestões. */
export default async function Clientes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const access = await getAccess(sb);
  if (!access) redirect("/login");
  const services = CLIENT_SERVICES.filter((m) => access.orgModules.includes(m));
  const hasSocial = services.includes("social");
  let res = await sb.from("clients").select("id,name,is_internal,weekly_goal,sort,active,modules").order("sort");
  if (res.error) res = (await sb.from("clients").select("id,name,is_internal,weekly_goal,sort,active")) as typeof res;
  const clients = (res.data ?? []) as { id: string; name: string; is_internal: boolean; weekly_goal: number; active: boolean; modules?: string[] }[];
  const erro = one(sp.erro);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Clientes</h1>
      <p className="-mt-3 text-sm text-slate-600">Cadastro único para todas as gestões. Marque quais serviços cada cliente usa: ele só aparece nas gestões marcadas.</p>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro ? ERR[erro] : undefined} />

      <section className="card space-y-3">
        <form action={saveClients} className="space-y-3">
          {clients.map((c) => {
            const mods = parseModules(c.modules ?? ["social"]);
            return (
              <div key={c.id} className="grid items-end gap-3 border-b border-line pb-3 last:border-0 sm:grid-cols-[1fr_auto_8rem_auto]">
                <input type="hidden" name="id" value={c.id} />
                <div><label className="label">Nome{c.is_internal ? " (conta própria)" : ""}</label><input name={`name|${c.id}`} defaultValue={c.name} className={`input ${c.active ? "" : "opacity-60"}`} /></div>
                <div>
                  <div className="label">Serviços</div>
                  <div className="flex flex-wrap gap-2">
                    {services.map((m) => (
                      <label key={m} className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-sm"><input type="checkbox" name={`svc|${c.id}`} value={m} defaultChecked={mods.includes(m)} className="h-4 w-4" />{shortName(m)}</label>
                    ))}
                  </div>
                </div>
                {hasSocial ? <div><label className="label">Meta posts/semana</label><input name={`goal|${c.id}`} type="number" min={0} defaultValue={c.weekly_goal} className="input" /></div> : <input type="hidden" name={`goal|${c.id}`} value={c.weekly_goal} />}
                <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name={`active|${c.id}`} defaultChecked={c.active} className="h-4 w-4" /> Ativo</label>
              </div>
            );
          })}
          <SubmitButton className="btn">Salvar clientes</SubmitButton>
        </form>
      </section>

      <section className="card">
        <form action={addClient} className="flex flex-wrap items-end gap-3">
          <div><label className="label">Novo cliente</label><input name="name" required className="input" /></div>
          <div>
            <div className="label">Serviços</div>
            <div className="flex flex-wrap gap-2">
              {services.map((m) => <label key={m} className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-sm"><input type="checkbox" name="svc" value={m} defaultChecked className="h-4 w-4" />{shortName(m)}</label>)}
            </div>
          </div>
          {hasSocial && <div><label className="label">Meta posts/semana</label><input name="goal" type="number" min={0} defaultValue={2} className="input !w-28" /></div>}
          {hasSocial && <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="internal" className="h-4 w-4" /> Conta própria</label>}
          <SubmitButton className="btn btn-ghost" pendingText="Adicionando…">Adicionar</SubmitButton>
        </form>
      </section>
    </div>
  );
}
