"use client";

import { useRef, useState } from "react";

const toBr = (iso?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

/** Converte "dd/mm/aaaa" em "aaaa-mm-dd"; "" se incompleta ou inexistente (ex.: 31/02). */
export function brToIso(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return "";
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function mask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Data no formato dd/mm/aaaa (independe do idioma do navegador). Envia `name` em ISO (aaaa-mm-dd). */
export default function DateInput({
  name, defaultValue, required, className = "input", ariaLabel, onValueChange,
}: { name: string; defaultValue?: string | null; required?: boolean; className?: string; ariaLabel?: string; /** Recebe a data em ISO (aaaa-mm-dd) ou "" quando incompleta. */ onValueChange?: (iso: string) => void }) {
  const [text, setText] = useState(toBr(defaultValue));
  const picker = useRef<HTMLInputElement>(null);
  const iso = brToIso(text);
  const invalid = text !== "" && iso === "";

  return (
    <span className="relative inline-flex w-full items-center">
      <input type="hidden" name={name} value={iso} />
      <input
        type="text" inputMode="numeric" placeholder="dd/mm/aaaa" autoComplete="off" maxLength={10}
        value={text} required={required} aria-label={ariaLabel} aria-invalid={invalid}
        onChange={(e) => {
          const v = mask(e.target.value);
          setText(v);
          onValueChange?.(brToIso(v));
          e.target.setCustomValidity(v !== "" && brToIso(v) === "" ? "Informe uma data válida (dd/mm/aaaa)." : "");
        }}
        className={`${className} pr-9`}
      />
      <button
        type="button" tabIndex={-1} aria-label="Abrir calendário"
        onClick={() => picker.current?.showPicker?.()}
        className="absolute right-2 text-slate-400 hover:text-slate-200"
      >📅</button>
      <input
        ref={picker} type="date" tabIndex={-1} aria-hidden value={iso}
        onChange={(e) => { if (e.target.value) { setText(toBr(e.target.value)); onValueChange?.(e.target.value); } }}
        className="pointer-events-none absolute right-0 h-0 w-0 opacity-0"
      />
    </span>
  );
}
