export type Phase = "focus" | "short" | "long" | "ready";
export type Cfg = { focus: number; short: number; long: number; every: number };
export const DEFAULT_CFG: Cfg = { focus: 25, short: 5, long: 15, every: 4 };
export const LS_TIMER = "rh-pomodoro";
export const LS_CFG = "rh-pomodoro-cfg";

/** Estado do timer (guardado no navegador; continua ao trocar de página ou recarregar). */
export type Pomo = {
  taskId: string; title: string; phase: Phase;
  endsAt: number | null;   // instante (ms) em que a fase termina; null se pausado ou aguardando
  leftMs: number | null;   // quanto falta, quando pausado
  done: number;            // ciclos de foco concluídos nesta sequência
};

export const minutesOf = (phase: Phase, cfg: Cfg) => (phase === "focus" ? cfg.focus : phase === "short" ? cfg.short : phase === "long" ? cfg.long : 0);
export const LABEL: Record<Phase, string> = { focus: "Foco", short: "Pausa curta", long: "Pausa longa", ready: "Pausa acabou" };

export function startFocus(taskId: string, title: string, cfg: Cfg, now: number, done = 0): Pomo {
  return { taskId, title, phase: "focus", endsAt: now + cfg.focus * 60000, leftMs: null, done };
}

/** Avança quando a fase atual termina: foco → pausa (longa a cada `every` ciclos) → aguardando. */
export function advance(p: Pomo, cfg: Cfg, now: number): { next: Pomo; completedFocus: boolean } {
  if (p.phase === "focus") {
    const done = p.done + 1;
    const phase: Phase = done % cfg.every === 0 ? "long" : "short";
    return { next: { ...p, done, phase, endsAt: now + minutesOf(phase, cfg) * 60000, leftMs: null }, completedFocus: true };
  }
  return { next: { ...p, phase: "ready", endsAt: null, leftMs: null }, completedFocus: false };
}

/** "24:59" */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function clampCfg(c: Partial<Cfg>): Cfg {
  const n = (v: unknown, d: number, min: number, max: number) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : d; };
  return { focus: n(c.focus, 25, 1, 120), short: n(c.short, 5, 1, 60), long: n(c.long, 15, 1, 90), every: n(c.every, 4, 2, 12) };
}
