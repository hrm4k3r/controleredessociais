import { afterEach, describe, expect, it } from "vitest";
import { toCsv } from "./export";
import { buildEmail, emailMode } from "./email";
import { intField, moneyField } from "./form";

describe("export CSV", () => {
  it("BOM, separador ; e vírgula decimal; neutraliza fórmulas", () => {
    const csv = toCsv({ name: "x", headers: ["A", "B"], rows: [["=1+1 cmd", 0.1234], ["a;b", null]] });
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("'=1+1 cmd;0,1234");
    expect(csv).toContain('"a;b";');
  });
});

describe("formulário", () => {
  it("números", () => {
    expect(intField("1.234")).toBe(1234);
    expect(intField("")).toBeNull();
    expect(intField("-3")).toBeNull();
    expect(moneyField("R$ 1.250,50")).toBe(1250.5);
    expect(moneyField("300")).toBe(300);
  });
});

describe("e-mail", () => {
  const old = { ...process.env };
  afterEach(() => { process.env = { ...old }; });
  it("sem EMAIL_MODE=live fica em modo teste (nunca envia)", () => {
    delete process.env.EMAIL_MODE;
    process.env.RESEND_API_KEY = "x"; process.env.EMAIL_FROM = "a@b.c";
    expect(emailMode().mode).toBe("test");
    process.env.EMAIL_MODE = "live";
    expect(emailMode().mode).toBe("live");
    delete process.env.RESEND_API_KEY;
    expect(emailMode().mode).toBe("test");
  });
  it("corpo com link e período, nome escapado", () => {
    const m = buildEmail("A <b> & Cia", "2026-11-16", "https://x.com/r/abc");
    expect(m.subject).toContain("16/11 a 22/11/2026");
    expect(m.html).toContain("https://x.com/r/abc");
    expect(m.html).not.toContain("<b> &");
  });
});

import { canAssign, canManageTarget, canSeeFinance } from "./roles";
describe("papéis", () => {
  it("só owner/admin veem o financeiro", () => {
    expect(canSeeFinance("owner")).toBe(true);
    expect(canSeeFinance("admin")).toBe(true);
    expect(canSeeFinance("colaborador")).toBe(false);
    expect(canSeeFinance(null)).toBe(false);
  });
  it("gestão de usuários", () => {
    expect(canManageTarget("owner", "colaborador")).toBe(true);
    expect(canManageTarget("owner", "owner")).toBe(false);
    expect(canManageTarget("admin", "admin")).toBe(false);
    expect(canManageTarget("admin", "colaborador")).toBe(true);
    expect(canManageTarget("colaborador", "colaborador")).toBe(false);
    expect(canAssign("admin", "admin")).toBe(false);
    expect(canAssign("owner", "admin")).toBe(true);
    expect(canAssign("owner", "owner")).toBe(false);
  });
});

import { positionAt } from "./tasks";
describe("kanban", () => {
  it("calcula a posição de inserção", () => {
    expect(positionAt([], 0)).toBe(1000);
    expect(positionAt([1000, 2000], 0)).toBe(0);
    expect(positionAt([1000, 2000], 1)).toBe(1500);
    expect(positionAt([1000, 2000], 2)).toBe(3000);
  });
});

