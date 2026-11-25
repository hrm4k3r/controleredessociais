import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { fmtColeta, fmtDiaMes } from "./dates";
import type { Line } from "./baseline";
import { fmtMes, fmtMesCurto, type Deliveries, type MonthItem, type MonthlyReport } from "./monthly";
import { C, NetDot, REPORT_H, REPORT_W, clip, fonts, int, pct } from "./report-image";
import { BRAND, BrandHeaderArt, BrandStrip } from "./brand-ui";

const val = (l: Line, v: number | null) => (l.pct ? pct(v) : int(v));
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
const color = (n: number | null) => (n == null || n === 0 ? C.muted : n > 0 ? C.green : C.red);
const dTxt = (l: Line) => {
  if (l.delta == null) return " ";
  if (l.pct) return `${sign(l.delta)}${Math.abs(l.delta * 100).toFixed(1).replace(".", ",")} p.p.`;
  return `${sign(l.delta)}${Math.abs(l.delta).toLocaleString("pt-BR")}${l.deltaPct != null ? ` (${sign(l.deltaPct)}${Math.abs(Math.round(l.deltaPct * 100))}%)` : ""}`;
};
const ORDER: Line["key"][] = ["followers", "reach", "interactions", "views", "engagement"];
const ROW_ORDER: Line["key"][] = ["followers", "views", "reach", "interactions", "clicks", "engagement"];
const Title = ({ children }: { children: ReactNode }) => <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: C.accent, letterSpacing: "1.5px", textTransform: "uppercase" }}>{children}</div>;

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

/** Tabela "indicador × mês anterior × mês × variação". */
type Row = { label: string; before: string; after: string; delta: string; tone: number | null };
function Table({ rows, prevLabel, curLabel }: { rows: Row[]; prevLabel: string; curLabel: string }) {
  const cell = (w: number | undefined, extra: object = {}) => ({ display: "flex", ...(w ? { width: w } : { flexGrow: 1 }), ...extra });
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", padding: "0 0 8px", fontSize: 19, fontWeight: 700, color: C.muted, textTransform: "capitalize" }}>
        <div style={cell(undefined)}>Indicador</div><div style={cell(190, { justifyContent: "flex-end" })}>{prevLabel}</div><div style={cell(190, { justifyContent: "flex-end" })}>{curLabel}</div><div style={cell(260, { justifyContent: "flex-end" })}>Variação</div>
      </div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", padding: "9px 0", borderTop: `2px solid ${C.line}`, fontSize: 25, fontWeight: 600 }}>
          <div style={cell(undefined)}>{r.label}</div>
          <div style={cell(190, { justifyContent: "flex-end", color: C.muted })}>{r.before}</div>
          <div style={cell(190, { justifyContent: "flex-end", fontWeight: 800 })}>{r.after}</div>
          <div style={cell(260, { justifyContent: "flex-end", fontWeight: 800, color: color(r.tone) })}>{r.delta}</div>
        </div>
      ))}
    </div>
  );
}
const lineRows = (lines: Line[]): Row[] =>
  ROW_ORDER.map((k) => lines.find((l) => l.key === k)!).filter((l) => l && (l.before != null || l.after != null)).map((l) => ({
    label: l.label.replace(" (mês)", ""), before: val(l, l.before), after: val(l, l.after), delta: dTxt(l).trim() || "—", tone: l.delta,
  }));
const numRow = (label: string, before: number | null, after: number | null): Row => {
  const d = before != null && after != null ? after - before : null;
  return { label, before: int(before), after: int(after), delta: d == null ? "—" : `${sign(d)}${Math.abs(d).toLocaleString("pt-BR")}${d !== 0 && before ? ` (${sign(d)}${Math.abs(Math.round((d / before) * 100))}%)` : ""}`, tone: d };
};

const SPLIT = [["calls", "Chamadas", "#2563eb"], ["directions", "Rotas", "#e8590c"], ["website_clicks", "Site", "#16a34a"], ["chat_clicks", "Chat", "#9333ea"], ["bookings", "Agendamentos", "#ca8a04"]] as const;

type Ctx = { report: MonthlyReport; deliveries: Deliveries | null; collectedAt: string | null };
type PageDef = { key: string; render: (c: Ctx) => ReactNode };

const Col = ({ children }: { children?: ReactNode }) => <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>;
const Card = ({ children, gap = 6 }: { children: ReactNode; gap?: number }) => <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 28, padding: "24px 34px", gap }}>{children}</div>;

