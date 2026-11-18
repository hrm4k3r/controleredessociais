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
