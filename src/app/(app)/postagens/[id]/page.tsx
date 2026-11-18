import SubmitButton from "@/components/SubmitButton";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadDataset, loadLists } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import PostForm from "@/components/PostForm";
import Author from "@/components/Author";
import { loadMemberNames } from "@/lib/members";
import { deletePost, savePost } from "../actions";

export default async function EditarPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const [ds, lists] = await Promise.all([loadDataset(sb), loadLists(sb)]);
  const post = ds.posts.find((p) => p.id === id);
  if (!post) notFound();
  const accountsByClient: Record<string, string[]> = {};
  for (const a of ds.accounts) (accountsByClient[a.client_id] ??= []).push(a.network);
  const { data: au } = await sb.from("posts").select("created_by,updated_by").eq("id", id).maybeSingle();
  const names = await loadMemberNames(sb);
  const who = (id?: string | null) => (id ? names[id] ?? "Usuário" : null);
  const networks = ds.postNetworks.filter((n) => n.post_id === id).map((n) => n.network);
  return (
    <div className="space-y-5">
      <Link href="/postagens" className="text-sm text-accent underline">← Voltar às postagens</Link>
      <h1 className="page-title">Editar post</h1>
      {(au?.created_by || au?.updated_by) && (
        <div className="-mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {au?.created_by && <span className="inline-flex items-center gap-1">Criado por <Author name={who(au.created_by as string)} /></span>}
          {au?.updated_by && <span className="inline-flex items-center gap-1">Última edição por <Author name={who(au.updated_by as string)} /></span>}
        </div>
      )}
      <div className="card">
        <PostForm action={savePost} clients={ds.clients} accountsByClient={accountsByClient} formats={lists.formats} themes={lists.themes} today={todayISO()} initial={{ ...post, networks }} submitLabel="Salvar alterações" />
      </div>
      <form action={deletePost} className="card flex items-center justify-between">
        <input type="hidden" name="id" value={id} />
        <span className="text-sm text-slate-600">Excluir este post apaga também os resultados lançados nele.</span>
        <SubmitButton className="btn btn-danger" pendingText="Excluindo…">Excluir post</SubmitButton>
      </form>
    </div>
  );
}
export const dynamic = "force-dynamic";
