import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { monthlyReport } from "./monthly";
import { renderMonthlyImage } from "./monthly-image";

const b = { followers: null, views: null, reach: null, interactions: null, clicks: null, learning: null };
const rows = [
  { ...b, client_id: "c", network: "Instagram", month: "2026-09-01", followers: 1200, views: 9000, reach: 5000, interactions: 300 },
  { ...b, client_id: "c", network: "Instagram", month: "2026-10-01", followers: 1380, views: 12500, reach: 6800, interactions: 540 },
  { ...b, client_id: "c", network: "Facebook", month: "2026-10-01", followers: 800, views: 3000, reach: 1500, interactions: 90 },
  { ...b, client_id: "c", network: "Google Meu Negócio", month: "2026-09-01", views: 90, interactions: 20, calls: 4, directions: 18 },
  { ...b, client_id: "c", network: "Google Meu Negócio", month: "2026-10-01", views: 112, reach: 112, interactions: 32, calls: 6, directions: 26, website_clicks: 0, chat_clicks: 0, bookings: 0 },
];
const notes = [{ client_id: "c", month: "2026-10-01", comment: "Mês de crescimento no Instagram, com destaque para os Reels de bastidores.", next_steps: "Reforçar chamadas para rota no Google e manter 3 reels por semana.", collected_at: "2026-11-05T13:10:00.000Z" }];

describe("relatório mensal (imagem)", () => {
  it("renderiza 1080x1920", async () => {
    const r = monthlyReport({ id: "c", name: "Atacadão Ferrosul" }, ["Instagram", "Facebook", "Google Meu Negócio"], rows, notes, "2026-10-01");
    const png = Buffer.from(await renderMonthlyImage(r, notes[0].collected_at).arrayBuffer());
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1920);
    if (process.env.MONTHLY_PNG_OUT) fs.writeFileSync(process.env.MONTHLY_PNG_OUT, png);
  });
});
