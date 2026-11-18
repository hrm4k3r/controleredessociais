import Logo from "@/components/Logo";
import SubmitButton from "@/components/SubmitButton";
import { signIn } from "./actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#131a2e] to-[#2b3a5e] p-6">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-white"><Logo size={40} textClass="text-2xl" /></div>
      <form action={signIn} className="card w-full space-y-4 !p-6 shadow-2xl">
        <div>
          <h1 className="page-title">Entrar</h1>
          <p className="text-sm text-slate-500">Acesso restrito à equipe</p>
        </div>
        {erro && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">E-mail ou senha incorretos.</p>}
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        <SubmitButton className="btn w-full" pendingText="Entrando…">Entrar</SubmitButton>
      </form>
      </div>
    </main>
  );
}
