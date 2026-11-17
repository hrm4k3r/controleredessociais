import { signIn } from "./actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center p-6">
      <form action={signIn} className="card w-full space-y-4">
        <div>
          <h1 className="page-title">Controle de Redes Sociais</h1>
          <p className="text-sm text-slate-500">Acesso restrito</p>
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
        <button className="btn w-full">Entrar</button>
      </form>
    </main>
  );
}
