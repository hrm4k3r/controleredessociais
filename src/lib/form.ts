/** Converte campo numérico do formulário: vazio -> null; aceita "1.234" e "1,5". Inteiro >= 0. */
export function intField(v: FormDataEntryValue | null | undefined): number | null {
  const s = String(v ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (s === "") return null;
  const n = Math.round(Number(s));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export function moneyField(v: FormDataEntryValue | null | undefined): number | null {
  const s = String(v ?? "").trim().replace(/[R$\s]/g, "");
  if (s === "") return null;
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(norm);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export const textField = (v: FormDataEntryValue | null | undefined): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
