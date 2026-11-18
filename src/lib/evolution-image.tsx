import { ImageResponse } from "next/og";
import { fmtData } from "./dates";
import type { Line } from "./baseline";
import type { EvoClient } from "./evolution";
import { C, NetDot, REPORT_H, REPORT_W, clip, fonts, int, pct } from "./report-image";

const val = (l: Line, v: number | null) => (l.pct ? pct(v) : int(v));
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
const delta = (l: Line) => {
  if (l.delta == null) return null;
  if (l.pct) return `${sign(l.delta)}${Math.abs(l.delta * 100).toFixed(1).replace(".", ",")} p.p.`;
  return `${sign(l.delta)}${Math.abs(l.delta).toLocaleString("pt-BR")}${l.deltaPct != null ? ` (${sign(l.deltaPct)}${Math.abs(Math.round(l.deltaPct * 100))}%)` : ""}`;
};
const color = (n: number | null) => (n == null || n === 0 ? C.muted : n > 0 ? C.green : C.red);
const ORDER: Line["key"][] = ["followers", "engagement", "reach", "interactions", "views", "clicks"];

export function EvolutionImage({ data, asOf }: { data: EvoClient; asOf: string | null }) {
  const lines = ORDER.map((k) => data.lines.find((l) => l.key === k)!).filter((l) => l && l.before != null && l.after != null);
  const head = lines[0];
  const others = lines.slice(1, 5);
  const nets = data.items.filter((i) => i.after.followers != null && i.before.followers != null).slice(0, 6);
  const sub = `Desde ${fmtData(data.since)}${data.weeks > 0 ? ` · ${data.weeks} semana${data.weeks > 1 ? "s" : ""}` : ""}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: REPORT_W, height: REPORT_H, background: C.bg, fontFamily: "Inter", color: C.text }}>
      <div style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #131a2e 0%, #2b3a5e 100%)", padding: "44px 60px 32px", gap: 4 }}>
        <div style={{ position: "absolute", right: -70, top: -90, width: 320, height: 320, borderRadius: 160, background: C.accent, opacity: 0.9 }} />
        <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#ffb27a", letterSpacing: "6px" }}>EVOLUÇÃO</div>
        <div style={{ display: "flex", fontSize: data.client.name.length > 22 ? 60 : 72, fontWeight: 800, color: "#fff", lineHeight: 1.05 }}>{data.client.name}</div>
        <div style={{ display: "flex", fontSize: 34, color: "#c9d3ea", fontWeight: 600 }}>{sub}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "28px 48px 40px", gap: 22 }}>
        {head ? (
          <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 30, padding: "30px 40px", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 27, fontWeight: 800, color: C.accent, letterSpacing: "1.5px", textTransform: "uppercase" }}>{head.key === "followers" ? "Seguidores ganhos" : head.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <div style={{ display: "flex", fontSize: 120, fontWeight: 800, color: color(head.delta), lineHeight: 1 }}>{head.pct ? delta(head) : `${sign(head.delta ?? 0)}${Math.abs(head.delta ?? 0).toLocaleString("pt-BR")}`}</div>
              {head.deltaPct != null && <div style={{ display: "flex", fontSize: 52, fontWeight: 800, color: color(head.deltaPct) }}>{`${sign(head.deltaPct)}${Math.abs(Math.round(head.deltaPct * 100))}%`}</div>}
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: C.muted }}>{`de ${val(head, head.before)} para ${val(head, head.after)}`}</div>
          </div>
        ) : (
          <div style={{ display: "flex", background: C.card, borderRadius: 30, padding: "40px", fontSize: 32, fontWeight: 600, color: C.muted }}>Os primeiros números depois do marco inicial aparecem aqui.</div>
        )}

        {others.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            {others.map((l) => (
              <div key={l.key} style={{ display: "flex", flexDirection: "column", width: 483, background: C.card, borderRadius: 28, padding: "28px 34px", gap: 4 }}>
                <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: C.muted }}>{clip(l.label.replace(" (7 dias)", ""), 24)}</div>
                <div style={{ display: "flex", fontSize: 66, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{val(l, l.after)}</div>
                <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: C.muted }}>{`antes: ${val(l, l.before)}`}</div>
                <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: color(l.delta) }}>{delta(l) ?? " "}</div>
              </div>
            ))}
          </div>
        )}

        {nets.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", fontSize: 27, fontWeight: 800, color: C.accent, letterSpacing: "1.5px", textTransform: "uppercase" }}>Seguidores por rede</div>
            {nets.map((n) => {
              const d = (n.after.followers ?? 0) - (n.before.followers ?? 0);
              return (
                <div key={n.network} style={{ display: "flex", alignItems: "center", background: C.card, borderRadius: 24, padding: "20px 28px", gap: 22 }}>
                  <NetDot network={n.network} size={60} />
                  <div style={{ display: "flex", flexGrow: 1, fontSize: 30, fontWeight: 800 }}>{n.network}</div>
                  <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: C.muted }}>{`${int(n.before.followers)} → ${int(n.after.followers)}`}</div>
                  <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: color(d), width: 150, justifyContent: "flex-end" }}>{`${sign(d)}${Math.abs(d).toLocaleString("pt-BR")}`}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "center", fontSize: 22, fontWeight: 600, color: C.muted }}>{`Rixxer · evolução das suas redes${asOf ? ` · dados até ${fmtData(asOf)}` : ""}`}</div>
    </div>
  );
}

export function renderEvolutionImage(data: EvoClient, asOf: string | null): ImageResponse {
  return new ImageResponse(<EvolutionImage data={data} asOf={asOf} />, { width: REPORT_W, height: REPORT_H, fonts: fonts() });
}
