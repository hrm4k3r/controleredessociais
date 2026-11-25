# Coleta semanal de métricas — Instagram

Guia de onde pegar cada número no painel profissional do Instagram e em qual campo do Rixxer Hub lançar
(*Redes Sociais → Desempenho → Métricas*). Painel conferido em 24/11/2026; o Instagram muda a interface com frequência,
então revise este documento se algum nome deixar de existir.

## Fechamento mensal (relatório ao cliente)

O relatório enviado ao cliente é **mensal**, fechado a partir do **dia 5** de cada mês (o Google leva 2 a 3 dias
para consolidar o mês). No sistema: *Desempenho → Fechamento mensal* (lançar) e *Relatório mensal* (link público + PNG).

- Lance, para cada rede, os números do **mês inteiro** (Instagram: período personalizado do dia 1 ao último dia;
  Google: o mês fechado). Não some as semanas: o alcance de pessoas diferentes não é somável.
- O Google Meu Negócio é lançado **só no fechamento mensal** (com os campos próprios: chamadas, rotas, site, chat,
  agendamentos). A planilha semanal não mostra mais essa rede.
- A coleta **semanal** do Instagram continua para acompanhamento interno (tendência semana a semana); o print dos
  números em andamento serve para conversar sobre o resultado parcial.
- O relatório tem várias páginas (resumo com gráficos, publicações do mês, uma tabela completa por rede, Google e análise), cada uma baixada como PNG.
- A partir do dia 5 o sistema mostra um lembrete enquanto o mês anterior não tiver números lançados.
- Migração: `20261119000019_fechamento_mensal.sql`.

## Regras da coleta semanal

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

## Facebook (Meta Business Suite → Insights)

Período: o **mês fechado** (ex.: "1 de out de 2026 a 31 de out de 2026"), com a Página selecionada no topo.

| Campo no sistema | Onde pegar no Facebook | Exemplo (out/2026) |
|---|---|---|
| **Seguidores (total)** | Total de seguidores da Página (cabeçalho/perfil da Página). **Não** use o cartão "Seguidores" dos Insights: ele mostra só os ganhos no período | 308 |
| **Visualizações** | Cartão **Visualizações** | 20 |
| **Alcance** | Cartão **Visualizadores** (pessoas diferentes que viram o conteúdo) | 16 |
| **Interações** | Cartão **Interações com o conteúdo** | 0 |
| **Cliques/Visitas** | **Visitas** (à Página) + **Cliques no link** | 18 + 0 = 18 |

Observações:
- Mesma lógica do Instagram: *Visualizadores* é o antigo alcance, e Cliques/Visitas é a soma de visitas ao perfil com os cliques em link.
- O cartão "Seguidores" dos Insights (0 no exemplo) é a variação no período; o sistema calcula os novos seguidores sozinho pela diferença entre os totais de dois meses.

## Pinterest (Analytics → Visão geral)

Período: **Personalizado**, do dia 1 ao último dia do mês fechado (ex.: 01/10/2026 a 31/10/2026), "Tipo de conteúdo: Todos".
As métricas de público atualizam com cerca de 2 dias de atraso (mais um motivo para fechar a partir do dia 5).

| Campo no sistema | Onde pegar no Pinterest | Exemplo (out/2026) |
|---|---|---|
| **Seguidores (total)** | Total de seguidores do perfil (página do perfil ou *Informações do Público*); não aparece na Visão geral | — |
| **Visualizações** | **Impressões** | 3.140 |
| **Alcance** | **Público total** | 1.870 |
| **Interações** | **Engajamentos** | 94 |
| **Cliques/Visitas** | **Cliques de saída** | 1 |

Observações:
- Os cartões mostram números arredondados ("3,14 mil", "1,87 mil"). Para o valor exato, passe o mouse sobre o gráfico ou use *Exportar*; se não der, lance o arredondado (3.140 e 1.870).
- **Pins salvos** (12) e **Público engajado** (79) já estão contidos nos Engajamentos/Público total e não têm campo próprio.

## TikTok (Analytics / TikTok Studio → Métricas principais)

Período: **Personalizado**, do dia 1 ao último dia do mês fechado (ex.: 1 de out a 31 de out).

| Campo no sistema | Onde pegar no TikTok | Exemplo (out/2026) |
|---|---|---|
| **Seguidores (total)** | Cabeçalho do perfil: **Seguidores** | 38 |
| **Visualizações** | **Visualizações de vídeo** | 0 |
| **Alcance** | **Espectadores** (aba de visão geral/público, se existir na conta); se não achar, deixe em branco | em branco |
| **Interações** | **Curtidas + Comentários + Compartilhamentos** (some os três; inclua *Salvos* se o painel mostrar) | 0 |
| **Cliques/Visitas** | **Visualizações de perfil** (+ cliques no link da bio, se o painel mostrar) | 0 |

Observações:
- "Recompensas estimadas" não é métrica de desempenho e não entra no relatório.
- Lance o **0** quando o painel mostra 0 (dado real). Campo em branco significa "não coletado".
- Número zerado não gera percentual de variação no relatório (não existe % sobre zero); aparece só a diferença.

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
| **Seguidores, Alcance e Cliques gerais** | O Google não informa: o sistema não mostra esses campos para o Google | — |
| **Visualizações** | *Visão geral* → "Como as pessoas descobriram sua empresa": **número de pessoas que visualizaram o Perfil da Empresa** (soma Pesquisa + Maps, celular + computador) | 112 |
| **Interações** | *Visão geral* → **Interações no Perfil da Empresa** (já soma chamadas, chat, agendamentos, rotas e site) | 32 |

Logo abaixo da linha do Google, na tela *Fechamento mensal*, ficam os campos próprios:

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
