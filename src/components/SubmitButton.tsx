"use client";

import { useFormStatus } from "react-dom";

/** Botão de envio com estado de progresso: mostra "Salvando…" + barra no topo enquanto a action roda. */
export default function SubmitButton({
  children, className = "btn", pendingText = "Salvando…", disabled, confirm,
}: { children: React.ReactNode; className?: string; pendingText?: string; disabled?: boolean; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button className={className} onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }} disabled={disabled || pending} aria-busy={pending}>
        {pending && <span className="spinner" aria-hidden />}
        {pending ? pendingText : children}
      </button>
      {pending && (
        <div className="progress-top" role="progressbar" aria-label={pendingText}><span /></div>
      )}
    </>
  );
}