/* ---------- páginas ---------- */
const summaryPage: PageDef = {
  key: "resumo",
  render: ({ report }) => {
    const lines = ORDER.map((k) => report.lines.find((l) => l.key === k)!).filter((l) => l && l.after != null);
    // Redes sociais sem movimento no mês (ex.: conta nova): não abre o relatório com uma parede de zeros.
    const quiet = lines.length === 0 || lines.every((l) => !l.after);
    const head = quiet ? undefined : lines.find((l) => l.key === "followers") ?? lines[0];
    const cards = quiet ? [] : lines.filter((l) => l !== head).slice(0, 4);
    const nets = report.items.filter((i) => i.has && !i.monthly && i.cur);
    const g = report.items.find((i) => i.monthly && i.has);
    const gcards = g ? [
      { label: "Visualizações do perfil", cur: g.cur?.views ?? null, prev: g.prev?.views ?? null },
      { label: "Interações no perfil", cur: g.cur?.interactions ?? null, prev: g.prev?.interactions ?? null },
      ...g.google.filter((x) => x.key === "directions" || x.key === "calls").map((x) => ({ label: x.label === "Rotas" ? "Pedidos de rota" : x.label, cur: x.cur, prev: x.prev })),
    ].filter((x) => x.cur != null) : [];
    return (
      <Col>
        {g && gcards.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}><NetDot network="Google Meu Negócio" size={44} /><Title>Google Meu Negócio</Title></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {gcards.map((x) => {
                const d = x.prev != null && x.cur != null ? x.cur - x.prev : null;
                return (
                  <div key={x.label} style={{ display: "flex", flexDirection: "column", width: 483, background: C.card, borderRadius: 26, padding: "18px 30px" }}>
                    <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: C.muted }}>{x.label}</div>
                    <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>{int(x.cur)}</div>
                    <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: color(d) }}>{d == null ? " " : `${sign(d)}${Math.abs(d).toLocaleString("pt-BR")}`}</div>
                    {x.prev != null && x.cur != null && <PairBars before={x.prev} after={x.cur} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {head && (
          <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 30, padding: "22px 40px 18px", gap: 2 }}>
            <Title>{head.key === "followers" ? "Seguidores" : head.label}</Title>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <div style={{ display: "flex", fontSize: 100, fontWeight: 800, lineHeight: 1 }}>{val(head, head.after)}</div>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: color(head.delta) }}>{dTxt(head)}</div>
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: C.muted }}>{head.before != null ? `mês anterior: ${val(head, head.before)}` : "sem mês anterior para comparar"}</div>
            {head.key === "followers" && <History points={report.history} />}
          </div>
        )}
        {cards.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {cards.map((l) => (
              <div key={l.key} style={{ display: "flex", flexDirection: "column", width: 483, background: C.card, borderRadius: 26, padding: "18px 30px" }}>
                <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: C.muted }}>{clip(l.label, 26)}</div>
                <div style={{ display: "flex", fontSize: 58, fontWeight: 800, lineHeight: 1.1 }}>{val(l, l.after)}</div>
                <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: color(l.delta) }}>{dTxt(l)}</div>
                {!l.pct && <PairBars before={l.before} after={l.after} />}
              </div>
            ))}
          </div>
        )}
        {quiet && nets.length > 0 && (
          <Card gap={8}>
            <Title>Redes sociais</Title>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 600, lineHeight: 1.35 }}>{`Sem movimento em ${fmtMes(report.month)}: ${nets.map((n) => n.network).join(", ")}. Este é o ponto de partida para os próximos meses.`}</div>
          </Card>
        )}
        {!quiet && nets.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Title>Por rede</Title>
            {nets.slice(0, 6).map((n) => {
              const f = n.lines.find((l) => l.key === "followers")!;
              const v = n.lines.find((l) => l.key === "views")!;
              return (
                <div key={n.network} style={{ display: "flex", alignItems: "center", background: C.card, borderRadius: 22, padding: "10px 24px", gap: 18 }}>
                  <NetDot network={n.network} size={48} />
                  <div style={{ display: "flex", flexGrow: 1, fontSize: 28, fontWeight: 800 }}>{n.network}</div>
                  <div style={{ display: "flex", flexDirection: "column", width: 230 }}><div style={{ display: "flex", fontSize: 20, color: C.muted, fontWeight: 600 }}>Seguidores</div><div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>{int(f.after)}</div></div>
                  <div style={{ display: "flex", flexDirection: "column", width: 230 }}><div style={{ display: "flex", fontSize: 20, color: C.muted, fontWeight: 600 }}>Visualizações</div><div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>{int(v.after)}</div></div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: C.muted, lineHeight: 1.3 }}>{report.firstMonth ? "Este é o primeiro mês de medição: ele é o ponto de partida. A partir do próximo relatório, cada número será comparado com este." : "Nas páginas seguintes: o que foi publicado e todos os números de cada rede."}</div>
      </Col>
    );
  },
};

