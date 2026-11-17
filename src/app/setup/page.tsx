import { hasSupabaseEnv } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export default function Setup() {
  if (hasSupabaseEnv()) redirect("/");
  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="card space-y-3">
        <h1 className="page-title">Falta configurar o Supabase</h1>
        <p>Copie <code>.env.example</code> para <code>.env.local</code>, preencha <b>NEXT_PUBLIC_SUPABASE_URL</b> e <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> (Supabase → Project Settings → API) e reinicie o <code>npm run dev</code>.</p>
        <p className="text-sm text-slate-500">Passo a passo completo no README.</p>
      </div>
    </main>
  );
}
