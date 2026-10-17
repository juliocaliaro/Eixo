# 0007. Redesenho mobile-first com fundação compartilhada

Status: aceita

## Contexto
Uma auditoria medida (390px e desktop, construtor e cliente) mostrou telas poluídas e incoerentes: CTAs duplicados (Locação, Notas, Modelos), gutters de 10 a 30px, cinco tamanhos de título, cartões dentro de cartões, faixa de abas com 664px de conteúdo em 340px visíveis, popups de busca/filtro abrindo fora da tela (x negativo), modais sem padrão, estados vazios diferentes em cada tela e botões de criar/excluir visíveis ao cliente em Notas.

## Decisão
- **Fundação** (`src/styles/foundation.css`, `PageHeader`, `BottomTabBar`, `EmptyState`, `OverflowMenu`, `SegmentedControl`): tokens de espaçamento, gutter de 16px, uma ação principal por tela, `PageHeader` + toolbar de ícones + conteúdo, estados vazios iguais, badges e botões únicos.
- **Navegação da obra no mobile**: barra de abas inferior com 5 itens no lugar da faixa com rolagem horizontal; nomes de uma palavra.
- **Modais no mobile**: bottom sheets com cabeçalho e rodapé fixos e um único scroll; rolagem da página travada enquanto houver overlay; scrollbar fina.
- **CSS por área** (`obra-etapas-arquivos.css`, `decisoes-diario.css`, `home-auth.css`, `registros-modelos.css`) importado depois do CSS global (ordem fixada em `main.tsx`), para que o CSS de cada tela vença empates sem `!important`.
- O `agents.md` §26 lista, tela por tela, as regras antigas que foram substituídas.

## Consequências
- Rotas e dados não mudaram; é uma mudança de interface.
- O cliente passa a ser somente leitura em Notas e Locação (antes dependia de uma contradição entre seções do `agents.md`).
- O calendário mobile é uma sheet; o desktop continua popover.
- Pendências desta frente estão em `docs/BACKLOG.md` (menu de linha da home, testes em iOS e teclado reais, CSS morto restante).
