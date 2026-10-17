# 0004. Regras de negócio em módulos puros

Status: aceita

## Contexto
Progresso (%) aparecia em 7 lugares, totais de aditivo/supressivo em 5 com semânticas diferentes (`||` vs `!== undefined` vs `> 0`), as transições de tarefa/decisão estavam em handlers do `ObraDetail` e os testes reimplementavam a lógica em vez de importá-la. A regra de prazo do `agents.md` (seção 4) não estava implementada: `somarDiasData` não era chamada.

## Decisão
Módulos puros em `src/utils/`, com a data de referência como parâmetro:
- `obraMetrics`: progresso, impacto e totais financeiros, mensagem de WhatsApp. Decisão tem aditivo OU supressivo; valor 0 conta como ausente e o `impactoFinanceiro` legado só vale quando nenhum dos dois campos é positivo; só `aprovada` entra nos totais; supressivo é sempre magnitude positiva.
- `obraTransitions`: tarefa, etapa, decisão, anexos, projetos, agrupamentos. `proporDecisao` aplica `impactoPrazoDias` a `dataPrevista` uma vez; `recusarDecisao` desfaz uma vez (só de `pendente`); aprovar mantém. É idempotente pelo `status` da decisão.
- `diarioExtrato`: registro sem data usa a criação da obra, ou o grupo "Data não registrada"; agrupa por dia local.
- `locacao`: status por data local (corrige o erro de UTC depois das 21h), KPIs, renovação, devolução.
Componentes só renderizam e chamam esses módulos.

## Consequências
Os testes agora cobrem o código de produção. Dados antigos: decisões pendentes anteriores à regra de prazo nunca somaram dias (ver `docs/BACKLOG.md`).
