import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { one, weekParam } from "@/lib/params";
import { fmtPeriodo } from "@/lib/dates";
import { buildEmail, emailMode } from "@/lib/email";
import { ErrorBox } from "@/components/ui";
import { confirmarEnvio } from "./actions";

export const dynamic = "force-dynamic";

export default async function Enviar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const week = weekParam(sp);
  const clientId = one(sp.cliente);
  if (!clientId) notFound();
  const sb = await createClient();
  const { data: client } = await sb.from("clients").select("id,name").eq("id", clientId).maybeSingle();
  if (!client) notFound();
  const { data: emails } = await sb.from("client_emails").select("email,name").eq("client_id", clientId).order("email");
  const { mode, reason } = emailMode();
  const mail = buildEmail(client.name as string, week, "https://…/r/(link gerado no envio)");
  const erro = one(sp.erro);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/relatorio?cliente=${clientId}&semana=${week}`} className="text-sm text-accent underline">← Voltar ao relatório</Link>
      <h1 className="page-title">Enviar relatório — {client.name as string}</h1>
      <p className="text-slate-600">Semana {fmtPeriodo(week)}</p>
      <ErrorBox text={erro === "confirmar" ? "Marque a confirmação para enviar." : erro === "destinatario" ? "Selecione ao menos um destinatário cadastrado." : undefined} />

      {mode === "test" ? (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm"><b>Modo teste:</b> nenhum e-mail real será enviado (apenas registro no log). Motivo: {reason}. Para enviar de verdade, configure <code>EMAIL_MODE=live</code>, <code>RESEND_API_KEY</code> e <code>EMAIL_FROM</code>.</div>
      ) : (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm"><b>Envio REAL ativado:</b> o e-mail será entregue aos destinatários selecionados.</div>
      )}

      <div className="card space-y-2">
        <div className="label">Assunto</div>
        <p className="font-semibold">{mail.subject}</p>
        <div className="label pt-2">Mensagem (pré-visualização)</div>
        <iframe title="Pré-visualização do e-mail" srcDoc={mail.html} sandbox="" className="h-[420px] w-full rounded-lg border border-line bg-white" />
        <p className="text-sm text-slate-600">Anexo: <b>relatorio-{week}.png</b> (1080×1920). O link para o celular é gerado no envio.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/relatorio/${clientId}/${week}`} alt="Anexo" width={1080} height={1920} className="w-48 rounded-lg border border-line" />
      </div>

      <form action={confirmarEnvio} className="card space-y-3">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="week" value={week} />
        <div className="label">Destinatários</div>
        {(emails ?? []).length === 0 && <p className="text-sm text-red-600">Nenhum e-mail cadastrado para este cliente. Cadastre em <Link href="/cadastros" className="underline">Cadastros</Link>.</p>}
        {(emails ?? []).map((e) => (
          <label key={e.email as string} className="flex items-center gap-2 text-sm"><input type="checkbox" name="to" value={e.email as string} defaultChecked className="h-4 w-4" /> {e.name ? `${e.name} · ` : ""}{e.email as string}</label>
        ))}
        <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-medium"><input type="checkbox" name="confirmo" className="h-4 w-4" /> Conferi a pré-visualização e confirmo o envio.</label>
        <button className="btn btn-accent" disabled={(emails ?? []).length === 0}>{mode === "live" ? "Enviar relatório agora" : "Simular envio (modo teste)"}</button>
      </form>
    </div>
  );
}
