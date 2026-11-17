export const STATUSES = ["Postado", "Agendado", "Planejado", "Não postado"] as const;
export type PostStatus = (typeof STATUSES)[number];

export const DEFAULT_NETWORKS = ["Instagram", "Facebook", "TikTok", "YouTube", "Pinterest", "Google Meu Negócio"];
export const DEFAULT_FORMATS = ["Reels", "Feed (imagem)", "Carrossel", "Stories", "Vídeo longo", "Texto/Legenda", "Outro"];
export const DEFAULT_THEMES = [
  "Produto/Serviço", "Promoção/Oferta", "Bastidores", "Prova social/Depoimento",
  "Educativo/Dica", "Institucional", "Data comemorativa", "Engajamento/Enquete",
];

export type Verdict = "Repetir" | "Adaptar" | "Na média" | "Poucos dados";
export type GoalLevel = "green" | "yellow" | "red" | "none";
export type PaymentStatus = "Pago" | "Pago com atraso" | "Parcial" | "A vencer" | "Atrasado" | "Sem cadastro";
