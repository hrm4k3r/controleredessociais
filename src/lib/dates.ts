// Datas como strings "YYYY-MM-DD" (sem fuso). "Hoje" é calculado em America/Sao_Paulo.
export const TZ = "America/Sao_Paulo";

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fromUTC = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}

/** Segunda-feira da semana da data. */
export function weekStart(iso: string): string {
  const dow = toUTC(iso).getUTCDay(); // 0=dom
  return addDays(iso, -((dow + 6) % 7));
}
export const weekEnd = (start: string) => addDays(start, 6);
/** Segunda-feira da semana atual (SP). */
export const currentWeekStart = (now?: Date) => weekStart(todayISO(now));
/** Segunda da última semana já fechada (anterior à atual). */
export const lastClosedWeekStart = (now?: Date) => addDays(currentWeekStart(now), -7);

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function isValidISO(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUTC(toUTC(s)) === s;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const mesNome = (m1: number) => MESES[m1 - 1];

/** 17/11/2026 */
export function fmtData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
/** 17/11 */
export function fmtDiaMes(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
/** "16/11 a 22/11/2026" */
export function fmtPeriodo(start: string): string {
  const end = weekEnd(start);
  return `${fmtDiaMes(start)} a ${fmtDiaMes(end)}/${end.slice(0, 4)}`;
}
/** "novembro de 2026" */
export function fmtMes(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${mesNome(m)} de ${y}`;
}
export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const diaSemana = (iso: string) => DIAS_SEMANA[toUTC(iso).getUTCDay()];

export function firstOfMonth(iso: string): string {
  return iso.slice(0, 8) + "01";
}
export function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}-01`;
}
