import { NextResponse } from "next/server";
import { evolutionByToken } from "@/lib/public-evolution";
import { renderEvolutionImage } from "@/lib/evolution-image";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const evo = await evolutionByToken(token);
  if (!evo) return new NextResponse("Não encontrado", { status: 404 });
  const res = renderEvolutionImage(evo.data, evo.asOf);
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  if (new URL(req.url).searchParams.get("baixar")) headers.set("Content-Disposition", `attachment; filename="evolucao-${evo.data.client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png"`);
  return new NextResponse(res.body, { headers });
}
