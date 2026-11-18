import { addDays, addMonthsKeepDay, diffDays } from "./dates";

export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";
export const RECURRENCES: { id: Recurrence; label: string }[] = [
  { id: "none", label: "Não repete" }, { id: "daily", label: "Todo dia" }, { id: "weekly", label: "Toda semana" },
  { id: "monthly", label: "Todo mês" }, { id: "yearly", label: "Todo ano" },
];
export const COLORS = [
  { id: "blue", hex: "#2563eb" }, { id: "green", hex: "#16a34a" }, { id: "orange", hex: "#e8590c" }, { id: "red", hex: "#dc2626" },
  { id: "purple", hex: "#7c3aed" }, { id: "teal", hex: "#0d9488" }, { id: "pink", hex: "#db2777" }, { id: "gray", hex: "#64748b" },
];
export const colorHex = (id: string) => COLORS.find((c) => c.id === id)?.hex ?? COLORS[0].hex;

export type AgendaEvent = {
  id: string; user_id: string | null; title: string; description: string | null; location: string | null; color: string;
  visibility: "private" | "team"; recurrence: Recurrence; recur_until: string | null;
  start_date: string; end_date: string | null; start_time: string | null; end_time: string | null;
};

/** Uma ocorrência (evento simples ou uma repetição) dentro do período exibido. */
export type Occurrence = { key: string; event: AgendaEvent; date: string; endDate: string; start: string | null; end: string | null; allDay: boolean };

export const COLS = "id,user_id,title,description,location,color,visibility,recurrence,recur_until,start_date,end_date,start_time,end_time";
export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
export const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

function nth(e: AgendaEvent, k: number): string {
  switch (e.recurrence) {
    case "daily": return addDays(e.start_date, k);
    case "weekly": return addDays(e.start_date, 7 * k);
    case "monthly": return addMonthsKeepDay(e.start_date, k);
    case "yearly": return addMonthsKeepDay(e.start_date, 12 * k);
    default: return e.start_date;
  }
}

/** Expande eventos (com repetição) em ocorrências que tocam o período [from, to]. */
export function expandEvents(events: AgendaEvent[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const e of events) {
    const span = e.start_time ? 0 : Math.max(0, diffDays(e.start_date, e.end_date ?? e.start_date));
    const push = (date: string, k: number) => {
      const endDate = addDays(date, span);
      if (endDate < from || date > to) return;
      out.push({ key: `${e.id}:${k}`, event: e, date, endDate, start: hhmm(e.start_time), end: hhmm(e.end_time), allDay: !e.start_time });
    };
    if (e.recurrence === "none") { push(e.start_date, 0); continue; }
    let k = 0;
    if (e.recurrence === "daily" || e.recurrence === "weekly") {
      const step = e.recurrence === "daily" ? 1 : 7;
      k = Math.max(0, Math.floor((diffDays(e.start_date, from) - span) / step) - 1);
    }
    for (let guard = 0; guard < 4000; guard++, k++) {
      const date = nth(e, k);
      if (date > to || (e.recur_until && date > e.recur_until)) break;
      push(date, k);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? "") || a.event.title.localeCompare(b.event.title));
}

/** Distribui eventos com horário de um dia em colunas lado a lado quando se sobrepõem. */
export function layoutDay(occs: Occurrence[]): { occ: Occurrence; col: number; cols: number }[] {
  const timed = occs.filter((o) => o.start).sort((a, b) => minutes(a.start!) - minutes(b.start!));
  const endOf = (o: Occurrence) => Math.max(minutes(o.start!) + 30, o.end ? minutes(o.end) : minutes(o.start!) + 60);
  const out: { occ: Occurrence; col: number; cols: number }[] = [];
  let group: typeof out = [];
  let groupEnd = -1;
  const flush = () => { const cols = Math.max(1, ...group.map((g) => g.col + 1)); group.forEach((g) => (g.cols = cols)); out.push(...group); group = []; };
  for (const o of timed) {
    if (group.length && minutes(o.start!) >= groupEnd) { flush(); groupEnd = -1; }
    const used = new Set(group.filter((g) => endOf(g.occ) > minutes(o.start!)).map((g) => g.col));
    let col = 0;
    while (used.has(col)) col++;
    group.push({ occ: o, col, cols: 1 });
    groupEnd = Math.max(groupEnd, endOf(o));
  }
  flush();
  return out;
}

export type View = "mes" | "semana" | "dia";
export const isView = (v: string | undefined): v is View => v === "mes" || v === "semana" || v === "dia";
