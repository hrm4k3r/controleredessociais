export type ModuleId = "social" | "dev" | "financeiro" | "agenda" | "impressos";

export const MODULES: { id: ModuleId; name: string; description: string; href: string; icon: string }[] = [
  { id: "social", name: "Gestão de Redes Sociais", description: "Postagens, métricas, relatórios semanais, tarefas e financeiro dos clientes.", href: "/", icon: "📣" },
  { id: "dev", name: "Gestão de Projetos de Software", description: "Sistemas, sites e aplicativos: projetos, quadro de tarefas, marcos de entrega e horas.", href: "/dev", icon: "💻" },
  { id: "financeiro", name: "Gestão Financeira", description: "Fluxo de caixa: entradas e saídas, contas a pagar e a receber, saldos e resultado do mês (somente administradores).", href: "/caixa", icon: "💰" },
  { id: "agenda", name: "Agenda", description: "Seus compromissos do dia, da semana e do mês, com repetição e opção de compartilhar com a equipe.", href: "/agenda", icon: "📅" },
  { id: "impressos", name: "Gestão de Materiais Impressos", description: "Revistas, cartões de visita, folders e banners: pedidos, etapas, provas com o cliente, gráfica, custos e entrega.", href: "/impressos", icon: "🖨️" },
];
/** Gestões que um cliente pode usar (o financeiro é da empresa, não do cliente). */
export const CLIENT_SERVICES: ModuleId[] = ["social", "dev", "impressos"];
export const ALL_MODULES: ModuleId[] = MODULES.map((m) => m.id);
export const moduleById = (id: ModuleId) => MODULES.find((m) => m.id === id)!;
export const isModuleId = (v: unknown): v is ModuleId => v === "social" || v === "dev" || v === "financeiro" || v === "agenda" || v === "impressos";
/** Nome curto (sem o prefixo "Gestão de"). */
export const shortName = (id: ModuleId) => moduleById(id).name.replace(/^Gestão (de )?/, "");

/** Normaliza o que vem do banco/ambiente: só ids válidos, sem repetição. */
export function parseModules(v: unknown): ModuleId[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  return [...new Set(raw.map((x) => String(x).trim()).filter(isModuleId))];
}

/**
 * Módulos que o usuário realmente acessa:
 * contratados pela organização (e, se definido, liberados na implantação via ENABLED_MODULES) ∩ liberados ao usuário.
 * Proprietário e usuário sem restrição (null) acessam todos os contratados.
 */
export function effectiveModules(opts: { org: unknown; member: unknown | null; role: string | null; env?: string | null }): ModuleId[] {
  let allowed = parseModules(opts.org);
  const env = opts.env ? parseModules(opts.env) : null;
  if (env && env.length) allowed = allowed.filter((m) => env.includes(m));
  if (opts.role === "owner" || opts.member == null) return allowed;
  const mine = parseModules(opts.member);
  return allowed.filter((m) => mine.includes(m));
}
