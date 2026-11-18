"use client";

import { useState } from "react";
import DateInput from "@/components/DateInput";
import { spParts } from "@/lib/dates";

/** Data e hora em que os dados da semana foram coletados (ex.: Insights do Instagram). */
export default function CollectedAt({ prefix, defaultDate, defaultTime }: { prefix: string; defaultDate: string; defaultTime: string }) {
  const [time, setTime] = useState(defaultTime);
  const [version, setVersion] = useState(0);
  const [date, setDate] = useState(defaultDate);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <span className="font-semibold">Dados coletados em</span>
      <div className="w-32" key={version}><DateInput name={`${prefix}|date`} defaultValue={date} className="input !py-1" ariaLabel="Data da coleta" /></div>
      <span>às</span>
      <input name={`${prefix}|time`} value={time} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); setTime(d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d); }} inputMode="numeric" maxLength={5} placeholder="hh:mm" aria-label="Hora da coleta" className="input !w-20 !py-1" />
      <button type="button" className="btn btn-ghost !px-2 !py-1 !text-xs" onClick={() => { const n = spParts(new Date().toISOString()); setDate(n.date); setTime(n.time); setVersion((v) => v + 1); }}>Agora</button>
    </div>
  );
}
