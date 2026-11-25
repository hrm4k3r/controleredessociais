import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { canManageUsers } from "@/lib/roles";
import { adminGroup, type NavEntry } from "@/lib/nav";
import AppHeader from "@/components/AppHeader";
import PomodoroDock from "@/components/PomodoroDock";

const NAV: NavEntry[] = [
  ["/", "Painel"],
  { label: "Conteúdo", items: [["/postagens", "Postagens"], ["/tarefas", "Tarefas"]] },
  { label: "Desempenho", items: [["/metricas", "Métricas"], ["/resultados", "Resultados"], ["/evolucao", "Evolução"], ["/relatorio", "Relatório"]] },
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
  nav.push(adminGroup(canManageUsers(access.role)));
  return (
    <div className="min-h-screen">
      <AppHeader title="Redes Sociais" nav={nav} canSwitch={access.modules.length > 1} />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
      <PomodoroDock />
    </div>
  );
}
