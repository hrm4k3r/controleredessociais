# Rixxer Hub

Sistema web interno (acesso restrito, com senha) da Rixxer, com três gestões no mesmo pacote (redes sociais, projetos de software e financeiro). A gestão de redes controla as redes sociais dos clientes da agência:
postagens, métricas semanais, resultado de cada post, painel, relatório em formato **Stories 1080×1920**
(PNG + página pública por link), financeiro e envio semanal por e-mail.

Stack: Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · Resend · Vercel.
Interface em pt-BR, fuso `America/Sao_Paulo`, semana de segunda a domingo.

> `referencia/` guarda a planilha-modelo e o script que a gerou (só referência; não faz parte do app).

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha as chaves do Supabase (passo abaixo)
npm run dev                  # http://localhost:3000
npm test                     # testes das regras de cálculo + render do relatório
```

### 1. Criar o projeto no Supabase (você faz, no navegador)

1. Em <https://supabase.com> crie um projeto (região São Paulo, se disponível) e guarde a senha do banco.
2. **Banco de dados:** em *SQL Editor*, cole e execute, **nesta ordem**, os arquivos de `supabase/migrations/`:
   1. `20261117000001_schema.sql` (tabelas + RLS)
   2. `20261117000002_seed.sql` (clientes, contas, metas, listas e financeiro)

   (Alternativa com a CLI: `npx supabase link --project-ref <ref>` e `npx supabase db push`.)
3. **Usuário:** *Authentication → Users → Add user → Create new user* com o seu e-mail e uma senha.
   Depois, em *Authentication → Sign In / Providers → Email*, **desative “Allow new users to sign up”**
   (não há cadastro público).
4. **Chaves:** em *Project Settings → API* copie a URL, a chave `anon` e a `service_role` para o `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
   A `service_role` **nunca** vai para o git nem para o navegador: só o servidor a usa (página pública do relatório e cron).

