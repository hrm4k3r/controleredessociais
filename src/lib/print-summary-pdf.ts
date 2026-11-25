import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { fmtData } from "./dates";
import { brl, fmtPages, kindOf, pageKindOf, pagesSummary, sizeLabel, type PrintJob, type PrintPage } from "./impressos";

type Input = {
  job: Pick<PrintJob, "title" | "kind" | "pages" | "due_date">;
  clientName: string | null;
  pages: PrintPage[];
  names: Record<string, string>;
  generatedAt: string; // aaaa-mm-dd
  withValues?: boolean;
};

const W = 595.28, H = 841.89, M = 40;
const NAVY = rgb(0.12, 0.16, 0.27), ACCENT = rgb(0.91, 0.35, 0.05), MUTED = rgb(0.39, 0.44, 0.54), LINE = rgb(0.87, 0.89, 0.93), TEXT = rgb(0.11, 0.14, 0.22);
const COLOR: Record<string, ReturnType<typeof rgb>> = {
  aguardando_material: rgb(0.58, 0.2, 0.92), para_fazer: rgb(0.39, 0.44, 0.54), produzindo: rgb(0.92, 0.35, 0.05),
  para_conferir: rgb(0.79, 0.54, 0.02), ajustes: rgb(0.86, 0.15, 0.15), aprovado: rgb(0.09, 0.64, 0.29),
};

/** Quebra o texto em linhas que cabem em `width`. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= width) line = test;
      else { if (line) out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}
/** A fonte padrão do PDF só cobre Latin-1 (Windows-1252): troca o que ficar de fora. */
const safe = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff–—•€]/g, "?");

const GROUPS: { title: string; ids: string[]; hint: string }[] = [
  { title: "Aguardando material", ids: ["aguardando_material"], hint: "Dependem do envio de arte, texto ou logo pelo anunciante" },
  { title: "Com ajustes pedidos", ids: ["ajustes"], hint: "Voltaram para correção" },
  { title: "Para conferir", ids: ["para_conferir"], hint: "Prontas, aguardando conferência/aprovação" },
  { title: "Em produção", ids: ["produzindo", "para_fazer"], hint: "Na fila ou sendo diagramadas" },
  { title: "Aprovadas", ids: ["aprovado"], hint: "Fechadas" },
];

