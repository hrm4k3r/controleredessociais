import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { buildTables } from "@/lib/export";
import { todayISO } from "@/lib/dates";

export const runtime = "nodejs";

export async function GET() {
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return new NextResponse("Não autorizado", { status: 401 });
  const wb = new ExcelJS.Workbook();
  for (const t of Object.values(await buildTables(sb))) {
    const ws = wb.addWorksheet(t.name);
    ws.addRow(t.headers).font = { bold: true };
    t.rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((c, i) => {
      const max = Math.max(t.headers[i]?.length ?? 8, ...t.rows.slice(0, 200).map((r) => String(r[i] ?? "").length));
      c.width = Math.min(50, Math.max(10, max + 2));
    });
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="controle-redes-sociais-${todayISO()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
