"use client";

import { joinFormats, splitFormats } from "@/lib/format";

/** Formato do post: lista suspensa (um só) ou caixas de seleção quando `multi` (Instagram: Feed e Stories no mesmo post). */
export default function FormatPicker({ formats, value, onChange, multi }: { formats: string[]; value: string; onChange: (v: string) => void; multi: boolean }) {
  const chosen = splitFormats(value);
  if (!multi) {
    return (
      <select value={chosen[0] ?? ""} onChange={(e) => onChange(e.target.value)} className="input" aria-label="Formato">
        <option value="">—</option>{formats.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
    );
  }
  const toggle = (f: string) => onChange(joinFormats(formats.filter((x) => (x === f ? !chosen.includes(f) : chosen.includes(x)))) ?? "");
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Formato (pode marcar mais de um)">
      {formats.map((f) => (
        <label key={f} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-sm ${chosen.includes(f) ? "border-green-600 bg-green-50 font-semibold text-green-800" : "border-line bg-surface"}`}>
          <input type="checkbox" checked={chosen.includes(f)} onChange={() => toggle(f)} className="h-4 w-4" />{f}
        </label>
      ))}
    </div>
  );
}
