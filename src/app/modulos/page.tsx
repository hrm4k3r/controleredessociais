import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { moduleById } from "@/lib/modules";
import { signOut } from "@/app/login/actions";

export const dynamic = "force-dynamic";

/** Escolha da gestão logo após o login. Com uma só gestão liberada, entra direto. */
export default async function Modulos() {
  const sb = await createClient();
  const access = await getAccess(sb);
  if (!access) redirect("/login");
  if (access.modules.length === 1) redirect(moduleById(access.modules[0]).href);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#131a2e] to-[#2b3a5e] p-6">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-extrabold text-white">Qual gestão você quer abrir?</h1>
        <p className="mb-5 text-sm text-white/70">Você pode trocar de gestão a qualquer momento pelo menu.</p>
        {access.modules.length === 0 ? (
          <div className="card space-y-2">
            <p className="font-semibold text-navy">Seu usuário ainda não tem nenhuma gestão liberada.</p>
            <p className="text-sm text-slate-600">Peça a um administrador para liberar o seu acesso.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {access.modules.map((id) => {
              const m = moduleById(id);
              return (
                <Link key={id} href={m.href} className="card block space-y-2 !p-5 transition hover:border-accent hover:shadow-lg">
                  <div className="text-3xl" aria-hidden>{m.icon}</div>
                  <div className="text-lg font-bold text-navy">{m.name}</div>
                  <p className="text-sm text-slate-600">{m.description}</p>
                </Link>
              );
            })}
          </div>
        )}
        <form action={signOut} className="mt-5"><button className="text-sm text-white/70 underline hover:text-white">Sair</button></form>
      </div>
    </main>
  );
}
