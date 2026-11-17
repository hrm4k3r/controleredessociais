import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadDataset } from "@/lib/data";
import { weekParam } from "@/lib/params";
import { clientWeek, type ClientWeek } from "@/lib/aggregate";
import { engagementRate, goalLevel, goalPct, hasAny, sum, variation } from "@/lib/calc";
import { addDays } from "@/lib/dates";
import { WeekBar, delta, deltaColor, deltaInt, int, levelClass, pct } from "@/components/ui";

export const dynamic = "force-dynamic";

function Bars({ title, items, fmt, colorFn }: { title: string; items: { label: string; value: number; marker?: number }[]; fmt: (n: number) => string; colorFn?: (i: number) => string }) {
  const max = Math.max(1, ...items.map((i) => Math.max(i.value, i.marker ?? 0)));
  return (
    <div className="card">
      <h3 className="mb-3 font-bold text-navy">{title}</h3>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={it.label} className="text-sm">
            <div className="mb-0.5 flex justify-between"><span className="truncate pr-2">{it.label}</span><span className="font-semibold tabular-nums">{fmt(it.value)}{it.marker != null && <span className="font-normal text-slate-500"> / {fmt(it.marker)}</span>}</span></div>
            <div className="relative h-3 rounded bg-slate-100">
              <div className={`h-3 rounded ${colorFn ? colorFn(i) : "bg-navy"}`} style={{ width: `${(it.value / max) * 100}%` }} />
              {it.marker != null && <div className="absolute top-[-2px] h-4 w-0.5 bg-accent" style={{ left: `${(it.marker / max) * 100}%` }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function Painel({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const week = weekParam(sp);
  const sb = await createClient();
  const ds = await loadDataset(sb);
  const rows: ClientWeek[] = ds.clients.map((c) => clientWeek(ds, c, week));
  const num = (f: (r: ClientWeek) => number | null) => rows.map(f);
  const totGoal = sum(rows.map((r) => r.goal));
  const totDone = sum(rows.map((r) => r.done));
  const totViews = hasAny(num((r) => r.views)) ? sum(num((r) => r.views)) : null;
  const prevViewsArr = ds.metrics.filter((m) => m.week_start === addDays(week, -7)).map((m) => m.views);
  const totReach = hasAny(num((r) => r.reach)) ? sum(num((r) => r.reach)) : null;
  const totInter = hasAny(num((r) => r.interactions)) ? sum(num((r) => r.interactions)) : null;
  const best = (f: (r: ClientWeek) => number | null) => {
    const c = rows.filter((r) => (f(r) ?? 0) > 0).sort((a, b) => f(b)! - f(a)!)[0];
    return c ? c.client.name : "— sem dados —";
  };
  const below = rows.filter((r) => r.pct != null && r.pct < 0.7);
  const faltam = Math.max(0, totGoal - totDone);
  const levelBg = { green: "bg-green-500", yellow: "bg-yellow-400", red: "bg-red-500", none: "bg-slate-300" };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Painel</h1>
        <WeekBar path="/" week={week} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><div className="label">Faltam para bater a meta de todos</div><div className="text-3xl font-bold text-accent">{faltam} <span className="text-base font-medium text-slate-500">posts</span></div><div className="text-xs text-slate-500">{totDone} de {totGoal} feitos ({pct(goalPct(totDone, totGoal))})</div></div>
        <div className="card"><div className="label">Visualizações (total)</div><div className="text-3xl font-bold text-navy">{int(totViews)}</div><div className={`text-xs font-semibold ${deltaColor(hasAny(prevViewsArr) ? variation(totViews, sum(prevViewsArr)) : null)}`}>{hasAny(prevViewsArr) ? `${delta(variation(totViews, sum(prevViewsArr)))} vs semana anterior` : "sem semana anterior"}</div></div>
        <div className="card"><div className="label">Alcance (total)</div><div className="text-3xl font-bold text-navy">{int(totReach)}</div></div>
        <div className="card"><div className="label">Engajamento geral</div><div className="text-3xl font-bold text-navy">{pct(engagementRate(totInter, totReach), 1)}</div><div className="text-xs text-slate-500">{int(totInter)} interações</div></div>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[900px]">
          <thead><tr>{["Cliente", "Meta", "Feitos", "% da meta", "Seguidores", "Novos seg.", "Visualizações", "Δ visualiz.", "Alcance", "Interações", "Engaj."].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.client.id}>
                <td className={`td font-semibold ${r.client.is_internal ? "text-accent" : "text-navy"}`}>{r.client.name}</td>
                <td className="td num">{r.goal}</td>
                <td className="td num">{r.done}</td>
                <td className="td"><span className={`badge ${levelClass(goalLevel(r.pct))}`}>{pct(r.pct)}</span></td>
                <td className="td num">{int(r.followers)}</td>
                <td className={`td num font-semibold ${deltaColor(r.newFollowers)}`}>{deltaInt(r.newFollowers)}</td>
                <td className="td num">{int(r.views)}</td>
                <td className={`td num font-semibold ${deltaColor(r.viewsVar)}`}>{delta(r.viewsVar)}</td>
                <td className="td num">{int(r.reach)}</td>
                <td className="td num">{int(r.interactions)}</td>
                <td className="td num">{pct(r.engagement, 1)}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold">
              <td className="td">TOTAL</td><td className="td num">{totGoal}</td><td className="td num">{totDone}</td>
              <td className="td"><span className={`badge ${levelClass(goalLevel(goalPct(totDone, totGoal)))}`}>{pct(goalPct(totDone, totGoal))}</span></td>
              <td className="td num">{int(hasAny(num((r) => r.followers)) ? sum(num((r) => r.followers)) : null)}</td>
              <td className="td num">{deltaInt(hasAny(num((r) => r.newFollowers)) ? sum(num((r) => r.newFollowers)) : null)}</td>
              <td className="td num">{int(totViews)}</td>
              <td className={`td num ${deltaColor(hasAny(prevViewsArr) ? variation(totViews, sum(prevViewsArr)) : null)}`}>{hasAny(prevViewsArr) ? delta(variation(totViews, sum(prevViewsArr))) : "—"}</td>
              <td className="td num">{int(totReach)}</td><td className="td num">{int(totInter)}</td><td className="td num">{pct(engagementRate(totInter, totReach), 1)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card space-y-1 text-sm">
          <h3 className="mb-2 font-bold text-navy">Destaques da semana</h3>
          <p><b>Mais visualizações:</b> {best((r) => r.views)}</p>
          <p><b>Mais alcance:</b> {best((r) => r.reach)}</p>
          <p><b>Mais seguidores novos:</b> {best((r) => r.newFollowers)}</p>
          <p><b>Abaixo de 70% da meta:</b> {below.length === 0 ? "nenhum cliente" : below.map((r) => r.client.name).join(", ")}</p>
          <p className="pt-2 text-xs text-slate-500">Verde ≥100% · amarelo 70–99% · vermelho &lt;70% da meta de posts.</p>
        </div>
        <Bars title="Meta x posts feitos (barra = feitos, marca laranja = meta)" items={rows.map((r) => ({ label: r.client.name, value: r.done, marker: r.goal }))} fmt={(n) => String(n)} colorFn={(i) => levelBg[rows[i].level]} />
        <Bars title="Visualizações por cliente" items={rows.map((r) => ({ label: r.client.name, value: r.views ?? 0 }))} fmt={(n) => n.toLocaleString("pt-BR")} />
        <Bars title="Engajamento por cliente" items={rows.map((r) => ({ label: r.client.name, value: (r.engagement ?? 0) * 100 }))} fmt={(n) => `${n.toFixed(1).replace(".", ",")}%`} />
      </div>
      <p className="text-xs text-slate-500">Dados lançados em <Link href={`/postagens?semana=${week}`} className="underline">Postagens</Link> e <Link href={`/metricas?semana=${week}`} className="underline">Métricas</Link>.</p>
    </div>
  );
}
