import { describe, expect, it } from "vitest";
import { addDays, addMonths, fmtPeriodo, lastClosedWeekStart, todayISO, weekStart } from "./dates";
import { engagementRate, goalLevel, goalPct, goalText, interactionsOfPost, newFollowers, rankDesc, variation, verdict } from "./calc";
import { dueDate, overdueAmount, paymentStatus, summarizeClient } from "./finance";
import { accountRates, buildReport, clientWeek, postsDone, postsOnNetwork, resultRows } from "./aggregate";
import type { Dataset } from "./types";

describe("datas", () => {
  it("semana começa na segunda e fecha no domingo", () => {
    expect(weekStart("2026-11-17")).toBe("2026-11-16"); // terça
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // domingo
    expect(weekStart("2026-11-23")).toBe("2026-11-23"); // segunda
    expect(fmtPeriodo("2026-11-16")).toBe("16/11 a 22/11/2026");
  });
  it("aritmética", () => {
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addMonths("2026-11-01", 2)).toBe("2027-01-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
  });
  it("hoje em São Paulo (fuso)", () => {
    expect(todayISO(new Date("2026-11-17T01:30:00Z"))).toBe("2026-11-16"); // 22:30 BRT do dia 16
    expect(lastClosedWeekStart(new Date("2026-11-17T15:00:00Z"))).toBe("2026-11-09");
  });
});

describe("cálculos", () => {
  it("interações e engajamento", () => {
    expect(interactionsOfPost({ likes: 10, comments: 2, shares: 3, saves: 5 })).toBe(20);
    expect(interactionsOfPost({})).toBeNull();
    expect(engagementRate(20, 400)).toBeCloseTo(0.05);
    expect(engagementRate(20, 0)).toBeNull();
    expect(engagementRate(null, 100)).toBeNull();
  });
  it("meta: verde ≥100, amarelo 70–99, vermelho <70", () => {
    expect(goalLevel(goalPct(4, 4))).toBe("green");
    expect(goalLevel(goalPct(5, 4))).toBe("green");
    expect(goalLevel(goalPct(3, 4))).toBe("yellow"); // 75%
    expect(goalLevel(goalPct(7, 10))).toBe("yellow"); // 70%
    expect(goalLevel(goalPct(2, 4))).toBe("red");
    expect(goalLevel(goalPct(1, 3))).toBe("red");
    expect(goalLevel(goalPct(1, 0))).toBe("none");
    expect(goalText(1, 4)).toContain("faltaram 3");
  });
  it("variação e novos seguidores", () => {
    expect(variation(120, 100)).toBeCloseTo(0.2);
    expect(variation(50, 0)).toBeNull();
    expect(newFollowers(1050, 1000)).toBe(50);
    expect(newFollowers(1050, null)).toBeNull();
  });
  it("veredito", () => {
    const hist = [0.04, 0.05, 0.06]; // média 0.05
    expect(verdict(0.06, hist)).toBe("Repetir"); // 120%
    expect(verdict(0.0599, hist)).toBe("Na média");
    expect(verdict(0.04, hist)).toBe("Adaptar"); // 80%
    expect(verdict(0.0401, hist)).toBe("Na média");
    expect(verdict(0.05, [0.05, 0.05])).toBe("Poucos dados");
    expect(verdict(null, hist)).toBeNull();
  });
  it("ranking com empate", () => {
    const items = [0.1, 0.3, 0.3, 0.2, null].map((rate) => ({ rate }));
    const m = rankDesc(items, (x) => x.rate);
    expect(items.map((i) => m.get(i) ?? null)).toEqual([4, 1, 1, 3, null]);
  });
});

describe("financeiro", () => {
  it("vencimento no último dia se o dia não existe", () => {
    expect(dueDate("2026-02-01", 31)).toBe("2026-02-28");
    expect(dueDate("2028-02-01", 30)).toBe("2028-02-29");
    expect(dueDate("2026-11-01", 31)).toBe("2026-11-30");
    expect(dueDate("2026-11-01", 17)).toBe("2026-11-17");
  });
  const base = { due: "2026-11-17", amountDue: 300, today: "2026-11-20" };
  it("situações", () => {
    expect(paymentStatus({ ...base, paidDate: "2026-11-15", paidAmount: 300 })).toBe("Pago");
    expect(paymentStatus({ ...base, paidDate: "2026-11-17", paidAmount: 300 })).toBe("Pago");
    expect(paymentStatus({ ...base, paidDate: "2026-11-18", paidAmount: 300 })).toBe("Pago com atraso");
    expect(paymentStatus({ ...base, paidDate: "2026-11-15", paidAmount: 100 })).toBe("Parcial");
    expect(paymentStatus(base)).toBe("Atrasado");
    expect(paymentStatus({ ...base, today: "2026-11-17" })).toBe("A vencer");
    expect(paymentStatus({ ...base, amountDue: 0 })).toBe("Sem cadastro");
  });
  it("resumo do cliente", () => {
    const ok = summarizeClient([{ ...base, paidDate: "2026-11-10", paidAmount: 300 }, { ...base, due: "2026-12-17", today: "2026-11-20" }]);
    expect(ok).toMatchObject({ situation: "Adimplente", overdueCount: 0, overdueAmount: 0, lastPayment: "2026-11-10" });
    const bad = summarizeClient([base, { ...base, due: "2026-10-17", paidDate: "2026-10-17", paidAmount: 100 }]);
    expect(bad.situation).toBe("INADIMPLENTE");
    expect(bad.overdueCount).toBe(2);
    expect(bad.overdueAmount).toBe(500);
    expect(overdueAmount({ ...base, today: "2026-11-10" })).toBe(0);
  });
});

