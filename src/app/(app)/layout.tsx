import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { canManageUsers } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";

const NAV: [string, string][] = [
  ["/", "Painel"],
  ["/postagens", "Postagens"],
  ["/tarefas", "Tarefas"],
  ["/metricas", "Métricas"],
  ["/resultados", "Resultados"],
  ["/relatorio", "Relatório"],
  ["/clientes", "Clientes"],
  ["/cadastros", "Cadastros"],
];

/** Gestão de Redes Sociais. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const access = await getAccess(supabase);
  if (!access) redirect("/login");
  if (!access.modules.includes("social")) redirect("/modulos");
  const nav = [...NAV];
  if (canManageUsers(access.role)) nav.push(["/usuarios", "Usuários"]);
  return (
    <div className="min-h-screen">
      <AppHeader title="Controle de Redes" nav={nav} canSwitch={access.modules.length > 1} />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
