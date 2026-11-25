import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { deliveriesOf, monthlyReport } from "./monthly";
import { monthlyPageCount, renderMonthlyImage } from "./monthly-image";

const b = { followers: null, views: null, reach: null, interactions: null, clicks: null, learning: null };
const hist = [["2026-06-01", 700], ["2026-07-01", 820], ["2026-08-01", 990]].map(([month, followers]) => ({ ...b, client_id: "c", network: "Instagram", month: month as string, followers: followers as number }));
const hist2 = [["2026-06-01", 100], ["2026-07-01", 180], ["2026-08-01", 300], ["2026-09-01", 520]].map(([month, followers]) => ({ ...b, client_id: "c", network: "Facebook", month: month as string, followers: followers as number }));
const rows = [
  ...hist, ...hist2,
  { ...b, client_id: "c", network: "Instagram", month: "2026-09-01", followers: 1200, views: 9000, reach: 5000, interactions: 300 },
  { ...b, client_id: "c", network: "Instagram", month: "2026-10-01", followers: 1380, views: 12500, reach: 6800, interactions: 540 },
  { ...b, client_id: "c", network: "Facebook", month: "2026-10-01", followers: 800, views: 3000, reach: 1500, interactions: 90 },
  { ...b, client_id: "c", network: "Google Meu Negócio", month: "2026-09-01", views: 90, interactions: 20, calls: 4, directions: 18 },
  { ...b, client_id: "c", network: "Google Meu Negócio", month: "2026-10-01", views: 112, reach: 112, interactions: 32, calls: 6, directions: 26, website_clicks: 0, chat_clicks: 0, bookings: 0 },
];
const notes = [{ client_id: "c", month: "2026-10-01", comment: "Mês de crescimento no Instagram, com destaque para os Reels de bastidores.", next_steps: "Reforçar chamadas para rota no Google e manter 3 reels por semana.", collected_at: "2026-11-05T13:10:00.000Z" }];

const posts = [1, 2, 3].map((i) => ({ id: `p${i}`, post_date: `2026-10-0${i}`, client_id: "c", status: "Postado", format: i === 3 ? "Carrossel" : "Reels", summary: `Post de teste ${i}` }));
const pn = [{ post_id: "p1", network: "Instagram" }, { post_id: "p2", network: "Instagram" }, { post_id: "p2", network: "Facebook" }, { post_id: "p3", network: "Instagram" }];

describe("relatório mensal (imagens)", () => {
  it("monta várias páginas e renderiza todas em 1080x1920", async () => {
    const r = monthlyReport({ id: "c", name: "Atacadão Ferrosul" }, ["Instagram", "Facebook", "Google Meu Negócio"], rows, notes, "2026-10-01");
    const del = deliveriesOf(posts, pn, "c", "2026-10-01", 2);
    expect(del.total).toBe(3);
    expect(del.byFormat[0]).toEqual({ label: "Reels", n: 2 });
    const total = monthlyPageCount(r, del);
    expect(total).toBe(5); // resumo, publicações, redes, Google, análise
    for (let p = 1; p <= total; p++) {
      const png = Buffer.from(await renderMonthlyImage(r, notes[0].collected_at, del, p).arrayBuffer());
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(1080);
      expect(png.readUInt32BE(20)).toBe(1920);
      if (process.env.MONTHLY_PNG_DIR) fs.writeFileSync(`${process.env.MONTHLY_PNG_DIR}/p${p}.png`, png);
    }
  });
});

describe("relatório mensal de conta nova", () => {
  it("não abre com zeros: destaca o Google e explica o ponto de partida", async () => {
    const rowsNew = [
      { ...b, client_id: "c", network: "Instagram", month: "2026-10-01", followers: 0, views: 0, reach: 0, interactions: 0, clicks: 0 },
      { ...b, client_id: "c", network: "Google Meu Negócio", month: "2026-10-01", views: 112, interactions: 32, calls: 6, directions: 26, website_clicks: 0, chat_clicks: 0, bookings: 0 },
    ];
    const r = monthlyReport({ id: "c", name: "Atacadão Ferrosul" }, ["Instagram", "Google Meu Negócio"], rowsNew, [], "2026-10-01");
    expect(r.firstMonth).toBe(true);
    const png = Buffer.from(await renderMonthlyImage(r, null, null, 1).arrayBuffer());
    expect(png.readUInt32BE(16)).toBe(1080);
    if (process.env.MONTHLY_PNG_DIR) fs.writeFileSync(`${process.env.MONTHLY_PNG_DIR}/novo1.png`, png);
  });
});
