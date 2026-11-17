import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { fmtPeriodo } from "./dates";
import { ensureToken, loadReport, publicLink } from "./report-data";
import { renderReportPng } from "./report-image";

export type EmailMode = "live" | "test";
/** Só envia de verdade com EMAIL_MODE=live + RESEND_API_KEY + EMAIL_FROM. Caso contrário: modo teste (apenas log). */
export function emailMode(): { mode: EmailMode; reason?: string } {
  if (process.env.EMAIL_MODE !== "live") return { mode: "test", reason: "EMAIL_MODE não é “live”" };
  if (!process.env.RESEND_API_KEY) return { mode: "test", reason: "RESEND_API_KEY ausente" };
  if (!process.env.EMAIL_FROM) return { mode: "test", reason: "EMAIL_FROM ausente" };
  return { mode: "live" };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildEmail(clientName: string, week: string, link: string) {
  const periodo = fmtPeriodo(week);
  const subject = `Relatório semanal de redes sociais — ${clientName} (${periodo})`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#eef1f6;font-family:Arial,Helvetica,sans-serif;color:#1b2437">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1f2a44;padding:24px 28px"><div style="color:#e8590c;font-size:12px;font-weight:bold;letter-spacing:2px">RELATÓRIO SEMANAL</div>
<div style="color:#fff;font-size:24px;font-weight:bold;margin-top:6px">${esc(clientName)}</div>
<div style="color:#c9d3ea;font-size:15px;margin-top:4px">Semana de ${esc(periodo)}</div></td></tr>
<tr><td style="padding:24px 28px;font-size:16px;line-height:1.5">
<p style="margin:0 0 14px">Olá! Segue o relatório de redes sociais da semana de <b>${esc(periodo)}</b>.</p>
<p style="margin:0 0 20px">A imagem em formato Stories vai em anexo. Para ver direto no celular, use o botão abaixo:</p>
<p style="margin:0 0 24px"><a href="${esc(link)}" style="background:#e8590c;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:10px;display:inline-block">Ver relatório no celular</a></p>
<p style="margin:0;color:#64708a;font-size:13px">Qualquer dúvida é só responder este e-mail.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `Olá! Segue o relatório de redes sociais de ${clientName} — semana de ${periodo}.\nVer no celular: ${link}\nA imagem em formato Stories está em anexo.`;
  return { subject, html, text };
}

export type SendResult = { recipient: string; status: "enviado" | "teste" | "erro"; detail?: string };

/** Envia (ou simula) o relatório do cliente/semana a cada destinatário e registra em email_log. */
export async function sendReport(sb: SupabaseClient, opts: { clientId: string; week: string; recipients: string[]; trigger: "manual" | "cron" }): Promise<SendResult[]> {
  const report = await loadReport(sb, opts.clientId, opts.week);
  if (!report) throw new Error("Cliente não encontrado");
  const token = await ensureToken(sb, opts.clientId, opts.week);
  const link = publicLink(token);
  const { subject, html, text } = buildEmail(report.client.name, opts.week, link);
  const { mode, reason } = emailMode();
  const png = mode === "live" ? await renderReportPng(report) : null;
  const resend = mode === "live" ? new Resend(process.env.RESEND_API_KEY) : null;
  const results: SendResult[] = [];
  for (const recipient of opts.recipients) {
    let r: SendResult;
    if (mode === "test") {
      console.log(`[email:teste] (${reason}) para=${recipient} assunto="${subject}" link=${link}`);
      r = { recipient, status: "teste", detail: `modo teste: nada foi enviado (${reason})` };
    } else {
      try {
        const { data, error } = await resend!.emails.send({
          from: process.env.EMAIL_FROM!, to: [recipient], subject, html, text,
          ...(process.env.EMAIL_REPLY_TO ? { replyTo: process.env.EMAIL_REPLY_TO } : {}),
          attachments: [{ filename: `relatorio-${opts.week}.png`, content: png! }],
        });
        r = error ? { recipient, status: "erro", detail: error.message } : { recipient, status: "enviado", detail: data?.id };
      } catch (e) {
        r = { recipient, status: "erro", detail: e instanceof Error ? e.message : String(e) };
      }
    }
    results.push(r);
    await sb.from("email_log").insert({
      client_id: opts.clientId, week_start: opts.week, recipient, status: r.status,
      detail: r.status === "enviado" ? null : r.detail ?? null, provider_id: r.status === "enviado" ? r.detail ?? null : null, trigger: opts.trigger,
    });
  }
  return results;
}
