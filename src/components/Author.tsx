const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
const hue = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 11);

/** Avatar com iniciais + nome de quem fez a ação. `label` explica o papel (ex.: "Criado por"). */
export default function Author({ name, label, className = "" }: { name?: string | null; label?: string; className?: string }) {
  if (!name) return <span className={`text-slate-400 ${className}`}>—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={label ? `${label} ${name}` : name}>
      <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: `hsl(${hue(name)} 55% 42%)` }}>{initials(name)}</span>
      <span className="truncate">{name}</span>
    </span>
  );
}
