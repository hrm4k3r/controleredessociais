import { useId } from "react";

/** Símbolo Rixxer: o "X" da marca (roxo → rosa). */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg viewBox="495 0 395 345" width={size * (395 / 345)} height={size} className={className} aria-hidden="true">
      <defs><linearGradient id={id} x1="0" x2="1"><stop offset=".55" stopColor="#5b47c2" /><stop offset="1" stopColor="#dd6ad6" /></linearGradient></defs>
      <path fill={`url(#${id})`} d="M505 0h95l133 170-136 175h-97l139-175z" />
      <path fill="#dd6ad6" d="M780 0h98L753 157l-47-60zM752 180l132 165h-97l-81-105z" />
    </svg>
  );
}

/** Logotipo: X da Rixxer + "Rixxer Hub" (Hub em rosa). A cor do texto vem do elemento pai. */
export default function Logo({ size = 28, textClass = "text-lg", className = "" }: { size?: number; textClass?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <LogoMark size={size} />
      <span className={textClass}>Rixxer <span className="text-accent-2">Hub</span></span>
    </span>
  );
}
