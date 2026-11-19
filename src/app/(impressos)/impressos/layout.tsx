import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { canManageUsers } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";

const NAV: [string, string][] = [
  ["/impressos", "Quadro"],
  ["/impressos/trabalhos", "Trabalhos"],
  ["/clientes", "Clientes"],
];

/** Gestão de Materiais Impressos. */
export default async function ImpressosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const access = await getAccess(supabase);
  if (!access) redirect("/login");
  if (!access.modules.includes("impressos")) redirect("/modulos");
  const nav = [...NAV];
  if (access.modules.includes("agenda")) nav.push(["/agenda", "Agenda"]);
  if (canManageUsers(access.role)) nav.push(["/usuarios", "Usuários"]);
  return (
    <div className="min-h-screen">
      <AppHeader title="Materiais Impressos" nav={nav} canSwitch={access.modules.length > 1} />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
