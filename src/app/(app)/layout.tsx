import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { canManageUsers } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import PomodoroDock from "@/components/PomodoroDock";

const NAV: [string, string][] = [
  ["/", "Painel"],
  ["/postagens", "Postagens"],
  ["/tarefas", "Tarefas"],
  ["/metricas", "Métricas"],
  ["/resultados", "Resultados"],
  ["/evolucao", "Evolução"],
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
  if (access.modules.includes("agenda")) nav.push(["/agenda", "Agenda"]);
  if (canManageUsers(access.role)) nav.push(["/tempo", "Tempo"], ["/usuarios", "Usuários"]);
  return (
    <div className="min-h-screen">
      <AppHeader title="Redes Sociais" nav={nav} canSwitch={access.modules.length > 1} />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
      <PomodoroDock />
    </div>
  );
}
