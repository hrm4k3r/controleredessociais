"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addPomodoro } from "@/app/(app)/tarefas/actions";
import { advance, clampCfg, DEFAULT_CFG, fmtClock, LABEL, LS_CFG, LS_TIMER, minutesOf, startFocus, type Cfg, type Pomo } from "@/lib/pomodoro";

const read = <T,>(key: string): T | null => { try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; } };
const write = (key: string, v: unknown) => { try { if (v == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [660, 880, 660].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.start(t); o.stop(t + 0.26);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch { /* sem áudio */ }
}
const notify = (title: string, body: string) => { try { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body }); } catch { /* sem notificação */ } };

/** Timer Pomodoro flutuante. Continua ao trocar de página; os cartões o iniciam pelo evento "pomodoro:start". */
export default function PomodoroDock() {
  const [p, setP] = useState<Pomo | null>(null);
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG);
  const [now, setNow] = useState(() => Date.now());
  const [showCfg, setShowCfg] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const commit = useCallback((next: Pomo | null) => {
    setP(next);
    write(LS_TIMER, next);
    window.dispatchEvent(new CustomEvent("pomodoro:active", { detail: { taskId: next && next.phase === "focus" ? next.taskId : null } }));
  }, []);

  useEffect(() => {
    setCfg(clampCfg(read<Partial<Cfg>>(LS_CFG) ?? {}));
    const saved = read<Pomo>(LS_TIMER);
    if (saved) setP(saved);
    const onStart = (e: Event) => {
      const d = (e as CustomEvent<{ taskId: string; title: string }>).detail;
      if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
      commit(startFocus(d.taskId, d.title, cfgRef.current, Date.now()));
    };
    window.addEventListener("pomodoro:start", onStart);
    return () => window.removeEventListener("pomodoro:start", onStart);
  }, [commit]);

  // relógio + fim de fase
  useEffect(() => {
    if (!p) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const cur = read<Pomo>(LS_TIMER);
      if (!cur || cur.endsAt == null || t < cur.endsAt) return;
      // lê o estado salvo para não contar duas vezes (várias abas)
      const { next, completedFocus } = advance(cur, cfgRef.current, t);
      commit(next);
      beep();
      if (completedFocus) {
        notify("Foco concluído!", `${cur.title} — hora da ${LABEL[next.phase].toLowerCase()}.`);
        void addPomodoro(cur.taskId, cfgRef.current.focus).then((r) => {
          if (r.ok) window.dispatchEvent(new CustomEvent("pomodoro:done", { detail: { taskId: cur.taskId, pomodoros: r.pomodoros, focus_minutes: r.focus_minutes } }));
          else setErr(r.error.includes("column") ? "Rode a migração 20261118000014_tarefas_pomodoro.sql no Supabase para gravar os pomodoros." : r.error);
        });
      } else {
        notify("Pausa acabou", "Pronto para o próximo foco?");
      }
    }, 500);
    return () => clearInterval(id);
  }, [p, commit]);

  // título da aba
  useEffect(() => {
    const base = "Rixxer Hub";
    if (p && p.endsAt != null) document.title = `${fmtClock(p.endsAt - now)} · ${LABEL[p.phase]} · ${base}`;
    else if (p && p.leftMs != null) document.title = `⏸ ${fmtClock(p.leftMs)} · ${base}`;
    return () => { document.title = base; };
  }, [p, now]);

  const total = p ? minutesOf(p.phase, cfg) * 60000 : 0;
  const left = p ? (p.endsAt != null ? p.endsAt - now : p.leftMs ?? 0) : 0;
  const pct = p && total > 0 ? Math.min(100, Math.max(0, ((total - left) / total) * 100)) : 0;

  if (!p && !err) return null;
  const tone = p?.phase === "focus" ? "bg-accent" : p?.phase === "ready" ? "bg-slate-500" : "bg-green-600";

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-2xl border border-line bg-surface p-3 text-slate-800 shadow-2xl" role="timer" aria-label="Pomodoro">
      {err && <p role="alert" className="mb-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-800">{err} <button className="underline" onClick={() => setErr(null)}>fechar</button></p>}
      {p && (
        <>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{LABEL[p.phase]} · 🍅 {p.done}</span>
            <button className="px-1 hover:text-navy" aria-label="Configurar tempos" onClick={() => setShowCfg((v) => !v)}>⚙</button>
          </div>
          <div className="truncate text-sm font-medium" title={p.title}>{p.title}</div>
          <div className="my-1 text-4xl font-extrabold tabular-nums text-navy">{p.phase === "ready" ? "--:--" : fmtClock(left)}</div>
          <div className="mb-2 h-1.5 rounded bg-slate-100"><div className={`h-1.5 rounded ${tone}`} style={{ width: `${pct}%` }} /></div>
          <div className="flex flex-wrap gap-2">
            {p.phase === "ready" ? (
              <button className="btn btn-accent !px-3 !py-1.5" onClick={() => commit({ ...startFocus(p.taskId, p.title, cfg, Date.now(), p.done) })}>▶ Próximo foco</button>
            ) : p.endsAt != null ? (
              <button className="btn btn-ghost !px-3 !py-1.5" onClick={() => commit({ ...p, endsAt: null, leftMs: Math.max(0, p.endsAt! - Date.now()) })}>⏸ Pausar</button>
            ) : (
              <button className="btn btn-accent !px-3 !py-1.5" onClick={() => commit({ ...p, endsAt: Date.now() + (p.leftMs ?? 0), leftMs: null })}>▶ Continuar</button>
            )}
            {p.phase !== "ready" && p.phase !== "focus" && <button className="btn btn-ghost !px-3 !py-1.5" onClick={() => commit(startFocus(p.taskId, p.title, cfg, Date.now(), p.done))}>Pular pausa</button>}
            <button className="btn btn-ghost !px-3 !py-1.5" onClick={() => { if (p.phase !== "focus" || window.confirm("Parar o timer? O foco em andamento não será contado.")) commit(null); }}>⏹ Parar</button>
          </div>
          {showCfg && (
            <div className="mt-2 grid grid-cols-4 gap-1.5 border-t border-line pt-2 text-xs">
              {([["focus", "Foco"], ["short", "Pausa"], ["long", "Longa"], ["every", "Ciclos"]] as const).map(([k, l]) => (
                <label key={k} className="block"><span className="label !mb-0.5 !text-[10px]">{l}</span>
                  <input type="number" min={1} value={cfg[k]} onChange={(e) => { const c = clampCfg({ ...cfg, [k]: e.target.value }); setCfg(c); write(LS_CFG, c); }} className="input !px-1.5 !py-1" /></label>
              ))}
              <p className="col-span-4 text-[11px] text-slate-500">Minutos de foco, pausa curta, pausa longa e quantos focos até a pausa longa. Vale a partir do próximo ciclo.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
