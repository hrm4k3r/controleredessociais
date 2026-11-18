import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { loadMemberNames } from "@/lib/members";
import AgendaView from "@/components/AgendaView";
import { addDays, addMonthsKeepDay, firstOfMonth, isValidISO, monthEnd, todayISO, weekEnd, weekStart } from "@/lib/dates";
import { COLS, expandEvents, isView, type AgendaEvent } from "@/lib/agenda";
import { one } from "@/lib/params";

export const dynamic = "force-dynamic";

export default async function Agenda({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const today = todayISO();
  const v = one(sp.vista);
  const view = isView(v) ? v : "mes";
  const d = one(sp.data);
  const date = isValidISO(d) ? d : today;
  const from = view === "mes" ? weekStart(firstOfMonth(date)) : view === "semana" ? weekStart(date) : date;
  const to = view === "mes" ? weekEnd(weekStart(monthEnd(date))) : view === "semana" ? weekEnd(weekStart(date)) : date;
  const sb = await createClient();
  const access = (await getAccess(sb))!;
  const [res, names] = await Promise.all([
    sb.from("agenda_events").select(COLS).lte("start_date", to).limit(5000),
    loadMemberNames(sb),
  ]);
  if (res.error) {
    return (
      <div className="space-y-5"><h1 className="page-title">Agenda</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">Não foi possível carregar a agenda. Se for a primeira vez, rode a migração <code>20261118000010_agenda.sql</code> no Supabase.</div></div>
    );
  }
  const occs = expandEvents((res.data ?? []) as AgendaEvent[], from, to);
  const days: string[] = [];
  for (let x = from; x <= to; x = addDays(x, 1)) days.push(x);
  const prev = view === "mes" ? addMonthsKeepDay(firstOfMonth(date), -1) : addDays(date, view === "semana" ? -7 : -1);
  const next = view === "mes" ? addMonthsKeepDay(firstOfMonth(date), 1) : addDays(date, view === "semana" ? 7 : 1);
  return <AgendaView view={view} date={date} today={today} days={days} occs={occs} names={names} meId={access.userId} prev={prev} next={next} />;
}
