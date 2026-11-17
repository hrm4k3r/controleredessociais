import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadDataset, loadLists } from "@/lib/data";
import { diaSemana, fmtDiaMes, todayISO, weekEnd } from "@/lib/dates";
import { one, ok as okParam, weekParam } from "@/lib/params";
import { Flash, WeekBar } from "@/components/ui";
import PostForm from "@/components/PostForm";
import { savePost } from "./actions";

const STATUS_CLS: Record<string, string> = {
  Postado: "bg-green-100 text-green-800", "Não postado": "bg-red-100 text-red-800",
  Agendado: "bg-yellow-100 text-yellow-800", Planejado: "bg-blue-100 text-blue-800",
};

export default async function Postagens({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const week = weekParam(sp);
  const clientFilter = one(sp.cliente) ?? "";
  const sb = await createClient();
  const [ds, lists] = await Promise.all([loadDataset(sb), loadLists(sb)]);
  const nameOf = new Map(ds.clients.map((c) => [c.id, c.name]));
  const accountsByClient: Record<string, string[]> = {};
  for (const a of ds.accounts) (accountsByClient[a.client_id] ??= []).push(a.network);
  const end = weekEnd(week);
  const posts = ds.posts
    .filter((p) => p.post_date >= week && p.post_date <= end && (!clientFilter || p.client_id === clientFilter))
    .sort((a, b) => a.post_date.localeCompare(b.post_date));
  const netsOf = (id: string) => ds.postNetworks.filter((n) => n.post_id === id).map((n) => n.network);
  const today = todayISO();

  return (
    <div className="space-y-5">
      <h1 className="page-title">Postagens</h1>
      <Flash ok={okParam(sp)} />
      <details className="card" open={posts.length === 0}>
        <summary className="cursor-pointer font-semibold text-navy">+ Novo post</summary>
        <div className="mt-4">
          <PostForm action={savePost} clients={ds.clients} accountsByClient={accountsByClient} formats={lists.formats} themes={lists.themes} today={today >= week && today <= end ? today : week} defaultClientId={clientFilter || undefined} />
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <WeekBar path="/postagens" week={week} extra={{ cliente: clientFilter }} />
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="semana" value={week} />
          <select name="cliente" defaultValue={clientFilter} className="input !w-auto">
            <option value="">Todos os clientes</option>
            {ds.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-ghost">Filtrar</button>
        </form>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[820px]">
          <thead><tr>{["Data", "Cliente", "Status", "Formato", "Tema", "Redes", "Resumo", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {posts.length === 0 && <tr><td className="td text-slate-500" colSpan={8}>Nenhum post nesta semana{clientFilter ? " para este cliente" : ""}.</td></tr>}
            {posts.map((p) => (
              <tr key={p.id} className="hover:bg-orange-50/40">
                <td className="td whitespace-nowrap">{diaSemana(p.post_date)} {fmtDiaMes(p.post_date)}</td>
                <td className="td font-medium">{nameOf.get(p.client_id)}</td>
                <td className="td"><span className={`badge ${STATUS_CLS[p.status] ?? ""}`}>{p.status}</span></td>
                <td className="td">{p.format ?? "—"}</td>
                <td className="td">{p.theme ?? "—"}</td>
                <td className="td">{netsOf(p.id).join(", ") || <span className="text-red-600">nenhuma</span>}</td>
                <td className="td max-w-xs truncate" title={p.summary ?? ""}>{p.summary}</td>
                <td className="td whitespace-nowrap">
                  {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="mr-3 text-accent underline">link</a>}
                  <Link href={`/postagens/${p.id}`} className="font-semibold text-navy underline">editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Posts fora desta semana aparecem navegando pelas setas. Semana: segunda a domingo (America/Sao_Paulo).</p>
    </div>
  );
}
export const dynamic = "force-dynamic";
