"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DateInput from "@/components/DateInput";
import Author from "@/components/Author";
import { addDays } from "@/lib/dates";
import { COLORS, RECURRENCES, colorHex, layoutDay, minutes, type AgendaEvent, type Occurrence, type View } from "@/lib/agenda";
import { deleteEvent, saveEvent } from "@/app/(agenda)/agenda/actions";

const HOUR_H = 48;
const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...o }).format(new Date(`${iso}T00:00:00Z`));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pad = (n: number) => String(n).padStart(2, "0");
const toHHMM = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

type Draft = { ev?: AgendaEvent; date: string; start?: string; end?: string };

export default function AgendaView({ view, date, today, days, occs, names, meId, prev, next }: {
  view: View; date: string; today: string; days: string[]; occs: Occurrence[]; names: Record<string, string>; meId: string; prev: string; next: string;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const href = (v: View, d: string) => `/agenda?vista=${v}&data=${d}`;
  const byDay = (d: string) => occs.filter((o) => o.date <= d && o.endDate >= d);

  useEffect(() => {
    const t = () => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).split(":"); setNow(Number(p[0]) * 60 + Number(p[1])); };
    t();
    const id = setInterval(t, 60000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (scroller.current && view !== "mes") scroller.current.scrollTop = 7 * HOUR_H; }, [view, date]);

  const title = view === "mes" ? cap(fmt(date, { month: "long", year: "numeric" }))
    : view === "dia" ? cap(fmt(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))
    : `${fmt(days[0], { day: "numeric", month: "short" })} – ${fmt(days[days.length - 1], { day: "numeric", month: "short", year: "numeric" })}`;

  const chip = (o: Occurrence) => {
    const mine = o.event.user_id === meId;
    return (
      <button
        key={o.key} type="button" onClick={(e) => { e.stopPropagation(); setDraft({ ev: o.event, date: o.date }); }}
        title={`${o.start ? o.start + " " : ""}${o.event.title}${mine ? "" : ` — ${names[o.event.user_id ?? ""] ?? "equipe"}`}`}
        className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium text-white ${mine ? "" : "opacity-70"}`} style={{ background: colorHex(o.event.color) }}
      >{o.start && <span className="mr-1 font-normal opacity-90">{o.start}</span>}{o.event.title}</button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="page-title mr-2">Agenda</h1>
        <Link href={href(view, today)} className="btn btn-ghost">Hoje</Link>
        <Link href={href(view, prev)} className="btn btn-ghost" aria-label="Anterior">←</Link>
        <Link href={href(view, next)} className="btn btn-ghost" aria-label="Próximo">→</Link>
        <div className="text-lg font-semibold text-navy">{title}</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-line">
            {(["mes", "semana", "dia"] as View[]).map((v) => (
              <Link key={v} href={href(v, date)} className={`px-3 py-2 text-sm font-semibold ${view === v ? "bg-navy text-white" : "bg-surface text-navy hover:bg-soft"}`}>{v === "mes" ? "Mês" : v === "semana" ? "Semana" : "Dia"}</Link>
            ))}
          </div>
          <button className="btn btn-accent" onClick={() => setDraft({ date: view === "mes" ? (date.slice(0, 7) === today.slice(0, 7) ? today : date) : date })}>+ Novo evento</button>
        </div>
      </div>

      {view === "mes" ? (
        <div className="card overflow-hidden !p-0">
          <div className="grid grid-cols-7 border-b border-line bg-slate-100 text-center text-xs font-semibold uppercase text-slate-600">{DOW.map((d) => <div key={d} className="py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = byDay(d);
              const out = d.slice(0, 7) !== date.slice(0, 7);
              return (
                <div key={d} onClick={() => setDraft({ date: d })} className={`min-h-28 cursor-pointer border-b border-r border-line p-1.5 hover:bg-soft ${out ? "bg-slate-50 text-slate-400" : ""}`}>
                  <Link href={href("dia", d)} onClick={(e) => e.stopPropagation()} className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${d === today ? "bg-accent text-white" : ""}`}>{Number(d.slice(8))}</Link>
                  <div className="space-y-0.5">
                    {list.slice(0, 3).map(chip)}
                    {list.length > 3 && <Link href={href("dia", d)} onClick={(e) => e.stopPropagation()} className="block px-1 text-xs text-slate-600 hover:underline">+{list.length - 3} mais</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="grid border-b border-line bg-slate-100" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
            <div />
            {days.map((d, i) => (
              <Link key={d} href={href("dia", d)} className="py-2 text-center text-xs font-semibold uppercase text-slate-600 hover:underline">
                {DOW[(i + (view === "dia" ? (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7 : 0)) % 7]} <span className={`ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm ${d === today ? "bg-accent text-white" : ""}`}>{Number(d.slice(8))}</span>
              </Link>
            ))}
          </div>
          <div className="grid border-b border-line" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
            <div className="py-1 pr-1 text-right text-[10px] text-slate-500">dia todo</div>
            {days.map((d) => (
              <div key={d} className="min-h-7 space-y-0.5 border-l border-line p-1" onClick={() => setDraft({ date: d })}>{byDay(d).filter((o) => o.allDay).map(chip)}</div>
            ))}
          </div>
          <div ref={scroller} className="max-h-[640px] overflow-y-auto">
            <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
              <div className="relative" style={{ height: 24 * HOUR_H }}>
                {Array.from({ length: 24 }, (_, h) => <div key={h} className="absolute right-1 -translate-y-2 text-[10px] text-slate-500" style={{ top: h * HOUR_H }}>{h === 0 ? "" : `${pad(h)}:00`}</div>)}
              </div>
              {days.map((d) => {
                const placed = layoutDay(byDay(d).filter((o) => !o.allDay));
                return (
                  <div
                    key={d} className="relative cursor-pointer border-l border-line" style={{ height: 24 * HOUR_H, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_H - 1}px, var(--color-line) ${HOUR_H - 1}px, var(--color-line) ${HOUR_H}px)` }}
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const m = Math.floor(((e.clientY - r.top) / HOUR_H) * 2) * 30; setDraft({ date: d, start: toHHMM(m), end: toHHMM(m + 60) }); }}
                  >
                    {d === today && now != null && <div className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-red-500" style={{ top: (now / 60) * HOUR_H }} />}
                    {placed.map(({ occ, col, cols }) => {
                      const top = (minutes(occ.start!) / 60) * HOUR_H;
                      const h = Math.max(22, (((occ.end ? minutes(occ.end) : minutes(occ.start!) + 60) - minutes(occ.start!)) / 60) * HOUR_H - 2);
                      const mine = occ.event.user_id === meId;
                      return (
                        <button
                          key={occ.key} type="button" onClick={(e) => { e.stopPropagation(); setDraft({ ev: occ.event, date: occ.date }); }}
                          title={`${occ.start}${occ.end ? `–${occ.end}` : ""} ${occ.event.title}${mine ? "" : ` — ${names[occ.event.user_id ?? ""] ?? "equipe"}`}`}
                          className={`absolute overflow-hidden rounded px-1.5 py-0.5 text-left text-xs font-medium text-white ${mine ? "" : "opacity-70"}`}
                          style={{ top, height: h, left: `calc(${(col / cols) * 100}% + 1px)`, width: `calc(${100 / cols}% - 3px)`, background: colorHex(occ.event.color) }}
                        ><div className="truncate">{occ.event.title}</div><div className="truncate text-[10px] font-normal opacity-90">{occ.start}{occ.end ? `–${occ.end}` : ""}{occ.event.location ? ` · ${occ.event.location}` : ""}</div></button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <EventDialog draft={draft} names={names} meId={meId} onClose={() => setDraft(null)} />
    </div>
  );
}

function TimeField({ name, value, onChange, label }: { name: string; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div><label className="label">{label}</label>
      <input name={name} value={value} inputMode="numeric" maxLength={5} placeholder="hh:mm" autoComplete="off" className="input"
        onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); onChange(d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d); }} /></div>
  );
}

function EventDialog({ draft, names, meId, onClose }: { draft: Draft | null; names: Record<string, string>; meId: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (draft && !d.open) { setErr(null); d.showModal(); }
    if (!draft && d.open) d.close();
  }, [draft]);

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      className="m-auto w-[min(94vw,34rem)] rounded-2xl border border-line bg-surface p-0 text-slate-800 backdrop:bg-black/50">
      {draft && <EventForm key={`${draft.ev?.id ?? "novo"}:${draft.date}:${draft.start ?? ""}`} draft={draft} names={names} mine={!draft.ev || draft.ev.user_id === meId}
        err={err} pending={pending}
        onCancel={() => ref.current?.close()}
        onSave={async (input) => { setPending(true); const r = await saveEvent(input); setPending(false); if (!r.ok) { setErr(r.error); return; } ref.current?.close(); router.refresh(); }}
        onDelete={async (id, recurring) => {
          if (!window.confirm(recurring ? "Excluir este evento e todas as repetições?" : "Excluir este evento?")) return;
          setPending(true); const r = await deleteEvent(id); setPending(false);
          if (!r.ok) { setErr(r.error); return; }
          ref.current?.close(); router.refresh();
        }} />}
    </dialog>
  );
}

function EventForm({ draft, names, mine, err, pending, onCancel, onSave, onDelete }: {
  draft: Draft; names: Record<string, string>; mine: boolean; err: string | null; pending: boolean;
  onCancel: () => void; onSave: (i: Parameters<typeof saveEvent>[0]) => Promise<void>; onDelete: (id: string, recurring: boolean) => Promise<void>;
}) {
  const ev = draft.ev;
  const [title, setTitle] = useState(ev?.title ?? "");
  const [allDay, setAllDay] = useState(ev ? !ev.start_time : !draft.start);
  const [start, setStart] = useState(ev?.start_time?.slice(0, 5) ?? draft.start ?? "09:00");
  const [end, setEnd] = useState(ev?.end_time?.slice(0, 5) ?? draft.end ?? "10:00");
  const [date, setDate] = useState(ev?.start_date ?? draft.date);
  const [endDate, setEndDate] = useState(ev?.end_date ?? "");
  const [rec, setRec] = useState<string>(ev?.recurrence ?? "none");
  const [until, setUntil] = useState(ev?.recur_until ?? "");
  const [color, setColor] = useState(ev?.color ?? "blue");
  const [vis, setVis] = useState(ev?.visibility ?? "private");
  const [loc, setLoc] = useState(ev?.location ?? "");
  const [desc, setDesc] = useState(ev?.description ?? "");

  if (!mine && ev) {
    return (
      <div className="space-y-3 p-5">
        <h2 className="text-lg font-bold text-navy">{ev.title}</h2>
        <p className="text-sm text-slate-600">{fmt(draft.date, { weekday: "long", day: "numeric", month: "long" })}{ev.start_time ? ` · ${ev.start_time.slice(0, 5)}${ev.end_time ? `–${ev.end_time.slice(0, 5)}` : ""}` : " · dia todo"}</p>
        {ev.location && <p className="text-sm">📍 {ev.location}</p>}
        {ev.description && <p className="whitespace-pre-wrap text-sm">{ev.description}</p>}
        <p className="inline-flex items-center gap-1 text-xs text-slate-600">Compartilhado por <Author name={names[ev.user_id ?? ""] ?? "Equipe"} /></p>
        <div className="flex justify-end"><button className="btn btn-ghost" onClick={onCancel}>Fechar</button></div>
      </div>
    );
  }

  return (
    <form className="space-y-3 p-5" onSubmit={async (e) => { e.preventDefault(); await onSave({ id: ev?.id, title, description: desc || null, location: loc || null, color, visibility: vis, recurrence: rec, recur_until: until || null, start_date: date, end_date: allDay ? endDate || null : null, start_time: allDay ? null : start, end_time: allDay ? null : end || null }); }}>
      <h2 className="text-lg font-bold text-navy">{ev ? "Editar evento" : "Novo evento"}</h2>
      {err && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{err}</div>}
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do evento" aria-label="Título" required className="input !text-base font-medium" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Data</label><DateInput name="date" required defaultValue={date} onValueChange={setDate} /></div>
        {allDay ? <div><label className="label">Até (opcional)</label><DateInput name="end" defaultValue={endDate} onValueChange={setEndDate} /></div> : <div className="grid grid-cols-2 gap-3"><TimeField name="start" label="Início" value={start} onChange={setStart} /><TimeField name="end" label="Fim" value={end} onChange={setEnd} /></div>}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4" /> Dia inteiro</label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Repetir</label><select value={rec} onChange={(e) => setRec(e.target.value)} className="input">{RECURRENCES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
        {rec !== "none" && <div><label className="label">Repetir até (opcional)</label><DateInput name="until" defaultValue={until} onValueChange={setUntil} /></div>}
      </div>
      <div><label className="label">Local</label><input value={loc} onChange={(e) => setLoc(e.target.value)} className="input" placeholder="Endereço, link da reunião…" /></div>
      <div><label className="label">Descrição</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="input" /></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Cor">{COLORS.map((c) => <button key={c.id} type="button" role="radio" aria-checked={color === c.id} aria-label={c.id} onClick={() => setColor(c.id)} className={`h-6 w-6 rounded-full ${color === c.id ? "ring-2 ring-offset-2 ring-slate-500" : ""}`} style={{ background: c.hex }} />)}</div>
        <select value={vis} onChange={(e) => setVis(e.target.value as "private" | "team")} className="input !w-auto" aria-label="Visibilidade"><option value="private">Só eu vejo</option><option value="team">Compartilhado com a equipe</option></select>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        {ev ? <button type="button" className="btn btn-danger" disabled={pending} onClick={() => void onDelete(ev.id, ev.recurrence !== "none")}>Excluir</button> : <span />}
        <div className="flex gap-2"><button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button><button className="btn btn-accent" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button></div>
      </div>
    </form>
  );
}