const W = "2026-11-16";
const ds: Dataset = {
  clients: [{ id: "c1", name: "Lavanderia", is_internal: false, weekly_goal: 4, sort: 1 }],
  accounts: [{ id: "a1", client_id: "c1", network: "Instagram" }, { id: "a2", client_id: "c1", network: "TikTok" }],
  posts: [
    { id: "p1", post_date: "2026-11-16", client_id: "c1", status: "Postado", format: "Reels", theme: "Dica", summary: "A", link: null, notes: null },
    { id: "p2", post_date: "2026-11-18", client_id: "c1", status: "Postado", format: "Feed (imagem)", theme: null, summary: "B", link: null, notes: null },
    { id: "p3", post_date: "2026-11-19", client_id: "c1", status: "Agendado", format: null, theme: null, summary: "C", link: null, notes: null },
    { id: "p4", post_date: "2026-11-22", client_id: "c1", status: "Postado", format: "Carrossel", theme: null, summary: "D", link: null, notes: null },
    { id: "p0", post_date: "2026-11-10", client_id: "c1", status: "Postado", format: null, theme: null, summary: "antigo", link: null, notes: null },
  ],
  postNetworks: [
    { post_id: "p1", network: "Instagram" }, { post_id: "p1", network: "TikTok" },
    { post_id: "p2", network: "Instagram" }, { post_id: "p3", network: "Instagram" }, { post_id: "p4", network: "Instagram" },
    { post_id: "p0", network: "Instagram" },
  ],
  results: [
    { post_id: "p1", network: "Instagram", views: 1000, reach: 500, likes: 40, comments: 5, shares: 5, saves: 10, clicks: 3 }, // 60/500=12%
    { post_id: "p2", network: "Instagram", views: 800, reach: 400, likes: 10, comments: 0, shares: 0, saves: 0, clicks: null }, // 2.5%
    { post_id: "p4", network: "Instagram", views: 900, reach: 500, likes: 25, comments: 0, shares: 0, saves: 0, clicks: null }, // 5%
    { post_id: "p0", network: "Instagram", views: 100, reach: 200, likes: 10, comments: 0, shares: 0, saves: 0, clicks: null }, // 5%
    { post_id: "p1", network: "TikTok", views: 300, reach: 100, likes: 5, comments: 0, shares: 0, saves: 0, clicks: null },
    { post_id: "p2", network: "TikTok", views: 10, reach: 10, likes: 1, comments: 0, shares: 0, saves: 0, clicks: null }, // não marcado
  ],
  metrics: [
    { client_id: "c1", network: "Instagram", week_start: "2026-11-09", followers: 1000, views: 1000, reach: 400, interactions: 20, clicks: 1, learning: null },
    { client_id: "c1", network: "Instagram", week_start: W, followers: 1050, views: 1500, reach: 1000, interactions: 100, clicks: 9, learning: "x" },
    { client_id: "c1", network: "TikTok", week_start: W, followers: 200, views: 500, reach: 300, interactions: 20, clicks: null, learning: null },
  ],
};

describe("agregação semanal", () => {
  it("só 'Postado' conta para a meta; post em várias redes conta 1", () => {
    expect(postsDone(ds, "c1", W)).toBe(3); // p1, p2, p4 (p3 agendado; p0 outra semana)
    expect(postsOnNetwork(ds, "c1", W, "Instagram")).toBe(3);
    expect(postsOnNetwork(ds, "c1", W, "TikTok")).toBe(1);
  });
  it("totais do cliente", () => {
    const cw = clientWeek(ds, ds.clients[0], W);
    expect(cw.pct).toBeCloseTo(0.75);
    expect(cw.level).toBe("yellow");
    expect(cw.followers).toBe(1250);
    expect(cw.newFollowers).toBe(50); // TikTok sem semana anterior não entra
    expect(cw.views).toBe(2000);
    expect(cw.viewsVar).toBeCloseTo(1); // 2000 vs 1000
    expect(cw.engagement).toBeCloseTo(120 / 1300);
  });
  it("ranking, veredito e alerta nos resultados", () => {
    const rows = resultRows(ds, "c1", W);
    const ig = (id: string) => rows.find((r) => r.post.id === id && r.network === "Instagram")!;
    expect(ig("p1").interactions).toBe(60);
    expect(ig("p1").rate).toBeCloseTo(0.12);
    expect(ig("p1").rankInWeek).toBe(1);
    expect(ig("p4").rankInWeek).toBe(2);
    expect(ig("p2").rankInWeek).toBe(3);
    // média histórica IG: (12% + 2.5% + 5% + 5%)/4 = 6,125%
    expect(accountRates(ds, "c1", "Instagram")).toHaveLength(4);
    expect(ig("p1").verdict).toBe("Repetir");
    expect(ig("p2").verdict).toBe("Adaptar");
    expect(ig("p4").verdict).toBe("Na média");
    const tk = rows.filter((r) => r.network === "TikTok");
    expect(tk.every((r) => r.verdict === "Poucos dados")).toBe(true);
    expect(tk.find((r) => r.post.id === "p2")!.alert).toBe("Rede não marcada nesse post");
    expect(tk.find((r) => r.post.id === "p1")!.alert).toBeNull();
  });
  it("relatório: top 3 e post para adaptar", () => {
    const r = buildReport(ds, "c1", W, { comment: "ok" });
    expect(r.top.map((x) => x.post.id + x.network)).toEqual(["p1Instagram", "p1TikTok", "p4Instagram"]); // p2/TikTok não marcado fica fora
    expect(r.top[0].post.id).toBe("p1");
    expect(r.top).toHaveLength(3);
    expect(r.adapt?.post.id).toBe("p2");
    expect(r.comment).toBe("ok");
  });
});
