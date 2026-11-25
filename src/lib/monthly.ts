import { compare, totals, type Line, type Nums } from "./baseline";
import { GOOGLE_FIELDS, isMonthly, type GoogleField } from "./constants";
import { toISOAfterMonths } from "./month-util";

/** Dia do mês em que o fechamento do mês anterior pode ser feito (o Google leva 2–3 dias para consolidar). */
export const CLOSING_DAY = 5;

export type MonthlyRow = Nums & {
  client_id: string; network: string; month: string; learning: string | null;
  calls?: number | null; directions?: number | null; website_clicks?: number | null; chat_clicks?: number | null; bookings?: number | null;
};
export type MonthlyNote = { client_id: string; month: string; comment: string | null; next_steps: string | null; collected_at: string | null };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Primeiro dia do mês de uma data aaaa-mm-dd (ou aaaa-mm). */
export const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
export const isMonthISO = (s: string | undefined | null): s is string => !!s && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(s);
export const addMonths = (month: string, n: number) => toISOAfterMonths(month, n);
/** "outubro de 2026" */
export function fmtMes(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MESES[m - 1]} de ${y}`;
}
/** "out./2026" */
export function fmtMesCurto(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MESES[m - 1].slice(0, 3)}./${y}`;
}

/** Mês que está pronto para fechar hoje: a partir do dia 5, o mês anterior; antes disso, o mês retrasado. */
export function closableMonth(todayISO: string): string {
  const day = Number(todayISO.slice(8, 10));
  return addMonths(monthStart(todayISO), day >= CLOSING_DAY ? -1 : -2);
}

export type MonthItem = {
  network: string; monthly: boolean; has: boolean;
  cur: Nums | null; prev: Nums | null; lines: Line[];
  google: { key: GoogleField; label: string; cur: number | null; prev: number | null }[];
  learning: string | null;
};
export type MonthlyReport = {
  client: { id: string; name: string }; month: string; prev: string;
  items: MonthItem[]; lines: Line[]; note: MonthlyNote | null;
  /** Últimos 6 meses (até `month`): seguidores somados das redes sociais, para o gráfico de evolução. */
  history: { month: string; followers: number | null }[];
};

const nums = (r: MonthlyRow | undefined): Nums | null => (r ? { followers: r.followers, views: r.views, reach: r.reach, interactions: r.interactions, clicks: r.clicks } : null);
const EMPTY: Nums = { followers: null, views: null, reach: null, interactions: null, clicks: null };
const hasAny = (n: Nums | null, r?: MonthlyRow) => !!n && (Object.values(n).some((v) => v != null) || GOOGLE_FIELDS.some((g) => r?.[g.key] != null));

/** Rótulos de métrica para período mensal. */
export const monthLabel = (label: string) => label.replace("(7 dias)", "(mês)");

/** Relatório do mês de um cliente: cada rede contra o mês anterior. */
export function monthlyReport(client: { id: string; name: string }, networks: string[], rows: MonthlyRow[], notes: MonthlyNote[], month: string): MonthlyReport {
  const prev = addMonths(month, -1);
  const mine = rows.filter((r) => r.client_id === client.id);
  const items = networks.map((network): MonthItem => {
    const c = mine.find((r) => r.network === network && r.month === month);
    const p = mine.find((r) => r.network === network && r.month === prev);
    const cur = nums(c), pv = nums(p);
    return {
      network, monthly: isMonthly(network), has: hasAny(cur, c), cur, prev: pv,
      lines: compare(pv ?? EMPTY, cur ?? EMPTY).map((l) => ({ ...l, label: monthLabel(l.label) })),
      google: isMonthly(network) ? GOOGLE_FIELDS.map((g) => ({ key: g.key, label: g.label, cur: c?.[g.key] ?? null, prev: p?.[g.key] ?? null })) : [],
      learning: c?.learning ?? null,
    };
  });
  const withData = items.filter((i) => i.has && !i.monthly); // Google (visualizações do perfil) não se mistura com os totais das redes sociais
  const lines = totals(withData.map((i) => ({ before: i.prev ?? EMPTY, after: i.cur! }))).map((l) => ({ ...l, label: monthLabel(l.label) }));
  // Histórico só com as redes que têm seguidores no mês do relatório e em todos os meses mostrados (comparação justa).
  const curNets = networks.filter((n) => !isMonthly(n) && mine.some((r) => r.network === n && r.month === month && r.followers != null));
  const history = [-5, -4, -3, -2, -1, 0].map((k) => {
    const m = addMonths(month, k);
    const vals = curNets.map((n) => mine.find((r) => r.network === n && r.month === m)?.followers ?? null);
    return { month: m, followers: curNets.length && vals.every((v) => v != null) ? (vals as number[]).reduce((a, b) => a + b, 0) : null };
  });
  return { client, month, prev, items, lines, history, note: notes.find((n) => n.client_id === client.id && n.month === month) ?? null };
}
