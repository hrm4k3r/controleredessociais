import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { moduleById } from "@/lib/modules";
import AppHeader from "@/components/AppHeader";

/** Páginas comuns às gestões (ex.: Usuários): o menu leva a cada gestão liberada. */
export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const access = await getAccess(supabase);
  if (!access) redirect("/login");
  const nav: [string, string][] = access.modules.map((m) => [moduleById(m).href, moduleById(m).name]);
  nav.push(["/clientes", "Clientes"], ["/usuarios", "Usuários"]);
  return (
    <div className="min-h-screen">
      <AppHeader title="Conta" nav={nav} canSwitch={access.modules.length > 1} />
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
