export type Role = "owner" | "admin" | "colaborador";
export const ROLE_LABEL: Record<Role, string> = { owner: "Proprietário", admin: "Administrador (com Financeiro)", colaborador: "Colaborador (sem Financeiro)" };

/** Só proprietário e administrador enxergam o Financeiro. */
export const canSeeFinance = (role: Role | null | undefined) => role === "owner" || role === "admin";
/** Quem pode gerenciar usuários. */
export const canManageUsers = canSeeFinance;

/** Regras de gestão: `actor` pode alterar/remover `target`? Proprietário nunca é alterado; admin só mexe em colaboradores. */
export function canManageTarget(actor: Role | null, target: Role): boolean {
  if (target === "owner") return false;
  if (actor === "owner") return true;
  if (actor === "admin") return target === "colaborador";
  return false;
}
/** `actor` pode atribuir o papel `role`? Só o proprietário cria administradores. */
export function canAssign(actor: Role | null, role: Role): boolean {
  if (role === "owner") return false;
  if (role === "admin") return actor === "owner";
  return actor === "owner" || actor === "admin";
}
