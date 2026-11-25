import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { fmtData } from "./dates";
import { LOGO_BRANCO_PNG_BASE64 } from "./brand-logo";
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
const NAVY = rgb(0.12, 0.16, 0.27), ACCENT = rgb(0.357, 0.278, 0.761) /* roxo Rixxer */, PINK = rgb(0.867, 0.416, 0.839), MUTED = rgb(0.39, 0.44, 0.54), LINE = rgb(0.87, 0.89, 0.93), TEXT = rgb(0.11, 0.14, 0.22);
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
  const logo = await doc.embedPng(Buffer.from(LOGO_BRANCO_PNG_BASE64, "base64"));
  const lerp = (t: number) => rgb(0.357 + (0.867 - 0.357) * t, 0.278 + (0.416 - 0.278) * t, 0.761 + (0.839 - 0.761) * t);
  /** Faixa em degradê roxo → rosa (identidade Rixxer). */
  const strip = (pg: PDFPage, yy: number, h: number) => { const n = 48, w = W / n; for (let i = 0; i < n; i++) pg.drawRectangle({ x: i * w, y: yy, width: w + 0.6, height: h, color: lerp(i / (n - 1)) }); };
  const T = (s: string) => safe(s);

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const pagesBy = (ids: string[]) => inp.pages.filter((p) => ids.includes(p.status)).sort((a, b) => (a.page_number ?? 9999) - (b.page_number ?? 9999));
  const sum = pagesSummary(inp.pages, inp.job.pages);

  const header = (first: boolean) => {
    if (first) {
      const hh = 150;
      page.drawRectangle({ x: 0, y: H - hh, width: W, height: hh, color: NAVY });
      page.drawCircle({ x: W - 30, y: H - 30, size: 95, color: ACCENT, opacity: 0.35 });
      page.drawCircle({ x: W - 52, y: H - 122, size: 30, color: PINK, opacity: 0.28 });
      strip(page, H - hh - 5, 5);
      page.drawImage(logo, { x: M, y: H - 52, width: 104, height: 104 * 172 / 1000 });
      page.drawText("RESUMO DA PRODUÇÃO", { x: M, y: H - 84, size: 9.5, font: bold, color: rgb(0.86, 0.62, 0.95) });
      page.drawText(T(clip(inp.job.title, 44)), { x: M, y: H - 112, size: 23, font: bold, color: rgb(1, 1, 1) });
      const sub = [inp.clientName, kindOf(inp.job.kind).label, `Atualizado em ${fmtData(inp.generatedAt)}`].filter(Boolean).join("   -   ");
      page.drawText(T(sub), { x: M, y: H - 134, size: 10.5, font, color: rgb(0.79, 0.83, 0.92) });
      y = H - hh - 5 - 26;
    } else {
      page.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: NAVY });
      strip(page, H - 43, 3);
      page.drawImage(logo, { x: M, y: H - 28, width: 70, height: 70 * 172 / 1000 });
      const t = T(`${clip(inp.job.title, 50)} - resumo da produção`);
      page.drawText(t, { x: W - M - font.widthOfTextAtSize(t, 8.5), y: H - 25, size: 8.5, font, color: rgb(0.79, 0.83, 0.92) });
      y = H - 66;
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
    page.drawRectangle({ x, y: y - 52, width: bw, height: 52, color: rgb(0.96, 0.96, 0.99), borderColor: LINE, borderWidth: 0.6 });
    page.drawRectangle({ x, y: y - 52, width: 4, height: 52, color: c });
    page.drawText(T(label), { x: x + 13, y: y - 17, size: 8.5, font, color: MUTED });
    page.drawText(value, { x: x + 13, y: y - 42, size: 22, font: bold, color: c });
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
    page.drawCircle({ x: M + 4, y: y + 4, size: 4, color: COLOR[g.ids[0]] ?? NAVY });
    page.drawText(T(`${g.title} (${list.length})`), { x: M + 14, y, size: 13, font: bold, color: NAVY });
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
    strip(pg, 0, 4);
    pg.drawLine({ start: { x: M, y: 30 }, end: { x: W - M, y: 30 }, thickness: 0.4, color: LINE });
    pg.drawText(`Rixxer  -  rixxer.com.br  -  gerado em ${fmtData(inp.generatedAt)}`, { x: M, y: 16, size: 8, font, color: MUTED });
    const pn = `Página ${i + 1}/${all.length}`;
    pg.drawText(pn, { x: W - M - font.widthOfTextAtSize(pn, 8), y: 16, size: 8, font: bold, color: ACCENT });
  });
  return doc.save();
}

const statusText = (s: string) => ({ aguardando_material: "Aguardando material", para_fazer: "Para fazer", produzindo: "Produzindo", para_conferir: "Para conferir", ajustes: "Ajustes", aprovado: "Aprovado" } as Record<string, string>)[s] ?? s;
