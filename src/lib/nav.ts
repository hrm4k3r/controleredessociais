export type NavLink = [href: string, label: string];
export type NavGroup = { label: string; items: NavLink[] };
export type NavEntry = NavLink | NavGroup;
export const isGroup = (e: NavEntry): e is NavGroup => !Array.isArray(e);

/** Ativo quando o endereço é o do item ou está dentro dele ("/" só vale exato). */
export const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

/** Grupo "Administração": clientes sempre; tempo e usuários só para quem gerencia. */
export function adminGroup(manager: boolean, withTime = true): NavGroup {
  const items: NavLink[] = [["/clientes", "Clientes"]];
  if (manager) { if (withTime) items.push(["/tempo", "Tempo"]); items.push(["/usuarios", "Usuários"]); }
  return { label: "Administração", items };
}
