import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { canManageUsers } from "@/lib/roles";
import { adminGroup, type NavEntry } from "@/lib/nav";
import AppHeader from "@/components/AppHeader";

const NAV: NavEntry[] = [
  ["/dev", "Painel"],
  ["/dev/projetos", "Projetos"],
  { label: "Trabalho", items: [["/dev/minhas", "Minhas tarefas"], ["/dev/horas", "Horas"]] },
];

/** Gestão de Projetos de Software. */
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const access = await getAccess(supabase);
  if (!access) redirect("/login");
  if (!access.modules.includes("dev")) redirect("/modulos");
  const nav = [...NAV];
  if (access.modules.includes("agenda")) nav.push(["/agenda", "Agenda"]);
  nav.push(adminGroup(canManageUsers(access.role)));
  return (
    <div className="min-h-screen">
      <AppHeader title="Projetos de Software" nav={nav} canSwitch={access.modules.length > 1} />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
