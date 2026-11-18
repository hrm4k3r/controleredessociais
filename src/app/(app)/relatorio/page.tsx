import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { one, ok as okParam, weekParam } from "@/lib/params";
import { Flash, WeekBar } from "@/components/ui";
import { publicLink } from "@/lib/report-data";
import { createLink, regenerateLink, saveNotes } from "./actions";

export const dynamic = "force-dynamic";

export default async function Relatorio({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const week = weekParam(sp);
  const env = /^\d+-\d+-\d+$/.test(one(sp.env) ?? "") ? one(sp.env)!.split("-") : null;
  const sb = await createClient();
  const { data: clients } = await sb.from("clients").select("id,name,is_internal").eq("active", true).order("sort");
  const list = clients ?? [];
  const clientId = list.some((c) => c.id === one(sp.cliente)) ? one(sp.cliente)! : list[0]?.id;
  if (!clientId) return <p>Cadastre um cliente primeiro.</p>;
  const { data: note } = await sb.from("weekly_notes").select("comment,next_steps,public_token").eq("client_id", clientId).eq("week_start", week).maybeSingle();
  const { data: emails } = await sb.from("client_emails").select("email").eq("client_id", clientId);
  const { data: log } = await sb.from("email_log").select("recipient,status,detail,sent_at,trigger").eq("client_id", clientId).eq("week_start", week).order("sent_at", { ascending: false }).limit(10);
  const img = `/api/relatorio/${clientId}/${week}`;
  const link = note?.public_token ? publicLink(note.public_token) : null;
  const key = `${clientId}-${week}-${note?.comment?.length ?? 0}-${note?.next_steps?.length ?? 0}`;

  return (
    <div className="space-y-5">
      <h1 className="page-title">Relatório do cliente (Stories 1080×1920)</h1>
      <Flash ok={okParam(sp)} text={env ? `Envio concluído: ${env[0]} enviado(s), ${env[1]} em modo teste (nada saiu), ${env[2]} com erro.` : undefined} />
      <div className="flex flex-wrap items-center gap-3">
        <WeekBar path="/relatorio" week={week} extra={{ cliente: clientId }} />
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="semana" value={week} />
          <select name="cliente" defaultValue={clientId} className="input !w-auto">{list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button className="btn btn-ghost">Trocar cliente</button>
        </form>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={key} src={`${img}?v=${key}`} alt="Pré-visualização do relatório" width={1080} height={1920} className="w-full rounded-xl border border-line bg-surface shadow" />
          <a href={`${img}?baixar=1`} className="btn w-full">Baixar PNG</a>
        </div>
        <div className="space-y-4">
          <form action={saveNotes} className="card space-y-3">
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="week" value={week} />
            <h2 className="font-bold text-navy">Texto da semana</h2>
            <div><label className="label">Comentário da semana</label><textarea name="comment" rows={4} maxLength={600} defaultValue={note?.comment ?? ""} className="input !bg-yellow-50" /></div>
            <div><label className="label">Próximos passos</label><textarea name="next_steps" rows={3} maxLength={500} defaultValue={note?.next_steps ?? ""} className="input !bg-yellow-50" /></div>
            <SubmitButton className="btn btn-accent">Salvar e atualizar imagem</SubmitButton>
            <p className="text-xs text-slate-500">Textos longos são resumidos na imagem para caber no formato Stories. Dados vêm de Postagens, Métricas e Resultados.</p>
          </form>

          <div className="card space-y-3">
            <h2 className="font-bold text-navy">Página para o cliente (celular)</h2>
            {link ? (
              <>
                <input readOnly value={link} className="input" />
                <div className="flex flex-wrap gap-2">
                  <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Abrir</a>
                  <form action={regenerateLink}><input type="hidden" name="client_id" value={clientId} /><input type="hidden" name="week" value={week} /><SubmitButton className="btn btn-ghost">Gerar novo link (invalida o atual)</SubmitButton></form>
                </div>
              </>
            ) : (
              <form action={createLink}><input type="hidden" name="client_id" value={clientId} /><input type="hidden" name="week" value={week} /><SubmitButton className="btn">Gerar link público</SubmitButton></form>
            )}
            <p className="text-xs text-slate-500">Link somente leitura com código difícil de adivinhar; mostra só este relatório (sem financeiro nem outros clientes).</p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-bold text-navy">Enviar por e-mail</h2>
            <p className="text-sm">Destinatários: {(emails ?? []).length ? (emails ?? []).map((e) => e.email).join(", ") : <span className="text-red-600">nenhum — cadastre em <Link href="/cadastros" className="underline">Cadastros</Link></span>}</p>
            <Link href={`/relatorio/enviar?cliente=${clientId}&semana=${week}`} className="btn btn-accent">Enviar relatório…</Link>
            {(log ?? []).length > 0 && (
              <table className="w-full text-sm">
                <thead><tr><th className="th">Quando</th><th className="th">Destinatário</th><th className="th">Status</th></tr></thead>
                <tbody>{(log ?? []).map((l, i) => <tr key={i}><td className="td">{new Date(l.sent_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td><td className="td">{l.recipient}</td><td className="td">{l.status}{l.detail ? ` — ${l.detail}` : ""}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
