/** Aviso quando as tabelas de Materiais Impressos ainda não existem (migração não rodada). */
export default function PrintHint() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
      Não foi possível carregar os dados. Se for a primeira vez, rode no Supabase a migração <code>20261119000017_impressos.sql</code>.
    </div>
  );
}
