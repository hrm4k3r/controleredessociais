# Coleta semanal de métricas — Instagram

Guia de onde pegar cada número no painel profissional do Instagram e em qual campo do Rixxer Hub lançar
(*Redes Sociais → Desempenho → Métricas*). Painel conferido em 24/11/2026; o Instagram muda a interface com frequência,
então revise este documento se algum nome deixar de existir.

## Regras da coleta

- **Quando:** todo domingo (fim da semana de segunda a domingo).
- **Período:** sempre **Últimos 7 dias** no seletor do painel (o padrão do app pode vir em 30 dias).
- **Hora da coleta:** o sistema registra a hora em "Dados coletados em"; use o botão *Agora* ao lançar.
- **Mesma fonte sempre:** no marco inicial e em todas as semanas, use os mesmos números abaixo. Misturar fontes
  ou períodos distorce o antes × depois.
- **Campo sem número disponível:** deixe em branco (o relatório mostra "—").

## Onde pegar cada número

| Campo no sistema | Onde pegar no painel do Instagram | Observação |
|---|---|---|
| **Seguidores (total)** | Aba **Público** → Seguidores | Total atual de seguidores. |
| **Novos seguidores** | — (calculado) | O sistema calcula pela diferença do total da semana anterior; não digitar. |
| **Visualizações** | Aba **Desempenho** → cartão **Visualizações** | Soma de visualizações de posts, stories, reels e vídeos ao vivo. |
| **Alcance** | Aba **Desempenho** → cartão **Visualizadores** | O antigo "alcance": contas diferentes que viram o conteúdo. |
| **Interações** | Aba **Desempenho** → *Interações por tipo de conteúdo*, filtro **Tudo** | Total (curtidas, comentários, compartilhamentos, salvamentos). |
| **Cliques/Visitas** | Aba **Desempenho** → *Atividade do perfil*: **Visitas ao perfil** + **Toques no link da bio** | Lançar a **soma** dos dois. |

Outras abas úteis, sem campo no sistema por enquanto: **Conteúdo** (desempenho de cada post/story, útil para
preencher o aprendizado da semana) e **Público** (idade, cidade e gênero, só com 100 ou mais seguidores).

## Exemplo (conta com 1 semana, 24/11/2026)

| Campo | Valor |
|---|---|
| Seguidores (total) | 2 |
| Visualizações | 28 |
| Alcance (Visualizadores) | 4 |
| Interações | 4 |
| Cliques/Visitas (4 visitas + 0 toques) | 4 |

## Google Meu Negócio (dado mensal)

O painel do Google só informa números **por mês**, então essa rede não entra na rotina de domingo:

- **Quando lançar:** uma vez por mês, depois que o mês fecha (a partir do dia 1º ou 2), com o número do **mês fechado**.
  O lançamento fica na semana em que você o digitar, com a hora da coleta.
- **No sistema:** na tela *Métricas* a linha do Google traz o aviso "Dado mensal". A variação é contra o **lançamento
  anterior** ("vs mês ant."), não contra a semana anterior. Os números do Google **não entram nos totais semanais**
  do painel e do relatório (o Instagram e as demais continuam semanais); no relatório a rede aparece marcada "mês".
- **Marco inicial e Evolução:** vale o último mês fechado como "antes", comparado com os meses seguintes.

### Onde pegar cada número (painel *Desempenho* do Perfil da Empresa)

Período: o **mês fechado** (ex.: "out. de 2026 – out. de 2026"). Todos os números vêm da mesma tela.

| Campo no sistema | Onde pegar no Google | Exemplo (out/2026) |
|---|---|---|
| **Seguidores (total)** | — (o Google não tem seguidores) | em branco |
| **Visualizações** | *Visão geral* → "Como as pessoas descobriram sua empresa": **número de pessoas que visualizaram o Perfil da Empresa** (soma Pesquisa + Maps, celular + computador) | 112 |
| **Alcance** | o mesmo número acima (o Google chama de "pessoas") | 112 |
| **Interações** | *Visão geral* → **Interações no Perfil da Empresa** (já soma chamadas, chat, agendamentos, rotas e site) | 32 |
| **Cliques/Visitas** | aba **Cliques no website** | 0 |

Logo abaixo da linha do Google, na tela *Métricas*, há campos próprios (migração `20261119000018_google_metricas.sql`):

| Campo | Onde pegar |
|---|---|
| **Chamadas** | aba *Chamadas* (ex.: 6) |
| **Rotas** | aba *Orientações* (ex.: 26) |
| **Cliques no site** | aba *Cliques no website* (ex.: 0) |
| **Cliques no chat** | aba *Cliques no chat* (ex.: 0) |
| **Agendamentos** | aba *Agendamentos* (ex.: 0) |

Eles também saem na exportação CSV. O campo *Aprendizado* fica livre para o que você quiser anotar (pesquisas mais comuns, divisão Pesquisa × Maps).

Observações:
- O Google mostra "< 15" nos termos de pesquisa de baixo volume; é normal.
- Como "Interações" já inclui os cliques no website, não some os cliques de novo.

## Futuro: coleta automática pela API da Meta

Objetivo: preencher esses campos sem digitação, a partir da API do Instagram (Graph API, com insights de conta
profissional). Mapeamento pretendido (**confirmar os nomes exatos na documentação oficial da Meta no momento de
implementar**, pois métricas são renomeadas e descontinuadas):

| Campo no sistema | Métrica provável na API |
|---|---|
| Seguidores (total) | `followers_count` (campo da conta) |
| Visualizações | `views` |
| Alcance | `reach` |
| Interações | `total_interactions` |
| Cliques/Visitas | `profile_views` + `profile_links_taps` |

(Google Meu Negócio: a *Business Profile Performance API* traz as mesmas métricas do painel — impressões de pesquisa e Maps, chamadas, rotas, cliques no site, chat e agendamentos — por dia/mês; conferir nomes na documentação.)

Pontos a resolver na implementação:
- **Autorização:** app Meta com permissão de insights, conta Instagram profissional ligada a uma Página do Facebook,
  e o cliente autorizando o acesso (token de longa duração, renovado antes de expirar).
- **Janela de 7 dias:** pedir sempre o mesmo intervalo (segunda a domingo) para manter a comparabilidade.
- **Hora da coleta:** gravar o instante real da consulta em `collected_at`.
- **Marcar a origem** (manual × automática) e manter o lançamento manual como alternativa quando a API falhar.
- **Segredos:** tokens guardados no servidor (nunca no navegador); coleta pelo cron já existente.
