import Link from "next/link";
import Logo from "@/components/Logo";
import NavMenu from "@/components/NavMenu";
import type { NavEntry } from "@/lib/nav";
import { signOut } from "@/app/login/actions";

/** Cabeçalho comum às gestões. `nav` = itens da gestão atual; `canSwitch` mostra o atalho para trocar de gestão. */
export default function AppHeader({ title, nav, canSwitch }: { /** Nome da gestão atual (aparece depois da marca). */ title: string; nav: NavEntry[]; canSwitch: boolean }) {
  return (
    <header className="app-header sticky top-0 z-20 bg-gradient-to-r from-[#131a2e] to-[#2b3a5e] text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
        <span className="hidden items-center gap-2 sm:flex"><Logo size={26} textClass="text-base" /><span className="text-sm font-medium text-white/60">· {title}</span></span>
        <NavMenu nav={nav} />
        {canSwitch && <Link href="/modulos" className="whitespace-nowrap rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/90 hover:bg-surface/10">⇄ Trocar gestão</Link>}
        <form action={signOut}><button className="rounded-lg px-3 py-2 text-sm hover:bg-navy-2">Sair</button></form>
      </div>
    </header>
  );
}
