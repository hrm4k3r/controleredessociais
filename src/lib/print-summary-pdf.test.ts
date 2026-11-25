import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { buildSummaryPdf } from "./print-summary-pdf";
import type { PrintPage } from "./impressos";

const base = { job_id: "j", advertiser: null, value: null, assignee_id: null, due_date: null, notes: null, position: 0, created_by: null, approved_by: null };
const pages: PrintPage[] = [
  { ...base, id: "1", kind: "anuncio", title: "Mecânica MM", size: "1", page_number: 5, status: "aprovado", value: 1500 },
  { ...base, id: "2", kind: "anuncio", title: "Rei do Consórcio", size: "1/2", page_number: 6, status: "aguardando_material", notes: "Aguardando logotipo em vetor e o texto do anúncio. Cliente prometeu enviar até sexta-feira." },
  { ...base, id: "3", kind: "materia", title: "Matéria: Higienização de Cadeiras — técnica e cuidados", size: "2", page_number: 8, status: "para_conferir", due_date: "2026-12-05", assignee_id: "u1" },
  { ...base, id: "4", kind: "anuncio", title: "Padaria São José", size: "1/4", page_number: null, status: "ajustes", notes: "Trocar telefone." },
  { ...base, id: "5", kind: "anuncio", title: "Auto Peças Lourenço", size: "1/3", page_number: 12, status: "produzindo" },
];

describe("resumo da revista (PDF)", () => {
  it("gera um PDF válido com os grupos e totais", async () => {
    const bytes = await buildSummaryPdf({ job: { title: "Revista Viva São Lourenço - 5ª Edição", kind: "revista", pages: 24, due_date: "2026-12-20" }, clientName: "Leonardo", pages, names: { u1: "Hebert" }, generatedAt: "2026-11-25" });
    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
    if (process.env.SUMMARY_PDF_OUT) fs.writeFileSync(process.env.SUMMARY_PDF_OUT, bytes);
  });
  it("funciona sem páginas e com muitas páginas (várias folhas)", async () => {
    const empty = await buildSummaryPdf({ job: { title: "Vazia", kind: "revista", pages: null, due_date: null }, clientName: null, pages: [], names: {}, generatedAt: "2026-11-25" });
    expect(empty.length).toBeGreaterThan(1000);
    const many = Array.from({ length: 60 }, (_, i): PrintPage => ({ ...base, id: `m${i}`, kind: "anuncio", title: `Anunciante ${i + 1}`, size: "1/4", page_number: i + 1, status: i % 2 ? "aprovado" : "produzindo", notes: "Observação longa ".repeat(8) }));
    const big = await buildSummaryPdf({ job: { title: "Grande", kind: "revista", pages: 40, due_date: null }, clientName: "X", pages: many, names: {}, generatedAt: "2026-11-25", withValues: true });
    expect(big.length).toBeGreaterThan(empty.length);
  });
});
