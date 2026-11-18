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
