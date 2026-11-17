import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lastClosedWeekStart } from "@/lib/dates";
import { sendReport } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron semanal (vercel.json: segunda 10:00 UTC = 07:00 em São Paulo). DESLIGADO por padrão:
 * só roda com WEEKLY_EMAIL_CRON_ENABLED=true e Authorization: Bearer CRON_SECRET.
 * Envia o relatório da semana que acabou de fechar a cada cliente com e-mail cadastrado.
 * (Mesmo ligado, sem EMAIL_MODE=live apenas registra no log, em modo teste.)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Não autorizado", { status: 401 });
  if (process.env.WEEKLY_EMAIL_CRON_ENABLED !== "true") return NextResponse.json({ skipped: "cron desligado (WEEKLY_EMAIL_CRON_ENABLED != true)" });

  const sb = createAdminClient();
  const week = lastClosedWeekStart();
  const { data: clients } = await sb.from("clients").select("id,name").eq("active", true).eq("is_internal", false);
  const out: Record<string, unknown>[] = [];
  for (const c of clients ?? []) {
    const { data: emails } = await sb.from("client_emails").select("email").eq("client_id", c.id);
    const all = (emails ?? []).map((e) => e.email as string);
    if (all.length === 0) { out.push({ cliente: c.name, skip: "sem e-mail" }); continue; }
    const { data: already } = await sb.from("email_log").select("recipient").eq("client_id", c.id).eq("week_start", week).eq("status", "enviado");
    const done = new Set((already ?? []).map((a) => a.recipient as string));
    const recipients = all.filter((e) => !done.has(e));
    if (recipients.length === 0) { out.push({ cliente: c.name, skip: "já enviado" }); continue; }
    const { count } = await sb.from("weekly_metrics").select("client_id", { count: "exact", head: true }).eq("client_id", c.id).eq("week_start", week);
    if (!count) { out.push({ cliente: c.name, skip: "sem métricas da semana" }); continue; }
    out.push({ cliente: c.name, envios: await sendReport(sb, { clientId: c.id as string, week, recipients, trigger: "cron" }) });
  }
  return NextResponse.json({ week, resultado: out });
}
