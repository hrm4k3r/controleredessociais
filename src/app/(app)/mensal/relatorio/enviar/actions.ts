"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import { sendMonthly } from "@/lib/email";
import { isMonthISO } from "@/lib/monthly";

export async function confirmarEnvioMensal(fd: FormData) {
  const sb = await createClient();
  await requireModule(sb, "social");
  const clientId = String(fd.get("client_id"));
  const month = String(fd.get("month"));
  if (!isMonthISO(month)) redirect("/mensal/relatorio");
  const back = `/mensal/relatorio/enviar?cliente=${clientId}&mes=${month}`;
  if (fd.get("confirmo") !== "on") redirect(`${back}&erro=confirmar`);
  const wanted = new Set(fd.getAll("to").map(String));
  const { data } = await sb.from("client_emails").select("email").eq("client_id", clientId);
  const recipients = (data ?? []).map((e) => e.email as string).filter((e) => wanted.has(e)); // só e-mails cadastrados
  if (recipients.length === 0) redirect(`${back}&erro=destinatario`);
  const res = await sendMonthly(sb, { clientId, month, recipients });
  const n = (s: string) => res.filter((r) => r.status === s).length;
  redirect(`/mensal/relatorio?mes=${month}&env=${n("enviado")}-${n("teste")}-${n("erro")}`);
}
