import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { canManageUsers } from "@/lib/roles";
import { ensureCaixaDefaults } from "@/lib/caixa-server";
import AppHeader from "@/components/AppHeader";

const NAV: [string, string][] = [
  ["/caixa", "Painel"],
  ["/caixa/lancamentos", "Lançamentos"],
  ["/caixa/contratos", "Contratos"],
  ["/caixa/cadastros", "Contas e categorias"],
  ["/clientes", "Clientes"],
];

/** Gestão Financeira (fluxo de caixa): só proprietário/administrador com o módulo liberado. */
export default async function CaixaLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const access = await getAccess(sb);
  if (!access) redirect("/login");
  if (!access.modules.includes("financeiro")) redirect("/modulos");
  await ensureCaixaDefaults(sb);
  const nav = [...NAV];
  if (canManageUsers(access.role)) nav.push(["/usuarios", "Usuários"]);
  return (
    <div className="min-h-screen">
      <AppHeader title="Financeiro" nav={nav} canSwitch={access.modules.length > 1} />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