import { effectiveModules, parseModules } from "./modules";
import { parseHours, progress, isLate } from "./dev";
describe("módulos", () => {
  it("parseModules ignora valores inválidos", () => {
    expect(parseModules(["social", "x", "dev", "dev"])).toEqual(["social", "dev"]);
    expect(parseModules("social, dev")).toEqual(["social", "dev"]);
    expect(parseModules(null)).toEqual([]);
  });
  it("acesso efetivo = contratado ∩ liberado ao usuário", () => {
    const org = ["social", "dev"];
    expect(effectiveModules({ org, member: null, role: "colaborador" })).toEqual(["social", "dev"]);
    expect(effectiveModules({ org, member: ["dev"], role: "colaborador" })).toEqual(["dev"]);
    expect(effectiveModules({ org, member: ["dev"], role: "owner" })).toEqual(["social", "dev"]);
    expect(effectiveModules({ org: ["social"], member: ["dev", "social"], role: "admin" })).toEqual(["social"]);
    expect(effectiveModules({ org, member: null, role: "owner", env: "dev" })).toEqual(["dev"]);
    expect(effectiveModules({ org, member: [], role: "colaborador" })).toEqual([]);
  });
});
describe("projetos de software", () => {
  it("progresso", () => {
    expect(progress([])).toEqual({ done: 0, total: 0, open: 0, pct: 0 });
    expect(progress([{ status: "concluido" }, { status: "a_fazer" }, { status: "teste" }, { status: "concluido" }]).pct).toBe(50);
  });
  it("horas", () => {
    expect(parseHours("1,5")).toBe(1.5);
    expect(parseHours("1:30")).toBe(1.5);
    expect(parseHours("0")).toBeNull();
    expect(parseHours("25")).toBeNull();
    expect(parseHours("abc")).toBeNull();
  });
  it("atraso", () => {
    expect(isLate("2026-11-01", "a_fazer", "2026-11-18")).toBe(true);
    expect(isLate("2026-11-01", "concluido", "2026-11-18")).toBe(false);
    expect(isLate(null, "a_fazer", "2026-11-18")).toBe(false);
  });
});

