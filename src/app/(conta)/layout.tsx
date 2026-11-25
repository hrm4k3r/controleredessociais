import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { moduleById } from "@/lib/modules";
import { adminGroup, type NavEntry } from "@/lib/nav";
import AppHeader from "@/components/AppHeader";

/** Páginas comuns às gestões (ex.: Usuários): o menu leva a cada gestão liberada. */
export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const access = await getAccess(supabase);
  if (!access) redirect("/login");
  const nav: NavEntry[] = [{ label: "Gestões", items: access.modules.map((m): [string, string] => [moduleById(m).href, moduleById(m).name]) }];
  nav.push(adminGroup(access.role === "owner" || access.role === "admin"));
  return (
    <div className="min-h-screen">
      <AppHeader title="Conta" nav={nav} canSwitch={access.modules.length > 1} />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
