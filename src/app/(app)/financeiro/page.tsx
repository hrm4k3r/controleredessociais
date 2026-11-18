import { redirect } from "next/navigation";

/** O Financeiro agora é uma gestão própria (/caixa); mantém o endereço antigo funcionando. */
export default function FinanceiroAntigo() {
  redirect("/caixa/contratos");
}
