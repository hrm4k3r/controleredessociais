import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { fmtColeta, fmtPeriodo } from "./dates";
import { goalText } from "./calc";
import type { NetworkRow, ReportData, ResultRow } from "./aggregate";

export const REPORT_W = 1080;
export const REPORT_H = 1920;

const C = {
  navy: "#1f2a44", navy2: "#2b3a5e", accent: "#e8590c", bg: "#eef1f6", card: "#ffffff", text: "#1b2437", muted: "#64708a", line: "#dde2ec",
  green: "#16a34a", greenBg: "#dcfce7", yellow: "#ca8a04", yellowBg: "#fef3c7", red: "#dc2626", redBg: "#fee2e2", grayBg: "#e5e7eb",
};

const BRAND: Record<string, string> = { Instagram: "#e1306c", Facebook: "#1877f2", TikTok: "#111827", YouTube: "#ff0000", Pinterest: "#e60023", "Google Meu Negócio": "#34a853" };
export function NetDot({ network, size = 44 }: { network: string; size?: number }) {
  const letter = network === "Google Meu Negócio" ? "G" : network.charAt(0).toUpperCase();
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: size / 2, background: BRAND[network] ?? C.navy, color: "#fff", fontSize: size * 0.5, fontWeight: 800 }}>{letter}</div>;
}
const MEDAL = ["#f5b301", "#9aa5b8", "#c9773c"];

let fontCache: { name: string; data: Buffer; weight: 400 | 600 | 800; style: "normal" }[] | null = null;
function fonts() {
  if (!fontCache) {
    const dir = path.join(process.cwd(), "src/assets/fonts");
    const f = (w: 400 | 600 | 800) => ({ name: "Inter", data: fs.readFileSync(path.join(dir, `inter-latin-${w}-normal.woff`)), weight: w, style: "normal" as const });
    fontCache = [f(400), f(600), f(800)];
  }
  return fontCache;
}

const int = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR"));
const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d).replace(".", ",")}%`);
const dpct = (v: number | null | undefined) => (v == null ? null : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 100))}%`);
const dint = (v: number | null | undefined) => (v == null ? null : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR")}`);
const tone = (v: number | null | undefined) => (v == null || v === 0 ? C.muted : v > 0 ? C.green : C.red);
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

function levelColors(level: string) {
  return level === "green" ? { fg: C.green, bg: C.greenBg } : level === "yellow" ? { fg: C.yellow, bg: C.yellowBg } : level === "red" ? { fg: C.red, bg: C.redBg } : { fg: C.muted, bg: C.grayBg };
}
const verdictColors = (v: string | null) => (v === "Repetir" ? { fg: C.green, bg: C.greenBg } : v === "Adaptar" ? { fg: C.red, bg: C.redBg } : v === "Poucos dados" ? { fg: C.yellow, bg: C.yellowBg } : { fg: C.muted, bg: C.grayBg });

export function Chip({ text, fg, bg, size = 26 }: { text: string; fg: string; bg: string; size?: number }) {
  return <div style={{ display: "flex", alignSelf: "flex-start", background: bg, color: fg, fontSize: size, fontWeight: 800, padding: "6px 18px", borderRadius: 999 }}>{text}</div>;
}

export function Metric({ label, value, sub, subColor, big = 40, w }: { label: string; value: string; sub?: string | null; subColor?: string; big?: number; w?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", ...(w ? { width: w } : { flexGrow: 1 }) }}>
      <div style={{ fontSize: 21, color: C.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: big, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 23, fontWeight: 800, color: subColor ?? C.muted, height: 26 }}>{sub ?? " "}</div>
    </div>
  );
}

export function NetworkCard({ n }: { n: NetworkRow }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 26, padding: "20px 30px", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><NetDot network={n.network} size={50} /><div style={{ display: "flex", fontSize: 38, fontWeight: 800, color: C.navy }}>{n.network}</div></div>
        <div style={{ display: "flex", fontSize: 26, color: C.muted, fontWeight: 600 }}>{`${n.posts} ${n.posts === 1 ? "post" : "posts"}${n.hasData ? ` · eng. ${pct(n.engagement)}` : ""}`}</div>
      </div>
      {n.hasData ? (
        <div style={{ display: "flex", gap: 14 }}>
          <Metric label="Seguidores" value={int(n.followers)} sub={n.newFollowers != null ? `${dint(n.newFollowers)} na semana` : null} subColor={tone(n.newFollowers)} />
          <Metric label="Visualizações" value={int(n.views)} sub={n.viewsVar != null ? `${dpct(n.viewsVar)} vs. anterior` : null} subColor={tone(n.viewsVar)} />
          <Metric label="Alcance" value={int(n.reach)} />
          <Metric label="Interações" value={int(n.interactions)} />
        </div>
      ) : (
        <div style={{ fontSize: 26, color: C.muted }}>Sem números lançados nesta semana</div>
      )}
    </div>
  );
}