const deliveriesPage: PageDef = {
  key: "entregas",
  render: ({ deliveries: d }) => {
    if (!d) return null;
    const maxF = Math.max(1, ...d.byFormat.map((x) => x.n));
    const maxN = Math.max(1, ...d.byNetwork.map((x) => x.n));
    const Bars = ({ items, max, bg }: { items: { label: string; n: number }[]; max: number; bg: string }) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.slice(0, 7).map((x) => (
          <div key={x.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", width: 210, fontSize: 23, fontWeight: 600 }}>{clip(x.label, 18)}</div>
            <div style={{ display: "flex", height: 22, borderRadius: 11, background: bg, width: Math.max(14, Math.round((x.n / max) * 520)) }} />
            <div style={{ display: "flex", fontSize: 25, fontWeight: 800 }}>{x.n}</div>
          </div>
        ))}
      </div>
    );
    return (
      <Col>
        <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 30, padding: "24px 40px", gap: 6 }}>
          <Title>Publicações do mês</Title>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div style={{ display: "flex", fontSize: 110, fontWeight: 800, lineHeight: 1 }}>{d.total}</div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: C.muted }}>{d.total === 1 ? "post publicado" : "posts publicados"}</div>
          </div>
          {d.goal != null && (
            <Col>
              <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: d.pct != null && d.pct >= 1 ? C.green : C.muted }}>{`Meta do mês: ${d.goal} · ${Math.round((d.pct ?? 0) * 100)}% atingida`}</div>
              <div style={{ display: "flex", height: 18, borderRadius: 9, background: "#e5e7eb", overflow: "hidden" }}><div style={{ display: "flex", width: `${Math.min(100, Math.round((d.pct ?? 0) * 100))}%`, background: (d.pct ?? 0) >= 1 ? C.green : C.accent }} /></div>
            </Col>
          )}
        </div>
        {d.byFormat.length > 0 && <Card gap={12}><Title>Por formato</Title><Bars items={d.byFormat} max={maxF} bg={C.accent} /></Card>}
        {d.byNetwork.length > 0 && <Card gap={12}><Title>Por rede</Title><Bars items={d.byNetwork} max={maxN} bg={C.navy2} /></Card>}
        {d.posts.length > 0 && (
          <Card gap={8}>
            <Title>O que foi publicado</Title>
            {d.posts.slice(0, 12).map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, fontWeight: 600, paddingTop: 6, borderTop: i ? `2px solid ${C.line}` : "none" }}>
                <div style={{ display: "flex", width: 70, color: C.accent, fontWeight: 800 }}>{fmtDiaMes(p.date)}</div>
                <div style={{ display: "flex", flexGrow: 1 }}>{clip(p.summary ?? "(sem resumo)", 52)}</div>
                <div style={{ display: "flex", color: C.muted, fontSize: 19 }}>{clip([p.format, p.networks.join(", ")].filter(Boolean).join(" · "), 30)}</div>
              </div>
            ))}
            {d.posts.length > 12 && <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: C.muted }}>{`… e mais ${d.posts.length - 12} publicações`}</div>}
          </Card>
        )}
      </Col>
    );
  },
};

const networkPage = (items: MonthItem[], idx: number): PageDef => ({
  key: `redes-${idx}`,
  render: ({ report }) => (
    <Col>
      {items.map((n) => (
        <div key={n.network} style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 28, padding: "22px 34px", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}><NetDot network={n.network} size={54} /><div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>{n.network}</div></div>
          <Table rows={lineRows(n.lines)} prevLabel={fmtMesCurto(report.prev).replace(".", "")} curLabel={fmtMesCurto(report.month).replace(".", "")} />
          {n.learning && <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: C.muted, lineHeight: 1.3 }}>{clip(n.learning, 170)}</div>}
        </div>
      ))}
    </Col>
  ),
});

