/** Aviso quando as tabelas da gestão de projetos ainda não existem (migração não rodada). */
export default function DevHint() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
      Não foi possível carregar os dados. Se for a primeira vez, rode no Supabase as migrações <code>20261118000005_modulos.sql</code> e <code>20261118000006_dev_projetos.sql</code>.
    </div>
  );
}
