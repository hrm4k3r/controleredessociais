import { ImageResponse } from "next/og";
import { fmtColeta } from "./dates";
import type { Line } from "./baseline";
import { fmtMes, type MonthlyReport } from "./monthly";
import { C, NetDot, REPORT_H, REPORT_W, clip, fonts, int, pct } from "./report-image";

const val = (l: Line, v: number | null) => (l.pct ? pct(v) : int(v));
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
const color = (n: number | null) => (n == null || n === 0 ? C.muted : n > 0 ? C.green : C.red);
const dTxt = (l: Line) => {
  if (l.delta == null) return " ";
  if (l.pct) return `${sign(l.delta)}${Math.abs(l.delta * 100).toFixed(1).replace(".", ",")} p.p.`;
  return `${sign(l.delta)}${Math.abs(l.delta).toLocaleString("pt-BR")}${l.deltaPct != null ? ` (${sign(l.deltaPct)}${Math.abs(Math.round(l.deltaPct * 100))}%)` : ""}`;
};
const ORDER: Line["key"][] = ["followers", "reach", "interactions", "views", "engagement"];

export function MonthlyImage({ report, collectedAt }: { report: MonthlyReport; collectedAt: string | null }) {
  const lines = ORDER.map((k) => report.lines.find((l) => l.key === k)!).filter((l) => l && l.after != null);
  const head = lines.find((l) => l.key === "followers") ?? lines[0];
  const cards = lines.filter((l) => l !== head).slice(0, 4);
  const nets = report.items.filter((i) => i.has && !i.monthly && i.cur);
  const google = report.items.find((i) => i.monthly && i.has);
  const g = google ? [
    { key: "views", label: "Visualizações", cur: google.cur?.views ?? null, prev: google.prev?.views ?? null },
    { key: "interactions", label: "Interações", cur: google.cur?.interactions ?? null, prev: google.prev?.interactions ?? null },
    ...google.google,
  ].filter((x) => x.cur != null) : [];
  const note = report.note;
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: REPORT_W, height: REPORT_H, background: C.bg, fontFamily: "Inter", color: C.text }}>
      <div style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #131a2e 0%, #2b3a5e 100%)", padding: "44px 60px 32px", gap: 4 }}>
        <div style={{ position: "absolute", right: -70, top: -90, width: 320, height: 320, borderRadius: 160, background: C.accent, opacity: 0.9 }} />
        <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#ffb27a", letterSpacing: "6px" }}>RELATÓRIO MENSAL</div>
        <div style={{ display: "flex", fontSize: report.client.name.length > 22 ? 60 : 72, fontWeight: 800, color: "#fff", lineHeight: 1.05 }}>{report.client.name}</div>
        <div style={{ display: "flex", fontSize: 36, color: "#c9d3ea", fontWeight: 600 }}>{fmtMes(report.month)}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "26px 48px 50px", gap: 20 }}>
        {head ? (
          <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 30, padding: "26px 40px", gap: 4 }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: C.accent, letterSpacing: "1.5px", textTransform: "uppercase" }}>{head.key === "followers" ? "Seguidores" : head.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <div style={{ display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1 }}>{val(head, head.after)}</div>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: color(head.delta) }}>{dTxt(head)}</div>
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: C.muted }}>{head.before != null ? `mês anterior: ${val(head, head.before)}` : "sem mês anterior para comparar"}</div>
          </div>
        ) : (
          <div style={{ display: "flex", background: C.card, borderRadius: 30, padding: 40, fontSize: 30, fontWeight: 600, color: C.muted }}>Os números deste mês ainda não foram lançados.</div>
        )}

        {cards.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {cards.map((l) => (
              <div key={l.key} style={{ display: "flex", flexDirection: "column", width: 483, background: C.card, borderRadius: 26, padding: "22px 30px", gap: 2 }}>
                <div style={{ display: "flex", fontSize: 23, fontWeight: 600, color: C.muted }}>{clip(l.label, 26)}</div>
                <div style={{ display: "flex", fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>{val(l, l.after)}</div>
                <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: color(l.delta) }}>{dTxt(l)}</div>
              </div>
            ))}
          </div>
        )}

        {nets.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 25, fontWeight: 800, color: C.accent, letterSpacing: "1.5px", textTransform: "uppercase" }}>Por rede</div>
            {nets.slice(0, 5).map((n) => {
              const f = n.lines.find((l) => l.key === "followers")!;
              const v = n.lines.find((l) => l.key === "views")!;
              return (
                <div key={n.network} style={{ display: "flex", alignItems: "center", background: C.card, borderRadius: 22, padding: "14px 24px", gap: 18 }}>
                  <NetDot network={n.network} size={48} />
                  <div style={{ display: "flex", flexGrow: 1, fontSize: 28, fontWeight: 800 }}>{n.network}</div>
                  <div style={{ display: "flex", flexDirection: "column", width: 230 }}>
                    <div style={{ display: "flex", fontSize: 20, color: C.muted, fontWeight: 600 }}>Seguidores</div>
                    <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>{int(f.after)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", width: 230 }}>
                    <div style={{ display: "flex", fontSize: 20, color: C.muted, fontWeight: 600 }}>Visualizações</div>
                    <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>{int(v.after)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {g.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 25, fontWeight: 800, color: C.accent, letterSpacing: "1.5px", textTransform: "uppercase" }}>Google Meu Negócio</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {g.slice(0, 8).map((x) => {
                const d = x.prev != null && x.cur != null ? x.cur - x.prev : null;
                return (
                  <div key={x.key} style={{ display: "flex", flexDirection: "column", width: 237, background: C.card, borderRadius: 22, padding: "16px 20px" }}>
                    <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: C.muted }}>{clip(x.label, 22)}</div>
                    <div style={{ display: "flex", fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{int(x.cur)}</div>
                    <div style={{ display: "flex", fontSize: 22, fontWeight: 800, color: color(d) }}>{d == null ? " " : `${sign(d)}${Math.abs(d).toLocaleString("pt-BR")}`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(note?.comment || note?.next_steps) && (
          <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 26, padding: "22px 30px", gap: 8 }}>
            {note.comment && <div style={{ display: "flex", fontSize: 25, fontWeight: 600, lineHeight: 1.3 }}>{clip(note.comment, 260)}</div>}
            {note.next_steps && <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><div style={{ display: "flex", fontSize: 21, fontWeight: 800, color: C.accent, letterSpacing: "1px", textTransform: "uppercase" }}>Próximos passos</div><div style={{ display: "flex", fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}>{clip(note.next_steps, 240)}</div></div>}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "center", fontSize: 22, fontWeight: 600, color: C.muted }}>{`Rixxer · relatório de ${fmtMes(report.month)}${collectedAt ? ` · dados coletados em ${fmtColeta(collectedAt)}` : ""}`}</div>
    </div>
  );
}

export function renderMonthlyImage(report: MonthlyReport, collectedAt: string | null): ImageResponse {
  return new ImageResponse(<MonthlyImage report={report} collectedAt={collectedAt} />, { width: REPORT_W, height: REPORT_H, fonts: fonts() });
}
