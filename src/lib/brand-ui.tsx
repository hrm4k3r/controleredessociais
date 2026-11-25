import { LOGO_BRANCO_PNG_BASE64 } from "./brand-logo";

export const BRAND = { purple: "#5b47c2", pink: "#dd6ad6", label: "#e9a6ea" };
const LOGO_SRC = `data:image/png;base64,${LOGO_BRANCO_PNG_BASE64}`;

/** Arte do cabeçalho das imagens: círculos roxo/rosa, logotipo Rixxer no canto e faixa em degradê na base. Vai dentro do cabeçalho (position: relative). Posições absolutas partem da área de conteúdo (após o padding). */
export function BrandHeaderArt() {
  return (
    <>
      <div style={{ position: "absolute", right: -70, top: -90, width: 320, height: 320, borderRadius: 160, background: BRAND.purple, opacity: 0.55 }} />
      <div style={{ position: "absolute", right: 120, top: 110, width: 150, height: 150, borderRadius: 75, background: BRAND.pink, opacity: 0.3 }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="" width={250} height={43} style={{ position: "absolute", right: -4, top: -2 }} />
    </>
  );
}

/** Faixa em degradê na base do cabeçalho; vai como ÚLTIMO filho do cabeçalho. `padBottom`/`padX` = padding do cabeçalho, para sangrar até a borda. */
export function BrandStrip({ padBottom, padX = 60 }: { padBottom: number; padX?: number }) {
  return <div style={{ display: "flex", height: 10, marginLeft: -padX, marginRight: -padX, marginBottom: -padBottom, marginTop: padBottom, background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.pink})` }} />;
}
