import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { buildReport } from "./aggregate";
import { renderReportPng } from "./report-image";
import { SAMPLE_COMMENT, SAMPLE_STEPS, sampleDataset } from "./fixtures/sample";

// Gera os PNGs de amostra em $REPORT_OUT (se definido) e confere dimensões 1080x1920.
describe("relatório stories", () => {
  for (const [name, n, rep] of [["6redes", 6, 1], ["2redes", 2, 1], ["6redes-textolongo", 6, 6], ["4redes-textolongo", 4, 6], ["3redes", 3, 1]] as const) {
    it(`renderiza 1080x1920 (${name})`, async () => {
      const data = buildReport(sampleDataset(n), "c1", "2026-11-16", { comment: SAMPLE_COMMENT.repeat(rep), next_steps: SAMPLE_STEPS.repeat(rep) });
      const png = await renderReportPng(data);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(1080);
      expect(png.readUInt32BE(20)).toBe(1920);
      if (process.env.REPORT_OUT) fs.writeFileSync(`${process.env.REPORT_OUT}/${name}.png`, png);
    }, 30000);
  }
});
