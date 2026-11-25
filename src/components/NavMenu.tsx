"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isActive, isGroup, type NavEntry } from "@/lib/nav";

const base = "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface/10 hover:text-white";

/** Menu da gestão: itens soltos e grupos com submenu (abre ao clicar; fecha ao escolher, clicar fora ou Esc). */
export default function NavMenu({ nav }: { nav: NavEntry[] }) {
  const path = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => setOpen(null), [path]);
  useEffect(() => {
    const out = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, []);
  const cls = (on: boolean) => `${base} ${on ? "bg-surface/10 text-white" : "text-white/80"}`;
  return (
    <nav ref={ref} className="order-last flex w-full flex-wrap justify-center gap-1 lg:order-none lg:w-auto">
      {nav.map((e) => {
        if (!isGroup(e)) return <Link key={e[0]} href={e[0]} className={cls(isActive(path, e[0]))}>{e[1]}</Link>;
        const on = e.items.some(([h]) => isActive(path, h));
        const isOpen = open === e.label;
        return (
          <div key={e.label} className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.label)} className={cls(on || isOpen)}>
              {e.label} <span aria-hidden className="text-[10px] opacity-70">▾</span>
            </button>
            {isOpen && (
              <div role="menu" className="absolute left-0 top-full z-30 mt-1 min-w-44 rounded-xl border border-white/15 bg-[#1b2440] p-1 shadow-xl">
                {e.items.map(([href, label]) => (
                  <Link key={href} href={href} role="menuitem" className={`block rounded-lg px-3 py-2 text-sm hover:bg-surface/10 ${isActive(path, href) ? "bg-surface/10 font-semibold text-white" : "text-white/85"}`}>{label}</Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
