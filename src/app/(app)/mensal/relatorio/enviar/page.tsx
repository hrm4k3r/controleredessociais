import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/params";
import { buildMonthlyEmail, emailMode, monthlyEmailData } from "@/lib/email";
import { fmtMes, isMonthISO } from "@/lib/monthly";
import { fmtColeta } from "@/lib/dates";
import { ErrorBox } from "@/components/ui";
import { confirmarEnvioMensal } from "./actions";

export const dynamic = "force-dynamic";

export default async function EnviarMensal({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const clientId = one(sp.cliente);
  const month = one(sp.mes);
  if (!clientId || !isMonthISO(month)) notFound();
  const sb = await createClient();
  const { data: client } = await sb.from("clients").select("id,name").eq("id", clientId).maybeSingle();
  if (!client) notFound();
  const { data: emails } = await sb.from("client_emails").select("email,name").eq("client_id", clientId).order("email");
  const { data: log } = await sb.from("email_log").select("recipient,status,sent_at,detail").eq("client_id", clientId).eq("week_start", month).like("detail", "[mensal]%").order("sent_at", { ascending: false }).limit(10);
  const { mode, reason } = emailMode();
  const info = await monthlyEmailData(sb, clientId, month).catch(() => null);
  const mail = buildMonthlyEmail(client.name as string, month, "https://…/m/(link fixo do cliente)", info?.pages ?? 1, info?.collectedAt);
  const erro = one(sp.erro);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/mensal/relatorio?mes=${month}`} className="text-sm text-accent underline">← Voltar ao relatório mensal</Link>
      <h1 className="page-title">Enviar relatório mensal — {client.name as string}</h1>
      <p className="capitalize text-slate-600">{fmtMes(month)}</p>
      <ErrorBox text={erro === "confirmar" ? "Marque a confirmação para enviar." : erro === "destinatario" ? "Selecione ao menos um destinatário cadastrado." : undefined} />
      {mode === "test" ? (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm"><b>Modo teste:</b> nenhum e-mail real será enviado (apenas registro no log). Motivo: {reason}.</div>
      ) : (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm"><b>Envio REAL ativado:</b> o e-mail será entregue aos destinatários selecionados.</div>
      )}
      <div className="card space-y-2">
        <div className="label">Assunto</div>
        <p className="font-semibold">{mail.subject}</p>
        <div className="label pt-2">Mensagem (pré-visualização)</div>
        <iframe title="Pré-visualização do e-mail" srcDoc={mail.html} sandbox="" className="h-[420px] w-full rounded-lg border border-line bg-surface" />
        <p className="text-sm text-slate-600">Anexos: <b>{info?.pages ?? "?"} imagem(ns) PNG</b> do relatório (uma por página).</p>
      </div>
      <form action={confirmarEnvioMensal} className="card space-y-3">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="month" value={month} />
        <div className="label">Destinatários</div>
        {(emails ?? []).length === 0 && <p className="text-sm text-red-600">Nenhum e-mail cadastrado para este cliente. Cadastre em <Link href="/cadastros" className="underline">Cadastros</Link>.</p>}
        {(emails ?? []).map((e) => (
          <label key={e.email as string} className="flex items-center gap-2 text-sm"><input type="checkbox" name="to" value={e.email as string} defaultChecked className="h-4 w-4" /> {e.name ? `${e.name} · ` : ""}{e.email as string}</label>
        ))}
        <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-medium"><input type="checkbox" name="confirmo" className="h-4 w-4" /> Conferi a pré-visualização e o relatório, e confirmo o envio.</label>
        <SubmitButton className="btn btn-accent" disabled={(emails ?? []).length === 0} pendingText="Enviando…">{mode === "live" ? "Enviar relatório agora" : "Simular envio (modo teste)"}</SubmitButton>
      </form>
      {(log ?? []).length > 0 && (
        <div className="card space-y-1 text-sm">
          <div className="label">Envios deste mês</div>
          {(log ?? []).map((l, i) => <div key={i}>{fmtColeta(l.sent_at as string)} · {l.recipient as string} · <b>{l.status as string}</b></div>)}
        </div>
      )}
    </div>
  );
}
