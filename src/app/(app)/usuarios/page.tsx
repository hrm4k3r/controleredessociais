import SubmitButton from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireManager } from "@/lib/access";
import { ErrorBox, Flash } from "@/components/ui";
import { one, ok as okParam } from "@/lib/params";
import { ROLE_LABEL, canAssign, canManageTarget, type Role } from "@/lib/roles";
import { changeRole, createUser, removeUser, setDisplayName, setPassword } from "./actions";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  email: "E-mail inválido.", senha: "A senha precisa ter pelo menos 8 caracteres.", existe: "Já existe um usuário com esse e-mail.",
  permissao: "Você não tem permissão para essa ação.", criar: "Não foi possível concluir. Tente novamente.",
  nome: "Informe o nome.", chave: "SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor (necessária para gerenciar usuários).",
};

export default async function Usuarios({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sb = await createClient();
  const me = await requireManager(sb);
  const erro = one(sp.erro);

  const { data: members } = await sb.from("organization_members").select("user_id,role,display_name,created_at").eq("organization_id", me.orgId).order("created_at");
  const emailOf = new Map<string, string>();
  let adminOk = true;
  try {
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) emailOf.set(u.id, u.email ?? "");
  } catch {
    adminOk = false;
  }
  const assignable = (["colaborador", "admin"] as Role[]).filter((r) => canAssign(me.role, r));

  return (
    <div className="space-y-6">
      <h1 className="page-title">Usuários</h1>
      <Flash ok={okParam(sp)} />
      <ErrorBox text={erro ? ERR[erro] : !adminOk ? ERR.chave : undefined} />

      <section className="card space-y-3">
        <h2 className="font-bold text-navy">Novo usuário</h2>
        <p className="text-xs text-slate-500">O acesso é criado já ativo. Passe a senha inicial à pessoa por um canal seguro; ela pode ser trocada aqui depois. <b>Colaboradores não veem o Financeiro</b> (nem nas exportações).</p>
        <form action={createUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div><label className="label">Nome</label><input name="name" className="input" placeholder="Opcional" /></div>
          <div><label className="label">E-mail</label><input name="email" type="email" required className="input" autoComplete="off" /></div>
          <div><label className="label">Senha inicial</label><input name="password" type="password" required minLength={8} className="input" autoComplete="new-password" /></div>
          <div>
            <label className="label">Acesso</label>
            <select name="role" className="input" defaultValue="colaborador">{assignable.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
          </div>
          <SubmitButton className="btn btn-accent" pendingText="Criando…">Criar usuário</SubmitButton>
        </form>
      </section>

      <section className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[760px]">
          <thead><tr>{["Nome / e-mail", "Acesso", "Nova senha", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {(members ?? []).map((m) => {
              const role = m.role as Role;
              const mine = m.user_id === me.userId;
              const editable = !mine && canManageTarget(me.role, role);
              const canPass = mine || editable;
              return (
                <tr key={m.user_id as string}>
                  <td className="td">
                    {canPass ? (
                      <form action={setDisplayName} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={m.user_id as string} />
                        <input name="name" required maxLength={60} defaultValue={(m.display_name as string | null) ?? ""} aria-label="Nome" className="input !w-40 font-medium" />
                        <SubmitButton className="btn btn-ghost">Salvar</SubmitButton>
                        {mine && <span className="text-xs text-slate-500">(você)</span>}
                      </form>
                    ) : <div className="font-medium">{(m.display_name as string | null) ?? "—"}</div>}
                    <div className="mt-1 text-xs text-slate-500">{emailOf.get(m.user_id as string)}</div>
                  </td>
                  <td className="td">
                    {editable ? (
                      <form action={changeRole} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={m.user_id as string} />
                        <select name="role" defaultValue={role} className="input !w-auto">{assignable.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                        <SubmitButton className="btn btn-ghost">Salvar</SubmitButton>
                      </form>
                    ) : ROLE_LABEL[role]}
                  </td>
                  <td className="td">
                    {canPass && (
                      <form action={setPassword} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={m.user_id as string} />
                        <input name="password" type="password" minLength={8} required placeholder="mín. 8 caracteres" autoComplete="new-password" className="input !w-44" />
                        <SubmitButton className="btn btn-ghost">Trocar</SubmitButton>
                      </form>
                    )}
                  </td>
                  <td className="td">
                    {editable && (
                      <form action={removeUser}>
                        <input type="hidden" name="user_id" value={m.user_id as string} />
                        <SubmitButton className="btn btn-danger" pendingText="Removendo…" confirm="Remover este usuário? Ele perde o acesso imediatamente.">Remover</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
