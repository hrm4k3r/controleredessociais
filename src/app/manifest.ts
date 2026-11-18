import type { MetadataRoute } from "next";

/** Permite instalar o Rixxer Hub como app (celular e desktop). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rixxer Hub",
    short_name: "Rixxer Hub",
    description: "Gestão de redes sociais, projetos de software e financeiro",
    lang: "pt-BR",
    start_url: "/modulos",
    scope: "/",
    display: "standalone",
    background_color: "#131a2e",
    theme_color: "#1f2a44",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Redes Sociais", url: "/" },
      { name: "Projetos de Software", url: "/dev" },
      { name: "Financeiro", url: "/caixa" },
    ],
  };
}
