export const STATUSES = ["Postado", "Agendado", "Planejado", "Não postado"] as const;
export type PostStatus = (typeof STATUSES)[number];

export const DEFAULT_NETWORKS = ["Instagram", "Facebook", "TikTok", "YouTube", "Pinterest", "Google Meu Negócio"];
/** Redes cujo painel só informa números por mês: lançadas uma vez por mês e comparadas mês contra mês. */
export const MONTHLY_NETWORKS = ["Google Meu Negócio"];
export const isMonthly = (network: string) => MONTHLY_NETWORKS.includes(network);
/** Números próprios do Google Meu Negócio (colunas de weekly_metrics). */
export const GOOGLE_FIELDS = [
  { key: "calls", label: "Chamadas" },
  { key: "directions", label: "Rotas" },
  { key: "website_clicks", label: "Cliques no site" },
  { key: "chat_clicks", label: "Cliques no chat" },
  { key: "bookings", label: "Agendamentos" },
] as const;
export type GoogleField = (typeof GOOGLE_FIELDS)[number]["key"];
export const DEFAULT_FORMATS = ["Reels", "Feed (imagem)", "Carrossel", "Stories", "Vídeo longo", "Texto/Legenda", "Outro"];
export const DEFAULT_THEMES = [
  "Produto/Serviço", "Promoção/Oferta", "Bastidores", "Prova social/Depoimento",
  "Educativo/Dica", "Institucional", "Data comemorativa", "Engajamento/Enquete",
];

export type Verdict = "Repetir" | "Adaptar" | "Na média" | "Poucos dados";
export type GoalLevel = "green" | "yellow" | "red" | "none";
export type PaymentStatus = "Pago" | "Pago com atraso" | "Parcial" | "A vencer" | "Atrasado" | "Sem cadastro";

/** Primeiro mês do controle financeiro (o sistema passa a valer em nov/2026). */
export const FINANCE_START_MONTH = "2026-11-01";
