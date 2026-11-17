import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  // fontes do relatório lidas via fs: garantir que entram no bundle serverless da Vercel
  outputFileTracingIncludes: { "/**": ["./src/assets/fonts/**/*"] },
};

export default nextConfig;
