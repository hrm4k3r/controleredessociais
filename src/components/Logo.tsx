/** Símbolo do Rixxer Hub: um centro e três nós (as três gestões ligadas ao mesmo cliente). Usa a cor do texto (currentColor). */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="3" />
      <g stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <line x1="60" y1="60" x2="60" y2="20" /><line x1="60" y1="60" x2="94.6" y2="80" /><line x1="60" y1="60" x2="25.4" y2="80" />
      </g>
      <g fill="currentColor"><circle cx="60" cy="20" r="9" /><circle cx="94.6" cy="80" r="9" /><circle cx="25.4" cy="80" r="9" /></g>
      <circle cx="60" cy="60" r="15" fill="#e8590c" />
    </svg>
  );
}

/** Logotipo completo: símbolo + "Rixxer Hub" (Hub em laranja). A cor do conjunto vem do texto do elemento pai. */
export default function Logo({ size = 28, textClass = "text-lg", className = "" }: { size?: number; textClass?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <LogoMark size={size} />
      <span className={textClass}>Rixxer <span className="text-accent">Hub</span></span>
    </span>
  );
}
