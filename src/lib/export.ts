import type { SupabaseClient } from "@supabase/supabase-js";
import { loadDataset, fetchAll } from "./data";
import { loadFinance } from "./finance-data";
import { interactionsOfPost, engagementRate } from "./calc";
import { weekStart } from "./dates";

export type Table = { name: string; headers: string[]; rows: (string | number | null)[][] };

/** `finance=false` (colaborador): sem a tabela de pagamentos e sem as colunas financeiras de clientes. */
export async function buildTables(sb: SupabaseClient, finance = true): Promise<Record<string, Table>> {
  const ds = await loadDataset(sb);
  const fin = finance ? await loadFinance(sb) : { clients: [], payments: [] };
  const cname = new Map(ds.clients.map((c) => [c.id, c.name]));
  const post = new Map(ds.posts.map((p) => [p.id, p]));
  const emails = await fetchAll<{ client_id: string; email: string }>((a, b) => sb.from("client_emails").select("client_id,email").range(a, b));
  const log = await fetchAll<{ client_id: string; week_start: string; recipient: string; status: string; detail: string | null; sent_at: string; trigger: string }>((a, b) => sb.from("email_log").select("client_id,week_start,recipient,status,detail,sent_at,trigger").order("sent_at").range(a, b));

  const t: Record<string, Table> = {};
  t.clientes = {
    name: "Clientes",
    headers: ["Cliente", "Conta própria", "Meta posts/semana", "Redes", "E-mails", ...(finance ? ["Valor mensal (R$)", "Dia vencimento"] : [])],
    rows: ds.clients.map((c) => {
      const f = fin.clients.find((x) => x.id === c.id);
      return [c.name, c.is_internal ? "sim" : "não", c.weekly_goal, ds.accounts.filter((a) => a.client_id === c.id).map((a) => a.network).join(", "),
        emails.filter((e) => e.client_id === c.id).map((e) => e.email).join(", "), ...(finance ? [f ? f.monthly_amount : null, f ? f.due_day : null] : [])];
    }),
  };
  t.postagens = {
    name: "Postagens",
    headers: ["Data", "Semana (segunda)", "Cliente", "Status", "Formato", "Tema", "Redes", "Resumo", "Link", "Observações"],
    rows: ds.posts.map((p) => [p.post_date, weekStart(p.post_date), cname.get(p.client_id) ?? "", p.status, p.format, p.theme,
      ds.postNetworks.filter((n) => n.post_id === p.id).map((n) => n.network).join(", "), p.summary, p.link, p.notes]),
  };
  t.resultados = {
    name: "Resultados dos posts",
    headers: ["Data do post", "Cliente", "Rede", "Resumo", "Visualizações", "Alcance", "Curtidas", "Comentários", "Compartilhamentos", "Salvamentos", "Cliques", "Interações", "Taxa de engajamento"],
    rows: ds.results.map((r) => {
      const p = post.get(r.post_id);
      const inter = interactionsOfPost(r);
      const rate = engagementRate(inter, r.reach);
      return [p?.post_date ?? "", p ? cname.get(p.client_id) ?? "" : "", r.network, p?.summary ?? "", r.views, r.reach, r.likes, r.comments, r.shares, r.saves, r.clicks, inter, rate == null ? null : Math.round(rate * 10000) / 10000];
    }),
  };
  t.metricas = {
    name: "Métricas semanais",
    headers: ["Semana (segunda)", "Cliente", "Rede", "Seguidores", "Visualizações", "Alcance", "Interações", "Cliques/visitas", "Aprendizado / ação"],
    rows: ds.metrics.map((m) => [m.week_start, cname.get(m.client_id) ?? "", m.network, m.followers, m.views, m.reach, m.interactions, m.clicks, m.learning]),
  };
  if (finance) t.pagamentos = {
    name: "Pagamentos",
    headers: ["Mês de referência", "Cliente", "Valor devido (R$)", "Data do pagamento", "Valor pago (R$)", "Observações"],
    rows: fin.payments.map((p) => [p.ref_month, cname.get(p.client_id) ?? "", p.amount_due, p.paid_date, p.paid_amount, p.notes]),
  };
  t.envios = {
    name: "Envios de e-mail",
    headers: ["Quando", "Cliente", "Semana", "Destinatário", "Status", "Detalhe", "Origem"],
    rows: log.map((l) => [l.sent_at, cname.get(l.client_id) ?? "", l.week_start, l.recipient, l.status, l.detail, l.trigger]),
  };
  return t;
}

const esc = (v: string | number | null) => {
  if (v == null) return "";
  const s = String(v).replace(/\r?\n/g, " ");
  // evita injeção de fórmula ao abrir no Excel
  const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s.replace(",", "."))) ? `'${s}` : s;
  return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV para Excel pt-BR: UTF-8 com BOM, separador ";". */
export function toCsv(t: Table): string {
  const num = (v: string | number | null) => (typeof v === "number" ? String(v).replace(".", ",") : v);
  return "﻿" + [t.headers, ...t.rows.map((r) => r.map(num))].map((r) => r.map(esc).join(";")).join("\r\n") + "\r\n";
}
