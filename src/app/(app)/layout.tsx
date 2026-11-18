import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { getAccess } from "@/lib/access";
import { canManageUsers, canSeeFinance } from "@/lib/roles";

const NAV: [string, string][] = [
  ["/", "Painel"],
  ["/postagens", "Postagens"],
  ["/tarefas", "Tarefas"],
  ["/metricas", "Métricas"],
  ["/resultados", "Resultados"],
  ["/relatorio", "Relatório"],
  ["/financeiro", "Financeiro"],
  ["/cadastros", "Cadastros"],
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const access = await getAccess(supabase);
  if (!access) redirect("/login");
  const nav = NAV.filter(([href]) => href !== "/financeiro" || canSeeFinance(access.role));
  if (canManageUsers(access.role)) nav.push(["/usuarios", "Usuários"]);
  return (
    <div className="min-h-screen">
      <header className="app-header sticky top-0 z-20 bg-gradient-to-r from-[#131a2e] to-[#2b3a5e] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
          <span className="hidden items-center gap-2 font-extrabold sm:flex"><span className="inline-block h-6 w-6 rounded-full bg-accent" />Controle de Redes</span>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-surface/10 hover:text-white">{label}</Link>
            ))}
          </nav>
          <form action={signOut}><button className="rounded-lg px-3 py-2 text-sm hover:bg-navy-2">Sair</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