import { balances, contractEntries, forecast, pending, realized, splitAmount, statusOf, type Entry } from "./caixa";
import { addMonthsKeepDay, monthEnd } from "./dates";
const E = (p: Partial<Entry>): Entry => ({ id: "x", kind: "entrada", description: "d", amount: 100, due_date: "2026-11-10", paid_date: null, account_id: "a", category_id: null, client_id: null, notes: null, group_id: null, installment: null, installments: null, created_by: null, ...p });
describe("caixa", () => {
  it("status", () => {
    expect(statusOf({ paid_date: "2026-11-01", due_date: "2026-10-01" }, "2026-11-18")).toBe("pago");
    expect(statusOf({ paid_date: null, due_date: "2026-11-10" }, "2026-11-18")).toBe("atrasado");
    expect(statusOf({ paid_date: null, due_date: "2026-11-20" }, "2026-11-18")).toBe("pendente");
  });
  it("saldo, realizado, previsto e pendentes", () => {
    const acc = [{ id: "a", name: "A", kind: "banco", opening_balance: 1000, active: true, sort: 0 }];
    const es = [E({ paid_date: "2026-11-05", amount: 500 }), E({ kind: "saida", paid_date: "2026-11-06", amount: 200 }), E({ kind: "saida", amount: 50, due_date: "2026-11-02" }), E({ amount: 300, due_date: "2026-12-01" })];
    expect(balances(acc, es, "2026-11-18").get("a")).toBe(1300);
    expect(realized(es, "2026-11-01")).toEqual({ entradas: 500, saidas: 200, resultado: 300 });
    expect(forecast(es, "2026-11-01")).toEqual({ entradas: 500, saidas: 250, resultado: 250 });
    expect(pending(es, "saida", "2026-11-18")).toEqual({ total: 50, overdue: 50 });
    expect(pending(es, "entrada", "2026-11-18")).toEqual({ total: 300, overdue: 0 });
  });
  it("parcelas e datas", () => {
    expect(splitAmount(100, 3)).toEqual([33.33, 33.33, 33.34]);
    expect(splitAmount(100, 3).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
    expect(addMonthsKeepDay("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsKeepDay("2026-11-15", 3)).toBe("2027-02-15");
    expect(monthEnd("2026-02-10")).toBe("2026-02-28");
  });
});

describe("contratos no caixa", () => {
  it("gera mensalidades, parcial e meses futuros", () => {
    const cl = [{ id: "c1", name: "Cliente", monthly_amount: 500, due_day: 10 }];
    const pay = [{ client_id: "c1", ref_month: "2026-11-01", amount_due: null, paid_date: "2026-11-08", paid_amount: 300, notes: null }];
    const es = contractEntries(cl, pay, "2026-11-18", "acc");
    const nov = es.filter((e) => e.due_date.startsWith("2026-11"));
    expect(nov.map((e) => [e.amount, e.paid_date])).toEqual([[300, "2026-11-08"], [200, null]]);
    expect(es.some((e) => e.due_date === "2027-02-10")).toBe(true);
    expect(es.every((e) => e.source === "contrato" && e.account_id === "acc")).toBe(true);
    expect(realized(es, "2026-11-01").entradas).toBe(300);
    expect(contractEntries([{ ...cl[0], monthly_amount: 0 }], [], "2026-11-18", null)).toEqual([]);
  });
});

import { expandEvents, layoutDay, type AgendaEvent } from "./agenda";
import { parseEntryLines, parseMoney } from "./import-entries";
const EV = (p: Partial<AgendaEvent>): AgendaEvent => ({ id: "e", user_id: "u", title: "T", description: null, location: null, color: "blue", visibility: "private", recurrence: "none", recur_until: null, start_date: "2026-11-18", end_date: null, start_time: null, end_time: null, ...p });
describe("agenda", () => {
  it("evento simples e multi-dia", () => {
    expect(expandEvents([EV({})], "2026-11-01", "2026-11-30")).toHaveLength(1);
    expect(expandEvents([EV({})], "2026-12-01", "2026-12-31")).toHaveLength(0);
    const multi = expandEvents([EV({ start_date: "2026-11-28", end_date: "2026-12-02" })], "2026-12-01", "2026-12-31");
    expect(multi).toHaveLength(1);
    expect(multi[0].endDate).toBe("2026-12-02");
  });
  it("repetições", () => {
    const w = expandEvents([EV({ recurrence: "weekly", start_date: "2026-11-02", start_time: "09:00" })], "2026-11-15", "2026-12-06");
    expect(w.map((o) => o.date)).toEqual(["2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07"].filter((d) => d <= "2026-12-06"));
    const m = expandEvents([EV({ recurrence: "monthly", start_date: "2026-01-31" })], "2026-02-01", "2026-04-30");
    expect(m.map((o) => o.date)).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
    const u = expandEvents([EV({ recurrence: "daily", recur_until: "2026-11-20", start_date: "2026-11-18" })], "2026-11-01", "2026-11-30");
    expect(u).toHaveLength(3);
    expect(expandEvents([EV({ recurrence: "yearly", start_date: "2024-11-18" })], "2026-11-01", "2026-11-30")).toHaveLength(1);
  });
  it("colunas para eventos sobrepostos", () => {
    const occ = (id: string, s: string, e: string) => expandEvents([EV({ id, start_time: s, end_time: e })], "2026-11-18", "2026-11-18")[0];
    const l = layoutDay([occ("a", "09:00", "10:00"), occ("b", "09:30", "10:30"), occ("c", "11:00", "12:00")]);
    expect(l.find((x) => x.occ.event.id === "a")).toMatchObject({ col: 0, cols: 2 });
    expect(l.find((x) => x.occ.event.id === "b")).toMatchObject({ col: 1, cols: 2 });
    expect(l.find((x) => x.occ.event.id === "c")).toMatchObject({ col: 0, cols: 1 });
  });
});
describe("importação de planilha", () => {
  it("valores", () => {
    expect(parseMoney("R$ 1.234,56")).toBe(1234.56);
    expect(parseMoney("120,00")).toBe(120);
    expect(parsePrintMoney("")).toBeNull();
  });
  it("linhas da planilha de saídas", () => {
    const r = parseEntryLines("Chuteira     20/11/2026    Pendente\nVivo Empresarial\t17/11/2026\tR$ 72,50\tPendente\tFatura vencida em 25/10/2026\nKoin\t30/11/2026\tR$ 44,78\tPendente\t02/12\nsem data aqui\nPagaleve 27/11/2026 R$ 25,27 Pago Compra iFood 2/4");
    expect(r[0]).toMatchObject({ description: "Chuteira", due_date: "2026-11-20", amount: null, paid: false });
    expect(r[1]).toMatchObject({ description: "Vivo Empresarial", due_date: "2026-11-17", amount: 72.5, notes: "Fatura vencida em 25/10/2026" });
    expect(r[2]).toMatchObject({ description: "Koin", amount: 44.78, notes: "02/12" });
    expect(r[3].error).toBeTruthy();
    expect(r[4]).toMatchObject({ paid: true, notes: "Compra iFood 2/4" });
  });
});

describe("planilha de saídas (amostra real)", () => {
  it("lê todas as linhas e soma o total", () => {
    const txt = `Chuteira     20/11/2026    Pendente
Itaú\t13/11/2026\tR$ 120,00\tPendente\t
SAAE Casa anterior\t15/11/2026\tR$ 133,10\tPendente\t
Cartão de crédito\t17/11/2026\tR$ 280,38\tPendente\t
Vivo Pessoal\t17/11/2026\tR$ 42,90\tPendente\t
Vivo Empresarial\t17/11/2026\tR$ 72,50\tPendente\tFatura vencida em 25/10/2026
Empréstimo Leonardo\t17/11/2026\tR$ 700,00\tPendente\t
Koin\t30/11/2026\tR$ 44,78\tPendente\t02/12
Koin\t28/09/2027\tR$ 44,78\tPendente\t12/12`;
    const r = parseEntryLines(txt);
    expect(r).toHaveLength(9);
    expect(r.filter((x) => x.error)).toHaveLength(0);
    expect(r.filter((x) => x.amount == null).map((x) => x.description)).toEqual(["Chuteira"]);
    expect(Math.round(r.reduce((s, x) => s + (x.amount ?? 0), 0) * 100) / 100).toBe(1438.44);
    expect(r[8].due_date).toBe("2027-09-28");
  });
});

import { fmtColeta, spParts, spToISO } from "./dates";
describe("hora da coleta", () => {
  it("converte entre horário de São Paulo e instante ISO", () => {
    const iso = spToISO("2026-11-22", "18:30")!;
    expect(new Date(iso).toISOString()).toBe("2026-11-22T21:30:00.000Z");
    expect(spParts(iso)).toEqual({ date: "2026-11-22", time: "18:30" });
    expect(fmtColeta(iso)).toBe("22/11/2026 às 18:30");
    expect(spToISO("2026-11-22", "25:00")).toBeNull();
    expect(spToISO("", "10:00")).toBeNull();
  });
});

import { allowsMultiFormat, joinFormats, normalizeFormat, splitFormats } from "./format";
describe("formato múltiplo (Instagram)", () => {
  it("junta, separa e normaliza", () => {
    expect(joinFormats(["Feed (imagem)", "Stories"])).toBe("Feed (imagem) + Stories");
    expect(splitFormats("Feed (imagem) + Stories")).toEqual(["Feed (imagem)", "Stories"]);
    expect(splitFormats(null)).toEqual([]);
    expect(allowsMultiFormat(["Facebook", "Instagram"])).toBe(true);
    expect(allowsMultiFormat(["Facebook"])).toBe(false);
    expect(normalizeFormat("Feed (imagem) + Stories", true)).toBe("Feed (imagem) + Stories");
    expect(normalizeFormat("Feed (imagem) + Stories", false)).toBe("Feed (imagem)");
    expect(normalizeFormat("", true)).toBeNull();
  });
});

import { durationLabel } from "./tasks";
describe("duração do cartão", () => {
  it("formata", () => {
    expect(durationLabel("2026-11-18T17:00:00Z", "2026-11-18T18:15:00Z")).toBe("1h15");
    expect(durationLabel("2026-11-18T17:00:00Z", "2026-11-18T17:45:00Z")).toBe("45min");
    expect(durationLabel("2026-11-18T17:00:00Z", "2026-11-18T19:00:00Z")).toBe("2h");
    expect(durationLabel(null, "2026-11-18T19:00:00Z")).toBe("");
    expect(durationLabel("2026-11-18T19:00:00Z", "2026-11-18T17:00:00Z")).toBe("");
  });
});

import { advance, clampCfg, DEFAULT_CFG, fmtClock, startFocus } from "./pomodoro";
describe("pomodoro", () => {
  it("foco → pausa curta → pausa longa no 4º ciclo", () => {
    const t0 = 1_000_000;
    let p = startFocus("t", "Tarefa", DEFAULT_CFG, t0);
    expect(p.endsAt).toBe(t0 + 25 * 60000);
    let r = advance(p, DEFAULT_CFG, t0);
    expect(r).toMatchObject({ completedFocus: true, next: { phase: "short", done: 1 } });
    r = advance(r.next, DEFAULT_CFG, t0);
    expect(r).toMatchObject({ completedFocus: false, next: { phase: "ready", endsAt: null } });
    p = { ...p, done: 3 };
    expect(advance(p, DEFAULT_CFG, t0).next.phase).toBe("long");
  });
  it("relógio e limites", () => {
    expect(fmtClock(25 * 60000)).toBe("25:00");
    expect(fmtClock(61_000)).toBe("01:01");
    expect(fmtClock(-5)).toBe("00:00");
    expect(clampCfg({ focus: 0, short: 999, long: NaN, every: 1 })).toEqual({ focus: 1, short: 60, long: 15, every: 2 });
  });
});

import { deviationPct, elapsedMin, fmtMin, groupBy, stats } from "./time-report";
describe("relatório de tempo", () => {
  it("estatísticas", () => {
    expect(stats([])).toEqual({ n: 0, avg: null, median: null, total: 0 });
    expect(stats([10, 20, 60])).toEqual({ n: 3, avg: 30, median: 20, total: 90 });
    expect(stats([10, 20, 30, 40]).median).toBe(25);
  });
  it("tempo decorrido e formatação", () => {
    expect(elapsedMin("2026-11-18T17:00:00Z", "2026-11-18T18:15:00Z")).toBe(75);
    expect(elapsedMin("2026-11-18T18:00:00Z", "2026-11-18T17:00:00Z")).toBeNull();
    expect(elapsedMin("2026-11-01T00:00:00Z", "2026-11-18T00:00:00Z")).toBeNull();
    expect(elapsedMin(null, "2026-11-18T00:00:00Z")).toBeNull();
    expect(fmtMin(75)).toBe("1h15");
    expect(fmtMin(45)).toBe("45min");
    expect(fmtMin(120)).toBe("2h");
    expect(fmtMin(null)).toBe("—");
  });
  it("agrupa e compara com o estimado", () => {
    expect([...groupBy([1, 2, 3, 4], (n) => (n % 2 ? "i" : "p")).entries()]).toEqual([["i", [1, 3]], ["p", [2, 4]]]);
    expect(deviationPct(10, 12)).toBe(20);
    expect(deviationPct(0, 5)).toBeNull();
  });
});

import { compare, lastSunday, totals } from "./baseline";
describe("marco inicial (antes × depois)", () => {
  const N = (followers: number | null, reach: number | null, interactions: number | null) => ({ followers, views: null, reach, interactions, clicks: null });
  it("compara uma conta", () => {
    const l = compare(N(1000, 2000, 100), N(1300, 4000, 400));
    const f = l.find((x) => x.key === "followers")!;
    expect(f).toMatchObject({ before: 1000, after: 1300, delta: 300 });
    expect(f.deltaPct).toBeCloseTo(0.3);
    const e = l.find((x) => x.key === "engagement")!;
    expect(e.before).toBeCloseTo(0.05);
    expect(e.after).toBeCloseTo(0.1);
    expect(e.delta).toBeCloseTo(0.05);
    expect(l.find((x) => x.key === "clicks")!.delta).toBeNull();
  });
  it("totais usam só contas com dado nos dois lados", () => {
    const t = totals([{ before: N(1000, 2000, 100), after: N(1200, 3000, 300) }, { before: N(500, null, null), after: N(700, null, null) }, { before: N(null, null, null), after: N(900, null, null) }]);
    const f = t.find((x) => x.key === "followers")!;
    expect(f).toMatchObject({ before: 1500, after: 1900, delta: 400 });
    expect(t.find((x) => x.key === "reach")).toMatchObject({ before: 2000, after: 3000 });
    expect(t.find((x) => x.key === "engagement")!.before).toBeCloseTo(0.05);
  });
  it("último domingo", () => {
    expect(lastSunday("2026-11-18")).toBe("2026-11-15");
    expect(lastSunday("2026-11-15")).toBe("2026-11-15");
    expect(lastSunday("2026-11-16")).toBe("2026-11-15");
  });
});

import { defaultSteps, margin as printMargin, nextStatus, parseMoney as parsePrintMoney, stepProgress, isLateJob } from "./impressos";
describe("impressos", () => {
  it("fluxo e atraso", () => {
    expect(nextStatus("briefing")).toBe("criacao");
    expect(nextStatus("entregue")).toBeNull();
    expect(isLateJob("2026-01-01", "criacao", "2026-02-01")).toBe(true);
    expect(isLateJob("2026-01-01", "entregue", "2026-02-01")).toBe(false);
  });
  it("valores e etapas", () => {
    expect(parsePrintMoney("1.234,56")).toBe(1234.56);
    expect(parsePrintMoney("R$ 90")).toBe(90);
    expect(parsePrintMoney("")).toBeNull();
    expect(printMargin(500, 320)).toEqual({ value: 180, pct: 36 });
    expect(printMargin(null, 3)).toBeNull();
    expect(stepProgress([{ done: true }, { done: false }])).toEqual({ total: 2, done: 1, pct: 50 });
    expect(defaultSteps("revista").length).toBeGreaterThan(defaultSteps("zzz").length - 1);
  });
});

import { clientWeek, networkRows as netRows } from "./aggregate";
import { isMonthly } from "./constants";
describe("rede de dado mensal (Google)", () => {
  const G = "Google Meu Negócio";
  const ds = {
    clients: [{ id: "c", name: "C", is_internal: false, weekly_goal: 2, sort: 1 }],
    accounts: [{ id: "a1", client_id: "c", network: "Instagram" }, { id: "a2", client_id: "c", network: G }],
    posts: [], postNetworks: [], results: [],
    metrics: [
      { client_id: "c", network: G, week_start: "2026-10-05", followers: null, views: 100, reach: 50, interactions: 10, clicks: 5, learning: null },
      { client_id: "c", network: G, week_start: "2026-11-02", followers: null, views: 150, reach: 60, interactions: 12, clicks: 6, learning: null },
      { client_id: "c", network: "Instagram", week_start: "2026-11-02", followers: 10, views: 20, reach: 8, interactions: 2, clicks: 1, learning: null },
    ],
  } as unknown as Parameters<typeof clientWeek>[0];
  it("compara com o lançamento anterior e fica fora dos totais semanais", () => {
    expect(isMonthly(G)).toBe(true);
    const g = netRows(ds, "c", "2026-11-02").find((r) => r.network === G)!;
    expect(g.monthly).toBe(true);
    expect(g.viewsVar).toBeCloseTo(0.5);
    const w = clientWeek(ds, ds.clients[0], "2026-11-02");
    expect(w.views).toBe(20);
    expect(w.reach).toBe(8);
  });
});

import { addMonths, closableMonth, fmtMes, monthlyReport, monthStart } from "./monthly";
describe("fechamento mensal", () => {
  it("meses e dia de fechamento (dia 5)", () => {
    expect(monthStart("2026-11-19")).toBe("2026-11-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
    expect(addMonths("2026-11-01", 2)).toBe("2027-01-01");
    expect(fmtMes("2026-10-01")).toBe("outubro de 2026");
    expect(closableMonth("2026-11-05")).toBe("2026-10-01");
    expect(closableMonth("2026-11-04")).toBe("2026-09-01");
    expect(closableMonth("2027-01-20")).toBe("2026-12-01");
  });
  it("compara o mês com o anterior e traz os campos do Google", () => {
    const c = { id: "c", name: "C" };
    const base = { followers: null, views: null, reach: null, interactions: null, clicks: null, learning: null };
    const rows = [
      { ...base, client_id: "c", network: "Instagram", month: "2026-09-01", followers: 10, reach: 100, interactions: 10 },
      { ...base, client_id: "c", network: "Instagram", month: "2026-10-01", followers: 15, reach: 200, interactions: 40 },
      { ...base, client_id: "c", network: "Google Meu Negócio", month: "2026-10-01", views: 112, interactions: 32, calls: 6, directions: 26 },
    ];
    const r = monthlyReport(c, ["Instagram", "Google Meu Negócio"], rows, [], "2026-10-01");
    expect(r.prev).toBe("2026-09-01");
    const ig = r.items[0];
    expect(ig.lines.find((l) => l.key === "followers")!.delta).toBe(5);
    expect(ig.lines.find((l) => l.key === "reach")!.label).toContain("(mês)");
    const g = r.items[1];
    expect(g.google.find((x) => x.key === "directions")!.cur).toBe(26);
    expect(g.has).toBe(true);
  });
});