Os pagamentos **não** vêm preenchidos: lance/confirme em *Financeiro*.

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Login e acesso aos dados (protegidos por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Página pública `/r/<token>` e cron (somente servidor) |
| `NEXT_PUBLIC_APP_URL` | URL pública do sistema (links nos e-mails) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Envio por e-mail (domínio verificado no Resend) |
| `EMAIL_MODE` | `live` envia de verdade; qualquer outro valor = **modo teste** (só registra no log) |
| `CRON_SECRET`, `WEEKLY_EMAIL_CRON_ENABLED` | Envio automático de segunda (desligado por padrão) |

## E-mail (Resend)

1. Crie conta no Resend e **verifique um domínio** (DNS). Crie uma API key.
2. Preencha `RESEND_API_KEY` e `EMAIL_FROM` (ex.: `Rixxer <relatorios@seudominio.com.br>`).
3. Cadastre os e-mails de cada cliente em *Cadastros*.
4. Em *Relatório → Enviar relatório…* você vê a pré-visualização e confirma. O e-mail leva o PNG em anexo e o
   link da versão para celular; cada envio fica registrado (data, destinatário, status).
5. Enquanto `EMAIL_MODE` não for `live`, nada é enviado (modo teste).

### Envio automático toda segunda (opcional, desligado)

`vercel.json` agenda `GET /api/cron/weekly-report` às 10:00 UTC de segunda (= 07:00 em São Paulo). A rota exige
`Authorization: Bearer $CRON_SECRET` (a Vercel envia sozinha se `CRON_SECRET` estiver definido no projeto) e só
age com `WEEKLY_EMAIL_CRON_ENABLED=true`. Envia o relatório da semana que acabou de fechar aos clientes com e-mail
e métricas lançadas, sem repetir quem já recebeu. Para ligar: defina as duas variáveis na Vercel.

## Deploy na Vercel

1. Envie o repositório ao GitHub e importe na Vercel (framework Next.js, sem configuração extra).
2. Cadastre as variáveis de ambiente acima (*Settings → Environment Variables*); `NEXT_PUBLIC_APP_URL` = URL final.
3. No Supabase (*Authentication → URL Configuration*), ajuste *Site URL* para a URL da Vercel.
4. Faça o deploy. Para trocar o `.env.local` por produção, apenas repita as variáveis na Vercel.

## Como usar (rotina)

- **Todo dia:** *Postagens → Novo post* (data, cliente, status, formato, tema, redes em que saiu). Só “Postado” conta para a meta;
  um post em várias redes conta 1.
- **Marco inicial e Evolução:** em *Marco inicial* registre, por rede, os números de partida (seguidores, alcance, visualizações, interações, cliques; sugere o último domingo). Em *Evolução* veja o antes × depois por cliente e o resumo da agência (seguidores ganhos, variação de alcance e engajamento). Exige a migração `20261118000015_marco_inicial.sql`.
- **Relatório de evolução para o cliente:** em *Evolução*, cada cliente tem "Gerar link e PNG para o cliente": página pública `/e/<token>` e imagem Stories 1080×1920 com seguidores ganhos, engajamento, alcance, interações e visualizações (antes × depois). Exige a migração `20261118000016_evolucao_link.sql`.
- **Relatório de tempo (`/tempo`, só proprietário/administrador):** tempo médio por formato e por cliente (redes) e horas por tipo de projeto/item (software), com filtro de período.
- **Pomodoro:** botão ▶ Foco em cada cartão (move para Em andamento se estava em A fazer). Timer flutuante 25/5/15 (configurável), com som e aviso, que continua ao trocar de página; cada ciclo concluído soma 🍅 e minutos de foco ao cartão. Início/fim (Em andamento → Em revisão) também ficam gravados. Exige as migrações `...013_tarefas_inicio_fim.sql` e `...014_tarefas_pomodoro.sql`. Esses dados alimentarão o relatório de tempo (somente administradores).
- **Hora da coleta:** em *Métricas*, cada cliente tem "Dados coletados em [data] às [hora]" (vem preenchido com o momento atual; o botão *Agora* atualiza). Aparece no PNG, na página pública e no e-mail do relatório. Exige a migração `20261118000011_hora_coleta.sql`.
- **Domingo:** *Métricas* (seguidores, visualizações, alcance, interações, cliques por conta) e *Resultados* (números de cada post por rede).
- **Segunda:** *Painel* (meta × feito, variação) e *Relatório* (comentário, próximos passos, PNG, link e envio).
- **Tarefas:** quadro Kanban semanal (A fazer / Em andamento / Em revisão / Concluído) para organizar as postagens a criar; arraste os cartões, filtre por cliente e leve os pendentes para a próxima semana. Ao concluir, o cartão vira um post "Planejado" (se tiver cliente; uma vez só). Exige as migrações `20261118000002_tarefas.sql`, `20261118000003_tarefas_post.sql` e `20261118000009_tarefas_post_campos.sql`. O cartão guarda formato, tema e redes, e o post já nasce completo.
- **Autoria:** cartões e posts mostram quem criou (e quem concluiu/editou por último). Gravado por triggers do banco (migração `20261118000004_autoria.sql`); o nome vem de *Usuários*.
- **Financeiro (gestão própria, `/caixa`):** contratos (valor/vencimento por cliente e pagamentos do mês) e fluxo de caixa. **Cadastros:** metas, redes, e-mails e listas. **Backup:** XLSX/CSV em *Cadastros*.

## Regras de cálculo (testadas em `src/lib/lib.test.ts`)

- **Meta:** posts “Postado” na semana ÷ meta do cliente. Verde ≥100%, amarelo 70–99%, vermelho <70%.
- **Interações** = curtidas + comentários + compartilhamentos + salvamentos. **Engajamento** = interações ÷ alcance.
- **Novos seguidores** = seguidores da semana − da semana anterior. Variações comparam com a semana anterior.
- **Veredito** (vs. média histórica da conta cliente+rede): Repetir ≥120%, Adaptar ≤80%, Na média; “Poucos dados” com menos de 3 posts com resultado.
- **Ranking:** por conta na semana (engajamento); relatório usa o ranking do cliente (todas as redes).
- **Financeiro:** Pago, Pago com atraso, Parcial, A vencer, Atrasado; vencimento em dia inexistente → último dia do mês; cliente é INADIMPLENTE se há parcela vencida em aberto.

## Multi-agência (organizações)

Cada tabela de negócio tem `organization_id` e a RLS isola os dados por organização: um usuário só lê/escreve
o que pertence a uma organização da qual é membro (`organization_members`, papéis `owner | admin | colaborador`).

- O **primeiro usuário** criado no Supabase vira `owner` da primeira organização (criada no seed) por um trigger.
- Usuários seguintes **não** entram em nenhuma organização sozinhos: inclua-os em `organization_members`
  (SQL Editor) — ou, mais simples, crie-os pela tela *Usuários*; usuários criados direto no painel do Supabase ficam sem dados.
- **Papéis:** `owner` e `admin` veem tudo, inclusive o **Financeiro**; `colaborador` usa o resto do sistema, mas o
  Financeiro fica bloqueado (menu, página, ações, exportações e, no banco, RLS de `client_finance` e `payments`).
- **Usuários:** em *Usuários* (só owner/admin) cria-se o acesso com e-mail + senha inicial, troca-se papel/senha e remove-se.
  Só o proprietário cria/edita administradores; admin gerencia colaboradores. Exige `SUPABASE_SERVICE_ROLE_KEY` no servidor.
- **Migração obrigatória:** rode `supabase/migrations/20261118000001_papeis_financeiro.sql` no SQL Editor (aplica a RLS do Financeiro).
- Permissões por cliente ainda não existem (previstas para uma migração futura).

## Gestões (módulos) e venda do pacote

O sistema tem três gestões no mesmo pacote: **Redes Sociais** (`social`, rotas na raiz), **Projetos de Software**
(`dev`, rotas em `/dev`: Painel, Projetos com quadro Kanban, marcos de entrega, Minhas tarefas e Horas) e **Financeiro**
(`financeiro`, rotas em `/caixa`: painel de fluxo de caixa, lançamentos de entrada/saída, **Contratos** (mensalidades dos clientes,
que alimentam as entradas e o saldo), contas, categorias e CSV; só proprietário/administrador).
Depois do login, `/modulos` pergunta qual gestão abrir (com uma só liberada, entra direto).

- **Por organização (o que foi vendido):** coluna `organizations.modules` (padrão `{social,dev}`). Para vender só uma gestão:
  `update organizations set modules = array['dev'] where slug = '...';`
- **Por implantação (opcional):** variável `ENABLED_MODULES=social,dev` limita as gestões daquele deploy.
- **Por usuário:** em *Usuários* marca-se quais gestões cada pessoa acessa (sem marcar nada = erro; todas = sem restrição).
  O proprietário sempre acessa tudo que foi contratado. O usuário só vê o que foi liberado, e o banco (RLS, função `has_module`) também impede o acesso.
- **Clientes** têm cadastro global em `/clientes`: cada cliente marca os serviços que usa (Redes Sociais e/ou Projetos) e só
  aparece nas gestões marcadas (`clients.modules`).
- **Migrações:** `20261118000005_modulos.sql`, `20261118000006_dev_projetos.sql` e `20261118000007_financeiro_caixa.sql` e `20261118000008_contratos_no_financeiro.sql`.

## Segurança

Login por e-mail/senha (Supabase Auth, sem cadastro público); `proxy.ts` bloqueia todas as rotas sem sessão, exceto
`/login`, `/setup` (só útil quando faltam as variáveis do Supabase), `/r/<token>` (relatório público, somente leitura,
token aleatório de 192 bits, sem financeiro nem outros clientes) e o cron (segredo próprio).
RLS ligado em todas as tabelas, sempre por organização (veja acima). `/api/dev/report-sample` (pré-visualização do
layout com dados fictícios) exige login e responde 404 em produção.

## Instalar como app

O sistema tem `manifest` (`src/app/manifest.ts`) e ícones em `public/icons/`: no Chrome/Edge use *Instalar app* na barra de endereço; no Android, *Adicionar à tela inicial*; no iPhone (Safari), *Compartilhar → Adicionar à Tela de Início*. Abre em tela cheia em `/modulos`. Não há modo offline.

## Fontes

O relatório usa a fonte **Inter** (licença OFL, em `src/assets/fonts/`).
