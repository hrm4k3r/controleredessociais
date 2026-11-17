import type { Dataset } from "../types";

/** Dados fictícios só para pré-visualizar/testar o layout do relatório (rota /api/dev/report-sample). */
export function sampleDataset(nNetworks = 6): Dataset {
  const nets = ["Facebook", "Instagram", "TikTok", "YouTube", "Google Meu Negócio", "Pinterest"].slice(0, nNetworks);
  const W = "2026-11-16", P = "2026-11-09";
  const clients = [{ id: "c1", name: nNetworks > 3 ? "Lavanderia Mundial" : "Atacadão Ferrosul", is_internal: false, weekly_goal: 4, sort: 1 }];
  const accounts = nets.map((network, i) => ({ id: `a${i}`, client_id: "c1", network }));
  const fm = ["Reels", "Carrossel", "Feed (imagem)", "Stories", "Vídeo longo"];
  const posts: Dataset["posts"] = [0, 1, 2, 3, 4].map((i) => ({
    id: `p${i}`, post_date: `2026-11-${16 + i}`, client_id: "c1", status: i === 4 ? "Agendado" : "Postado", format: fm[i], theme: "Educativo/Dica",
    summary: ["Como tirar mancha de vinho em 3 passos simples", "Promoção de novembro: lave 5 e leve 6", "Bastidores da nossa equipe", "Depoimento de cliente satisfeita", "Dica"][i], link: null, notes: null,
  }));
  const postNetworks = posts.flatMap((p) => nets.slice(0, i2(p.id)).map((network) => ({ post_id: p.id, network })));
  function i2(id: string) { return Math.min(nets.length, 1 + (Number(id.slice(1)) % 3)); }
  const rates = [[600, 4000], [210, 3500], [90, 3000], [330, 2500]];
  const results = posts.slice(0, 4).flatMap((p, i) => nets.slice(0, i2(p.id)).map((network) => ({
    post_id: p.id, network, views: rates[i][1] * 2, reach: rates[i][1], likes: Math.round(rates[i][0] * 0.7), comments: Math.round(rates[i][0] * 0.1),
    shares: Math.round(rates[i][0] * 0.1), saves: Math.round(rates[i][0] * 0.1), clicks: 12,
  })));
  // histórico para veredito
  for (let k = 0; k < 4; k++) {
    posts.unshift({ id: `h${k}`, post_date: `2026-10-${10 + k}`, client_id: "c1", status: "Postado", format: "Reels", theme: null, summary: "histórico", link: null, notes: null });
    for (const network of nets) results.push({ post_id: `h${k}`, network, views: 3000, reach: 2000, likes: 100, comments: 10, shares: 5, saves: 5, clicks: 1 });
  }
  const metrics = nets.flatMap((network, i) => [
    { client_id: "c1", network, week_start: P, followers: 2000 + i * 900, views: 8000 + i * 2000, reach: 3000, interactions: 150, clicks: 20, learning: null },
    { client_id: "c1", network, week_start: W, followers: 2000 + i * 900 + (i % 2 ? -12 : 34 + i), views: 9500 + i * 1900, reach: 3600 + i * 250, interactions: 190 + i * 11, clicks: 25, learning: null },
  ]);
  return { clients, accounts, posts, postNetworks, results, metrics };
}
export const SAMPLE_COMMENT = "Boa semana: os conteúdos de dica trouxeram mais alcance e novos seguidores no Instagram. O Reels sobre manchas foi o destaque.";
export const SAMPLE_STEPS = "Repetir o formato de dica rápida em Reels, publicar 1 depoimento de cliente e testar horário das 19h.";