export async function buildSummaryPdf(inp: Input): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle(safe(`Resumo da produção - ${inp.job.title}`));
  doc.setAuthor("Rixxer");
  const T = (s: string) => safe(s);

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const pagesBy = (ids: string[]) => inp.pages.filter((p) => ids.includes(p.status)).sort((a, b) => (a.page_number ?? 9999) - (b.page_number ?? 9999));
  const sum = pagesSummary(inp.pages, inp.job.pages);

  const header = (first: boolean) => {
    if (first) {
      page.drawRectangle({ x: 0, y: H - 112, width: W, height: 112, color: NAVY });
      page.drawCircle({ x: W - 20, y: H - 12, size: 70, color: ACCENT, opacity: 0.9 });
      page.drawText("RESUMO DA PRODUÇÃO", { x: M, y: H - 38, size: 10, font: bold, color: rgb(1, 0.7, 0.48) });
      page.drawText(T(clip(inp.job.title, 46)), { x: M, y: H - 66, size: 22, font: bold, color: rgb(1, 1, 1) });
      const sub = [inp.clientName, kindOf(inp.job.kind).label, `Atualizado em ${fmtData(inp.generatedAt)}`].filter(Boolean).join("  -  ");
      page.drawText(T(sub), { x: M, y: H - 90, size: 11, font, color: rgb(0.79, 0.83, 0.92) });
      y = H - 112 - 24;
    } else {
      page.drawText(T(`${clip(inp.job.title, 60)} - resumo da produção`), { x: M, y: H - 28, size: 9, font, color: MUTED });
      page.drawLine({ start: { x: M, y: H - 36 }, end: { x: W - M, y: H - 36 }, thickness: 0.5, color: LINE });
      y = H - 56;
    }
  };
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
  const ensure = (h: number) => {
    if (y - h < M + 24) { page = doc.addPage([W, H]); header(false); }
  };

  header(true);

  // Totais
  const boxes: [string, string, ReturnType<typeof rgb>][] = [
    ["Páginas na lista", String(sum.total), NAVY],
    ["Aprovadas", `${sum.approved}`, COLOR.aprovado],
    ["Aguardando material", String(inp.pages.filter((p) => p.status === "aguardando_material").length), COLOR.aguardando_material],
    ["Para conferir / ajustes", String(inp.pages.filter((p) => p.status === "para_conferir" || p.status === "ajustes").length), COLOR.para_conferir],
  ];
  const bw = (W - 2 * M - 3 * 10) / 4;
  boxes.forEach(([label, value, c], i) => {
    const x = M + i * (bw + 10);
    page.drawRectangle({ x, y: y - 52, width: bw, height: 52, color: rgb(0.95, 0.96, 0.98), borderColor: LINE, borderWidth: 0.6 });
    page.drawText(T(label), { x: x + 8, y: y - 17, size: 8.5, font, color: MUTED });
    page.drawText(value, { x: x + 8, y: y - 42, size: 22, font: bold, color: c });
  });
  y -= 52 + 14;

  const meta: string[] = [];
  if (inp.job.pages) meta.push(`Ocupação: ${fmtPages(sum.used)} de ${inp.job.pages} páginas${sum.free != null && sum.free > 0 ? ` (${fmtPages(sum.free)} livres)` : ""}`);
  if (inp.job.due_date) meta.push(`Prazo de entrega: ${fmtData(inp.job.due_date)}`);
  if (inp.withValues && sum.value > 0) meta.push(`Contratos: ${brl(sum.value)}`);
  if (meta.length) { page.drawText(T(meta.join("    |    ")), { x: M, y, size: 10, font, color: TEXT }); y -= 20; }
  // progresso
  page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 8, color: rgb(0.9, 0.91, 0.94) });
  if (sum.pct > 0) page.drawRectangle({ x: M, y: y - 8, width: ((W - 2 * M) * sum.pct) / 100, height: 8, color: COLOR.aprovado });
  page.drawText(`${sum.pct}% aprovado`, { x: W - M - 70, y: y - 22, size: 9, font: bold, color: MUTED });
  y -= 38;

  // Seções
  for (const g of GROUPS) {
    const list = pagesBy(g.ids);
    if (list.length === 0) continue;
    ensure(46);
    page.drawText(T(`${g.title} (${list.length})`), { x: M, y, size: 13, font: bold, color: g.ids[0] === "aprovado" ? COLOR.aprovado : NAVY });
    y -= 13;
    page.drawText(T(g.hint), { x: M, y, size: 8.5, font, color: MUTED });
    y -= 10;
    const colX = { p: M, title: M + 34, size: M + 228, status: M + 342, due: M + 446, val: W - M };
    for (const p of list) {
      const k = pageKindOf(p.kind);
      const titleLines = wrap(T(`${p.title}${p.advertiser ? ` (${p.advertiser})` : ""}`), bold, 10, 186);
      const noteLines = p.notes ? wrap(T(p.notes), font, 9, W - 2 * M - 34) : [];
      const who = p.assignee_id ? inp.names[p.assignee_id] : null;
      const block = Math.max(titleLines.length * 12.5, 24); // altura da linha principal (tipo + tamanho ocupam 2 linhas)
      const h = 8 + block + (noteLines.length ? noteLines.length * 11.5 + 2 : 0) + 6;
      ensure(h);
      page.drawLine({ start: { x: M, y: y - 4 }, end: { x: W - M, y: y - 4 }, thickness: 0.4, color: LINE });
      let ty = y - 17;
      page.drawText(p.page_number != null ? `p.${p.page_number}` : "-", { x: colX.p, y: ty, size: 10, font: bold, color: ACCENT });
      titleLines.forEach((ln, i) => page.drawText(ln, { x: colX.title, y: ty - i * 12.5, size: 10, font: bold, color: TEXT }));
      page.drawText(T(`${k.label}`), { x: colX.size, y: ty, size: 8.5, font, color: MUTED });
      page.drawText(T(statusText(p.status)), { x: colX.status, y: ty, size: 9, font: bold, color: COLOR[p.status] ?? MUTED });
      page.drawText(T(sizeLabel(p.size)), { x: colX.size, y: ty - 11, size: 8.5, font, color: MUTED });
      const due = p.due_date ? `Prazo ${fmtData(p.due_date)}` : "";
      if (due) page.drawText(T(due), { x: colX.due, y: ty, size: 8.5, font, color: MUTED });
      if (who && p.status !== "aprovado") page.drawText(T(clip(who, 22)), { x: colX.due, y: ty - 11, size: 8, font, color: MUTED });
      if (inp.withValues && p.value != null) { const v = brl(p.value); page.drawText(v, { x: colX.val - font.widthOfTextAtSize(v, 8.5), y: ty - 22, size: 8.5, font, color: MUTED }); }
      ty -= block;
      noteLines.forEach((ln, i) => page.drawText(ln, { x: colX.title, y: ty - 1 - i * 11.5, size: 9, font, color: MUTED }));
      y -= h;
    }
    y -= 12;
  }
  if (inp.pages.length === 0) { page.drawText("Nenhuma página cadastrada ainda.", { x: M, y, size: 11, font, color: MUTED }); }

  // Rodapé com numeração
  const all = doc.getPages();
  all.forEach((pg, i) => {
    const txt = `Rixxer  -  resumo gerado em ${fmtData(inp.generatedAt)}  -  página ${i + 1}/${all.length}`;
    pg.drawText(txt, { x: (W - font.widthOfTextAtSize(txt, 8)) / 2, y: 20, size: 8, font, color: MUTED });
  });
  return doc.save();
}

const statusText = (s: string) => ({ aguardando_material: "Aguardando material", para_fazer: "Para fazer", produzindo: "Produzindo", para_conferir: "Para conferir", ajustes: "Ajustes", aprovado: "Aprovado" } as Record<string, string>)[s] ?? s;