export function NetworkRowCompact({ n }: { n: NetworkRow }) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: C.card, borderRadius: 20, padding: "6px 26px 6px 18px", gap: 12, borderLeft: `10px solid ${BRAND[n.network] ?? C.navy}` }}>
      <div style={{ display: "flex", alignItems: "center", width: 236, gap: 12 }}>
        <NetDot network={n.network} size={44} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>{n.network === "Google Meu Negócio" ? "Google" : n.network}</div>
          <div style={{ fontSize: 21, color: C.muted, fontWeight: 600 }}>{`${n.posts} ${n.posts === 1 ? "post" : "posts"}`}</div>
        </div>
      </div>
      {n.hasData ? (
        <>
          <Metric w={180} label="Seguidores" value={int(n.followers)} sub={dint(n.newFollowers)} subColor={tone(n.newFollowers)} big={30} />
          <Metric w={205} label="Visualizações" value={int(n.views)} sub={dpct(n.viewsVar)} subColor={tone(n.viewsVar)} big={30} />
          <Metric w={170} label="Alcance" value={int(n.reach)} big={30} />
          <Metric label="Engaj." value={pct(n.engagement)} big={30} />
        </>
      ) : (
        <div style={{ fontSize: 24, color: C.muted }}>Sem números nesta semana</div>
      )}
    </div>
  );
}

export function PostRow({ r, rank, dense = false }: { r: ResultRow; rank: string; dense?: boolean }) {
  const v = verdictColors(r.verdict);
  return (
    <div style={{ display: "flex", alignItems: "center", background: C.card, borderRadius: 24, padding: dense ? "8px 26px" : "14px 26px", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: 30, background: MEDAL[Number.parseInt(rank) - 1] ?? C.navy, color: "#fff", fontSize: 30, fontWeight: 800 }}>{rank}</div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 2 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.navy }}>{clip(`${r.network} · ${r.post.format ?? "Post"}`, 36)}</div>
        {!dense && <div style={{ fontSize: 24, color: C.muted, fontWeight: 600 }}>{clip(r.post.summary ?? "", 46)}</div>}
        <div style={{ fontSize: 26, color: C.text, fontWeight: 600 }}>
          {`${int(r.result?.reach)} alcance · ${int(r.interactions)} interações · ${pct(r.rate)}`}
        </div>
      </div>
      {r.verdict && <Chip text={r.verdict} fg={v.fg} bg={v.bg} size={24} />}
    </div>
  );
}

export function SectionTitle({ text }: { text: string }) {
  return <div style={{ display: "flex", fontSize: 27, fontWeight: 800, color: C.accent, letterSpacing: "1.5px", textTransform: "uppercase" }}>{text}</div>;
}

