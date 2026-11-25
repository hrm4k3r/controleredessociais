import { ImageResponse } from "next/og";
import { fmtColeta } from "./dates";
import type { Line } from "./baseline";
import { fmtMes, fmtMesCurto, type MonthlyReport } from "./monthly";
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

/** Duas barras horizontais (mês anterior × mês atual) na mesma escala. */
function PairBars({ before, after }: { before: number | null; after: number | null }) {
  if (before == null || after == null) return <div style={{ display: "flex", height: 0 }} />;
  const max = Math.max(before, after, 1);
  const bar = (v: number, bg: string, label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", width: 40, fontSize: 15, fontWeight: 600, color: C.muted }}>{label}</div>
      <div style={{ display: "flex", height: 12, borderRadius: 6, background: bg, width: Math.max(8, Math.round((v / max) * 320)) }} />
    </div>
  );
  return <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>{bar(before, "#c3cad9", "ant.")}{bar(after, C.accent, "mês")}</div>;
}

/** Barras verticais da evolução de seguidores nos últimos meses. */
function History({ points }: { points: { month: string; followers: number | null }[] }) {
  const pts = points.filter((p) => p.followers != null);
  if (pts.length < 2) return <div style={{ display: "flex", height: 0 }} />;
  const max = Math.max(...pts.map((p) => p.followers!));
  const min = Math.min(...pts.map((p) => p.followers!));
  const h = (v: number) => 20 + Math.round(((v - min * 0.9) / Math.max(1, max - min * 0.9)) * 66);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 8, height: 128 }}>
      {pts.map((p, i) => (
        <div key={p.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", flexGrow: 1, gap: 4 }}>
          <div style={{ display: "flex", fontSize: 18, fontWeight: 800, color: i === pts.length - 1 ? C.accent : C.muted }}>{int(p.followers)}</div>
          <div style={{ display: "flex", width: "100%", height: h(p.followers!), borderRadius: 10, background: i === pts.length - 1 ? C.accent : "#c3cad9" }} />
          <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: C.muted }}>{fmtMesCurto(p.month).replace(/\.\/\d{4}/, "")}</div>
        </div>
      ))}
    </div>
  );
}

const SPLIT = [["calls", "Chamadas", "#2563eb"], ["directions", "Rotas", "#e8590c"], ["website_clicks", "Site", "#16a34a"], ["chat_clicks", "Chat", "#9333ea"], ["bookings", "Agend.", "#ca8a04"]] as const;

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
  const parts = SPLIT.map(([key, label, color]) => ({ key, label, color, v: Number(google?.google.find((x) => x.key === key)?.cur ?? 0) })).filter((p) => p.v > 0);
  const split = { parts, total: parts.reduce((a, p) => a + p.v, 0) };
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: REPORT_W, height: REPORT_H, background: C.bg, fontFamily: "Inter", color: C.text }}>
      <div style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #131a2e 0%, #2b3a5e 100%)", padding: "34px 60px 24px", gap: 2 }}>
        <div style={{ position: "absolute", right: -70, top: -90, width: 320, height: 320, borderRadius: 160, background: C.accent, opacity: 0.9 }} />
        <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#ffb27a", letterSpacing: "6px" }}>RELATÓRIO MENSAL</div>
        <div style={{ display: "flex", fontSize: report.client.name.length > 22 ? 60 : 72, fontWeight: 800, color: "#fff", lineHeight: 1.05 }}>{report.client.name}</div>
        <div style={{ display: "flex", fontSize: 36, color: "#c9d3ea", fontWeight: 600 }}>{fmtMes(report.month)}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "20px 48px 50px", gap: 14 }}>
        {head ? (
          <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 30, padding: "20px 40px 16px", gap: 2 }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: C.accent, letterSpacing: "1.5px", textTransform: "uppercase" }}>{head.key === "followers" ? "Seguidores" : head.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <div style={{ display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1 }}>{val(head, head.after)}</div>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: color(head.delta) }}>{dTxt(head)}</div>
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: C.muted }}>{head.before != null ? `mês anterior: ${val(head, head.before)}` : "sem mês anterior para comparar"}</div>
            {head.key === "followers" && <History points={report.history} />}
          </div>
        ) : (
          <div style={{ display: "flex", background: C.card, borderRadius: 30, padding: 40, fontSize: 30, fontWeight: 600, color: C.muted }}>Os números deste mês ainda não foram lançados.</div>
        )}

        {cards.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {cards.map((l) => (
              <div key={l.key} style={{ display: "flex", flexDirection: "column", width: 483, background: C.card, borderRadius: 26, padding: "16px 28px", gap: 0 }}>
                <div style={{ display: "flex", fontSize: 23, fontWeight: 600, color: C.muted }}>{clip(l.label, 26)}</div>
                <div style={{ display: "flex", fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>{val(l, l.after)}</div>
                <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: color(l.delta) }}>{dTxt(l)}</div>
                {!l.pct && <PairBars before={l.before} after={l.after} />}
              </div>
            ))}
          </div>
        )}

        {nets.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 25, fontWeight: 800, color: C.accent, letterSpacing: "1.5px", textTransform: "uppercase" }}>Por rede</div>
            {nets.slice(0, 4).map((n) => {
              const f = n.lines.find((l) => l.key === "followers")!;
              const v = n.lines.find((l) => l.key === "views")!;
              return (
                <div key={n.network} style={{ display: "flex", alignItems: "center", background: C.card, borderRadius: 22, padding: "8px 24px", gap: 18 }}>
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
                  <div key={x.key} style={{ display: "flex", flexDirection: "column", width: 237, background: C.card, borderRadius: 22, padding: "10px 20px" }}>
                    <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: C.muted }}>{clip(x.label, 22)}</div>
                    <div style={{ display: "flex", fontSize: 36, fontWeight: 800, lineHeight: 1.1 }}>{int(x.cur)}</div>
                    <div style={{ display: "flex", fontSize: 22, fontWeight: 800, color: color(d) }}>{d == null ? " " : `${sign(d)}${Math.abs(d).toLocaleString("pt-BR")}`}</div>
                  </div>
                );
              })}
            </div>
            {split.total > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, background: C.card, borderRadius: 22, padding: "16px 22px" }}>
                <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: C.muted }}>Como as interações se dividem</div>
                <div style={{ display: "flex", height: 26, borderRadius: 13, overflow: "hidden", background: "#e5e7eb" }}>
                  {split.parts.map((p) => <div key={p.key} style={{ display: "flex", width: `${(p.v / split.total) * 100}%`, background: p.color }} />)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  {split.parts.map((p) => <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 20, fontWeight: 700 }}><div style={{ display: "flex", width: 14, height: 12, borderRadius: 6, background: p.color }} />{`${p.label} ${Math.round((p.v / split.total) * 100)}%`}</div>)}
                </div>
              </div>
            )}
          </div>
        )}

        {(note?.comment || note?.next_steps) && (
          <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 26, padding: "22px 30px", gap: 8 }}>
            {note.comment && <div style={{ display: "flex", fontSize: 25, fontWeight: 600, lineHeight: 1.3 }}>{clip(note.comment, 200)}</div>}
            {note.next_steps && <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><div style={{ display: "flex", fontSize: 21, fontWeight: 800, color: C.accent, letterSpacing: "1px", textTransform: "uppercase" }}>Próximos passos</div><div style={{ display: "flex", fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}>{clip(note.next_steps, 180)}</div></div>}
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
