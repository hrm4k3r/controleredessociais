"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidISO } from "@/lib/dates";
import { sendReport } from "@/lib/email";

export async function confirmarEnvio(fd: FormData) {
  const sb = await createClient();
  const clientId = String(fd.get("client_id"));
  const week = String(fd.get("week"));
  const back = `/relatorio/enviar?cliente=${clientId}&semana=${week}`;
  if (fd.get("confirmo") !== "on") redirect(`${back}&erro=confirmar`);
  if (!isValidISO(week)) redirect("/relatorio");
  const wanted = new Set(fd.getAll("to").map(String));
  const { data } = await sb.from("client_emails").select("email").eq("client_id", clientId);
  const recipients = (data ?? []).map((e) => e.email as string).filter((e) => wanted.has(e)); // só e-mails cadastrados
  if (recipients.length === 0) redirect(`${back}&erro=destinatario`);
  const res = await sendReport(sb, { clientId, week, recipients, trigger: "manual" });
  const ok = res.filter((r) => r.status === "enviado").length;
  const teste = res.filter((r) => r.status === "teste").length;
  const err = res.filter((r) => r.status === "erro").length;
  redirect(`/relatorio?cliente=${clientId}&semana=${week}&ok=1&env=${ok}-${teste}-${err}`);
}