export function ReportImage({ data }: { data: ReportData }) {
  const { client, summary: s, networks, top, adapt } = data;
  const lv = levelColors(s.level);
  const compact = networks.length > 2;
  const dense = networks.length > 3;
  const comment = clip(data.comment.trim(), dense ? 150 : compact ? 170 : 230);
  const steps = clip(data.nextSteps.trim(), dense ? 130 : compact ? 150 : 200);
  const pctW = Math.min(100, Math.round((s.pct ?? 0) * 100));
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: REPORT_W, height: REPORT_H, background: C.bg, fontFamily: "Inter", color: C.text }}>
      {data.collectedAt && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 4, display: "flex", justifyContent: "center", fontSize: 20, fontWeight: 600, color: C.muted }}>{`Dados coletados em ${fmtColeta(data.collectedAt)}`}</div>
      )}
      {/* Cabeçalho */}
      <div style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #131a2e 0%, #2b3a5e 100%)", padding: "44px 60px 28px", gap: 4 }}>
        <div style={{ position: "absolute", right: -70, top: -90, width: 320, height: 320, borderRadius: 160, background: C.accent, opacity: 0.9 }} />
        <div style={{ position: "absolute", right: 150, top: 120, width: 150, height: 150, borderRadius: 75, background: "#ffffff", opacity: 0.08 }} />
        <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#ffb27a", letterSpacing: "6px" }}>RELATÓRIO SEMANAL</div>
        <div style={{ display: "flex", fontSize: client.name.length > 22 ? 60 : 72, fontWeight: 800, color: "#fff", lineHeight: 1.05 }}>{client.name}</div>
        <div style={{ display: "flex", fontSize: 34, color: "#c9d3ea", fontWeight: 600 }}>{`Semana de ${fmtPeriodo(data.week)}`}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "22px 48px 24px", gap: 12, overflow: "hidden" }}>
        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", background: C.card, borderRadius: 26, padding: "16px 30px", gap: 28 }}>
          <div style={{ display: "flex", position: "relative", width: 150, height: 150, alignItems: "center", justifyContent: "center" }}>
            <svg width="150" height="150" viewBox="0 0 150 150" style={{ position: "absolute", left: 0, top: 0 }}>
              <circle cx="75" cy="75" r="62" fill="none" stroke={C.line} strokeWidth="16" />
              <circle cx="75" cy="75" r="62" fill="none" stroke={lv.fg} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(pctW / 100) * 389.6} 389.6`} transform="rotate(-90 75 75)" />
            </svg>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: C.navy }}>{s.pct == null ? "—" : `${Math.round(s.pct * 100)}%`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexGrow: 1 }}>
            <SectionTitle text="Meta de postagens" />
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: C.navy, lineHeight: 1 }}>{String(s.done)}</div>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: C.muted }}>{`de ${s.goal} posts`}</div>
            </div>
            <Chip text={goalText(s.done, s.goal)} fg={lv.fg} bg={lv.bg} size={24} />
          </div>
        </div>

        {/* Números por rede */}
        <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 12 }}>
          <SectionTitle text="Números por rede" />
          {networks.map((n) => (compact ? <NetworkRowCompact key={n.network} n={n} /> : <NetworkCard key={n.network} n={n} />))}
        </div>

        {/* Top 3 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionTitle text="Posts que mais engajaram" />
          {top.length === 0 && <div style={{ display: "flex", fontSize: 26, color: C.muted }}>Resultados dos posts ainda não lançados.</div>}
          {top.map((r, i) => <PostRow key={r.post.id + r.network} r={r} rank={`${i + 1}º`} dense={dense} />)}
        </div>

        {/* Adaptar */}
        {adapt && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionTitle text="Post para adaptar" />
            <PostRow r={adapt} rank="↓" dense={dense} />
          </div>
        )}

        {/* Comentário e próximos passos */}
        {(comment || steps) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flexGrow: 1, overflow: "hidden" }}>
            {comment && (
              <div style={{ display: "flex", flexDirection: "column", background: C.navy, borderRadius: 22, padding: dense ? "14px 26px" : "18px 28px", gap: 4 }}>
                <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: C.accent, letterSpacing: "2px" }}>COMENTÁRIO DA SEMANA</div>
                <div style={{ display: "flex", fontSize: dense ? 26 : 28, color: "#fff", fontWeight: 600, lineHeight: 1.25 }}>{comment}</div>
              </div>
            )}
            {steps && (
              <div style={{ display: "flex", flexDirection: "column", background: C.accent, borderRadius: 22, padding: dense ? "14px 26px" : "18px 28px", gap: 4 }}>
                <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: "#ffe8d6", letterSpacing: "2px" }}>PRÓXIMOS PASSOS</div>
                <div style={{ display: "flex", fontSize: dense ? 26 : 28, color: "#fff", fontWeight: 600, lineHeight: 1.25 }}>{steps}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function renderReportImage(data: ReportData): ImageResponse {
  return new ImageResponse(<ReportImage data={data} />, { width: REPORT_W, height: REPORT_H, fonts: fonts() });
}

export async function renderReportPng(data: ReportData): Promise<Buffer> {
  return Buffer.from(await renderReportImage(data).arrayBuffer());
}
