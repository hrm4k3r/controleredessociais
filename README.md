# Controle de Redes Sociais

Sistema web interno (acesso restrito, com senha) para controlar as redes sociais dos clientes da agência:
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
- **Domingo:** *Métricas* (seguidores, visualizações, alcance, interações, cliques por conta) e *Resultados* (números de cada post por rede).
- **Segunda:** *Painel* (meta × feito, variação) e *Relatório* (comentário, próximos passos, PNG, link e envio).
- **Tarefas:** quadro Kanban semanal (A fazer / Em andamento / Em revisão / Concluído) para organizar as postagens a criar; arraste os cartões, filtre por cliente e leve os pendentes para a próxima semana. Ao concluir, o cartão vira um post "Planejado" (se tiver cliente; uma vez só). Exige as migrações `20261118000002_tarefas.sql` e `20261118000003_tarefas_post.sql`.
- **Financeiro:** valor/vencimento por cliente e pagamentos do mês. **Cadastros:** metas, redes, e-mails e listas. **Backup:** XLSX/CSV em *Cadastros*.

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

## Segurança

Login por e-mail/senha (Supabase Auth, sem cadastro público); `proxy.ts` bloqueia todas as rotas sem sessão, exceto
`/login`, `/setup` (só útil quando faltam as variáveis do Supabase), `/r/<token>` (relatório público, somente leitura,
token aleatório de 192 bits, sem financeiro nem outros clientes) e o cron (segredo próprio).
RLS ligado em todas as tabelas, sempre por organização (veja acima). `/api/dev/report-sample` (pré-visualização do
layout com dados fictícios) exige login e responde 404 em produção.

## Fontes

O relatório usa a fonte **Inter** (licença OFL, em `src/assets/fonts/`).
