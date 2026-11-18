import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { evolutionByToken } from "@/lib/public-evolution";
import { fmtData } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Evolução das redes", robots: { index: false, follow: false } };

// Página pública (somente leitura) do antes × depois de um cliente, acessada por link com token.
export default async function EvolucaoPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const evo = await evolutionByToken(token);
  if (!evo) notFound();
  const name = evo.data.client.name;
  return (
    <main className="min-h-screen bg-[#1f2a44] px-3 py-5 text-white">
      <div className="mx-auto max-w-[480px] space-y-4">
        <div className="text-center">
          <p className="text-sm text-slate-300">{name}</p>
          <h1 className="text-lg font-bold">Evolução desde {fmtData(evo.data.since)}</h1>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/e/${token}/image`} alt={`Evolução das redes de ${name}`} width={1080} height={1920} className="h-auto w-full rounded-2xl shadow-2xl" />
        <a href={`/e/${token}/image?baixar=1`} download className="block rounded-xl bg-accent py-3 text-center font-semibold">Baixar imagem</a>
      </div>
    </main>
  );
}