const googlePage = (g: MonthItem): PageDef => ({
  key: "google",
  render: ({ report }) => {
    const rows = [numRow("Visualizações do perfil", g.prev?.views ?? null, g.cur?.views ?? null), numRow("Interações no perfil", g.prev?.interactions ?? null, g.cur?.interactions ?? null), ...g.google.map((x) => numRow(x.label, x.prev, x.cur))].filter((r) => r.before !== "—" || r.after !== "—");
    const parts = SPLIT.map(([key, label, c]) => ({ key, label, c, v: Number(g.google.find((x) => x.key === key)?.cur ?? 0) })).filter((p) => p.v > 0);
    const total = parts.reduce((a, p) => a + p.v, 0);
    return (
      <Col>
        <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 28, padding: "22px 34px", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}><NetDot network="Google Meu Negócio" size={54} /><div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>Google Meu Negócio</div></div>
          <Table rows={rows} prevLabel={fmtMesCurto(report.prev).replace(".", "")} curLabel={fmtMesCurto(report.month).replace(".", "")} />
        </div>
        {total > 0 && (
          <Card gap={12}>
            <Title>Como as pessoas interagiram</Title>
            <div style={{ display: "flex", height: 34, borderRadius: 17, overflow: "hidden", background: "#e5e7eb" }}>{parts.map((p) => <div key={p.key} style={{ display: "flex", width: `${(p.v / total) * 100}%`, background: p.c }} />)}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>{parts.map((p) => <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 24, fontWeight: 700 }}><div style={{ display: "flex", width: 18, height: 18, borderRadius: 9, background: p.c }} />{`${p.label} ${p.v} (${Math.round((p.v / total) * 100)}%)`}</div>)}</div>
          </Card>
        )}
        {g.learning && <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: C.muted, lineHeight: 1.3 }}>{clip(g.learning, 200)}</div>}
      </Col>
    );
  },
});

const analysisPage: PageDef = {
  key: "analise",
  render: ({ report }) => (
    <Col>
      {report.note?.comment && <Card gap={10}><Title>Análise do mês</Title><div style={{ display: "flex", fontSize: 29, fontWeight: 600, lineHeight: 1.4 }}>{clip(report.note.comment, 900)}</div></Card>}
      {report.note?.next_steps && <Card gap={10}><Title>Próximos passos</Title><div style={{ display: "flex", fontSize: 29, fontWeight: 600, lineHeight: 1.4 }}>{clip(report.note.next_steps, 900)}</div></Card>}
    </Col>
  ),
};

/** Monta as páginas do relatório conforme os dados existentes. */
export function monthlyPages(report: MonthlyReport, deliveries: Deliveries | null): PageDef[] {
  const pages: PageDef[] = [summaryPage];
  if (deliveries && deliveries.total > 0) pages.push(deliveriesPage);
  // Rede com tudo zerado no mês já é explicada no resumo: não ganha página de tabela.
  const nets = report.items.filter((i) => i.has && !i.monthly && i.cur && Object.values(i.cur).some((v) => v != null && v > 0));
  for (let i = 0; i < nets.length; i += 3) pages.push(networkPage(nets.slice(i, i + 3), i / 3));
  const g = report.items.find((i) => i.monthly && i.has);
  if (g) pages.push(googlePage(g));
  if (report.note?.comment || report.note?.next_steps) pages.push(analysisPage);
  return pages;
}
export const monthlyPageCount = (report: MonthlyReport, deliveries: Deliveries | null) => monthlyPages(report, deliveries).length;

function Shell({ ctx, page, total, children }: { ctx: Ctx; page: number; total: number; children: ReactNode }) {
  const { report, collectedAt } = ctx;
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: REPORT_W, height: REPORT_H, background: C.bg, fontFamily: "Inter", color: C.text }}>
      <div style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #131a2e 0%, #2b3a5e 100%)", padding: "34px 60px 24px", gap: 2 }}>
        <BrandHeaderArt />
        <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: BRAND.label, letterSpacing: "6px" }}>RELATÓRIO MENSAL</div>
        <div style={{ display: "flex", fontSize: report.client.name.length > 22 ? 60 : 72, fontWeight: 800, color: "#fff", lineHeight: 1.05 }}>{report.client.name}</div>
        <div style={{ display: "flex", fontSize: 36, color: "#c9d3ea", fontWeight: 600 }}>{fmtMes(report.month)}</div>
        <BrandStrip padBottom={24} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "22px 48px 60px", gap: 16 }}>{children}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 12, display: "flex", justifyContent: "center", fontSize: 22, fontWeight: 600, color: C.muted }}>{`Rixxer · ${fmtMes(report.month)}${collectedAt ? ` · coletado em ${fmtColeta(collectedAt)}` : ""} · página ${page}/${total}`}</div>
    </div>
  );
}

/** Renderiza a página `page` (1..N) do relatório mensal. */
export function renderMonthlyImage(report: MonthlyReport, collectedAt: string | null, deliveries: Deliveries | null = null, page = 1): ImageResponse {
  const pages = monthlyPages(report, deliveries);
  const n = Math.min(Math.max(1, page), pages.length);
  const ctx: Ctx = { report, deliveries, collectedAt };
  return new ImageResponse(<Shell ctx={ctx} page={n} total={pages.length}>{pages[n - 1].render(ctx)}</Shell>, { width: REPORT_W, height: REPORT_H, fonts: fonts() });
}
