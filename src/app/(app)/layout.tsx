import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

const NAV = [
  ["/", "Painel"],
  ["/postagens", "Postagens"],
  ["/metricas", "Métricas"],
  ["/resultados", "Resultados"],
  ["/relatorio", "Relatório"],
  ["/financeiro", "Financeiro"],
  ["/cadastros", "Cadastros"],
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-navy text-white shadow">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
          <span className="hidden font-bold sm:block">Controle de Redes</span>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium hover:bg-navy-2">{label}</Link>
            ))}
          </nav>
          <form action={signOut}><button className="rounded-lg px-3 py-2 text-sm hover:bg-navy-2">Sair</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
