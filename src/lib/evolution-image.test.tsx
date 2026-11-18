import { describe, expect, it } from "vitest";
import { evolutionOf, type Base } from "./evolution";
import { renderEvolutionImage } from "./evolution-image";
import type { Dataset } from "./types";

const ds: Dataset = {
  clients: [{ id: "c1", name: "Paradise Sup & Surf", is_internal: false, weekly_goal: 4, sort: 1 }],
  accounts: [], posts: [], postNetworks: [], results: [],
  metrics: [
    { client_id: "c1", network: "Instagram", week_start: "2026-11-16", followers: 1560, views: 9000, reach: 5200, interactions: 640, clicks: 40, learning: null },
    { client_id: "c1", network: "TikTok", week_start: "2026-11-16", followers: 320, views: 4000, reach: 2500, interactions: 200, clicks: null, learning: null },
  ],
};
const bases: Base[] = [
  { client_id: "c1", network: "Instagram", baseline_date: "2026-11-15", followers: 1200, views: 5000, reach: 3000, interactions: 240, clicks: 20, notes: null },
  { client_id: "c1", network: "TikTok", baseline_date: "2026-11-15", followers: 200, views: 1000, reach: 900, interactions: 50, clicks: null, notes: null },
];

describe("evolução (antes × depois)", () => {
  it("calcula o total do cliente", () => {
    const e = evolutionOf(ds, bases, "c1", "2026-11-16")!;
    const f = e.lines.find((l) => l.key === "followers")!;
    expect(f).toMatchObject({ before: 1400, after: 1880, delta: 480 });
    expect(evolutionOf(ds, [], "c1", "2026-11-16")).toBeNull();
  });
  it("renderiza a imagem 1080x1920", async () => {
    const e = evolutionOf(ds, bases, "c1", "2026-11-16")!;
    const png = Buffer.from(await renderEvolutionImage(e, "2026-11-16").arrayBuffer());
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1920);
    if (process.env.REPORT_OUT) require("node:fs").writeFileSync(`${process.env.REPORT_OUT}/evolucao.png`, png);
  }, 30000);
});
