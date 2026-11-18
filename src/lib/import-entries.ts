import { isValidISO } from "./dates";

export type ParsedRow = {
  line: number; raw: string; description: string; due_date: string | null; amount: number | null; paid: boolean; notes: string | null; error?: string;
};

/** "1.234,56" / "120,00" / "120" → número. */
export function parseMoney(s: string): number | null {
  const t = s.replace(/[R$\s]/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/**
 * Lê linhas coladas de uma planilha: "Descrição  dd/mm/aaaa  R$ valor  Situação  Observação" (colunas por tab ou espaços).
 * Linhas sem valor entram sem `amount` (o usuário completa na tela); linhas sem data são marcadas com erro.
 */
export function parseEntryLines(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const base = { line: i + 1, raw: line, description: "", due_date: null, amount: null, paid: false, notes: null };
    const m = /^(.*?)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/.exec(line);
    if (!m) { rows.push({ ...base, description: line, error: "Sem data (dd/mm/aaaa)" }); return; }
    const iso = `${m[4]}-${m[3].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    let rest = m[5];
    const money = /R\$\s*([\d.]+,\d{1,2}|\d+)/.exec(rest);
    const amount = money ? parseMoney(money[1]) : null;
    if (money) rest = rest.replace(money[0], " ");
    const st = /\b(pendente|pago|paga|recebido|quitado)\b/i.exec(rest);
    if (st) rest = rest.replace(st[0], " ");
    const notes = rest.replace(/\s+/g, " ").trim() || null;
    const description = m[1].trim();
    rows.push({
      ...base, description, due_date: isValidISO(iso) ? iso : null, amount, paid: !!st && !/pendente/i.test(st[0]), notes,
      error: !description ? "Sem descrição" : !isValidISO(iso) ? "Data inválida" : undefined,
    });
  });
  return rows;
}
