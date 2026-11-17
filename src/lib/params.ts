import { currentWeekStart, isValidISO, weekStart } from "./dates";

type SP = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Lê ?semana=YYYY-MM-DD (qualquer dia) e normaliza para a segunda-feira. Padrão: semana atual. */
export function weekParam(sp: SP, key = "semana"): string {
  const v = one(sp[key]);
  return isValidISO(v) ? weekStart(v) : currentWeekStart();
}
export const ok = (sp: SP) => one(sp.ok) != null;
