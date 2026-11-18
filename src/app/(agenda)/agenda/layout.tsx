import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { canManageUsers } from "@/lib/roles";
import { moduleById } from "@/lib/modules";
import AppHeader from "@/components/AppHeader";

/** Agenda: disponível a quem tem o módulo; o menu leva às outras gestões liberadas. */
export default async function AgendaLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const access = await getAccess(sb);
  if (!access) redirect("/login");
  if (!access.modules.includes("agenda")) redirect("/modulos");
  const nav: [string, string][] = [["/agenda", "Agenda"], ...access.modules.filter((m) => m !== "agenda").map((m): [string, string] => [moduleById(m).href, moduleById(m).name])];
  if (canManageUsers(access.role)) nav.push(["/usuarios", "Usuários"]);
  return (
    <div className="min-h-screen">
      <AppHeader title="Agenda" nav={nav} canSwitch={access.modules.length > 1} />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
