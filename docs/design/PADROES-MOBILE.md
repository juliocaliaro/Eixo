# Padrões de UI mobile-first do Eixo

Referência da fundação. Código: `src/styles/foundation.css` (carregado depois de `index.css`), `src/components/PageHeader.tsx`, `src/components/BottomTabBar.tsx`, `src/hooks/useKeyboardOpen.ts`, `src/utils/scrollLock.ts`, `src/utils/bodyScrollLock.ts`, `src/utils/sheetFocus.ts`. Mobile = viewport <= 768px (projetar em 390px). Desktop não muda.

## Tokens
- Espaçamento: `--space-1..8` = 4, 8, 12, 16, 24, 32, 40, 48 px.
- Gutter lateral: `--gutter` = 24px desktop, 16px mobile, 12px a <= 360px (já aplicado em `.main-content`).
- Ritmo: header -> toolbar 12 (`--space-3`), toolbar -> conteúdo 16 (`--space-4`), seção -> seção 24 (`--space-5`).
- Z-index: `--z-bottom-bar` (45) fica acima do conteúdo e do navbar (40), abaixo de popover (60), modal (100) e toast (150).
- Barra de rolagem: `--scrollbar-size` (6px), `--scrollbar-thumb`, `--scrollbar-thumb-hover`.
- Tipografia mobile: corpo >= 14px, secundário 13px, piso 12px (`--fs-*` em `index.css`).

## Blocos reutilizáveis
- `.page` (coluna com gap 24; `.page > .page-header` e `.page > .toolbar` já ajustam o ritmo) e `.section` (gap 12) + `.section-title`.
- `<PageHeader backLabel onBack title actions />`: voltar + título + slot de ação. No máximo UMA ação primária ou ícones `.btn-icon` com `aria-label` (44px no mobile). Omita `title` quando a tela já mostra o título logo abaixo (caso de `ObraHeader`).
- `.toolbar`: uma linha, ícones `.btn-icon` à direita (`.toolbar-lead` à esquerda, opcional). Ponto de estado: `<span class="dot">` dentro do botão. Popover: `.toolbar-popover` com botões `.option` (`aria-checked`), posicionado sob a toolbar (mesmo padrão de Diário/Projetos).
- `.badge` + `.badge--neutral|ok|warn|info|accent`: 22px de altura, 12px, igual em todas as telas.
- Botões: `.btn-primary`, `.btn-secondary`, `.btn-quiet` (texto discreto), `.btn-icon`; modificadores `.btn--sm` e `.btn--block`. Mobile: mínimo 44px. Use `.touch-target-44` quando o visual precisa ficar menor.
- `.list-row` (+ `.list-row-main`, `.list-row-title`, `.list-row-sub`, `.list-row-end`): linha hairline, sem cartão aninhado.
- `<EmptyState icon title hint? action? variant />` (`src/components/EmptyState.tsx`, classe `.empty-state`): ÚNICO estado vazio do app, ver a seção "Estados vazios".
- `<OverflowMenu label items />`: ÚNICO menu "⋯" (obra, arquivos, notas, locações, modelos). Painel `position: fixed` calculado a partir do botão, sempre dentro da viewport, vira para cima quando não cabe; itens `{ key, label, icon?, onSelect | href, danger?, disabled?, hidden? }`. Botão 36px no desktop e 44px no mobile. Não crie outro menu de linha.
- `.loading-line`: barra fina indeterminada.

## Estados vazios (EmptyState)
Bloco centrado, sem cartão nem borda: ícone Phosphor 48px (peso regular, tom neutro), título 15px/600 (máx. 280px), dica opcional 13px, no máximo UMA ação. Mesmo respiro em toda tela (`padding-top: --space-8`; dentro de uma seção que já tem título, como vistoria, notas por obra e modelos, use `className="empty-state--nested"`).
- `first-use`: ícone + uma frase. Só leva botão quando a tela NÃO mostra essa ação no cabeçalho e o perfil pode executá-la. Como todas as telas de obra, Notas, Locação, Modelos e a Home têm a ação primária no cabeçalho, hoje nenhuma tem botão. O cliente lê uma frase de acompanhamento ("Ainda não há etapas nesta obra.").
- `filtered`: título "Nenhum(a) X neste filtro/período/busca." + ação discreta "Limpar filtros" ou "Limpar busca".
- Frase em português simples, caixa de frase, voz ativa, diz o que falta. Textos: Home "Você ainda não tem obras." (cliente: "Nenhuma obra foi compartilhada com você ainda."); Etapas "Nenhuma etapa criada."; Arquivos "Nenhum projeto anexado."; Decisões "Nenhuma decisão registrada."; Diário "Nenhum registro ainda."; Compartilhar "Nenhum e-mail com acesso ainda." + dica; Notas "Nenhuma nota registrada."; Locação "Nenhuma locação registrada."; Modelos "Nenhum modelo criado."; Notificações "Nada pendente por enquanto.".
- Ícones por domínio: Buildings (obras), ListChecks (etapas, serviços, modelos), Files (arquivos), Scales (decisões), BookOpen (diário), ShareNetwork (compartilhar), Receipt (notas), Wrench (locação), Key (vistoria), CheckCircle (notificações), Images/NotePencil (fotos/anotações da tarefa).

## Cabeçalho das abas da obra
As cinco abas têm nome de uma palavra (Etapas, Arquivos, Decisões, Diário, Compartilhar) e o H2 fica na mesma posição (com ou sem botão, inclusive para o cliente). A ação primária da aba usa `.tab-cta` (40px no desktop, 44px no mobile, texto `--fs-base`, ícone 16px). `.page > .page-header + .toolbar` não soma margens negativas (header -12 e toolbar 0 deixam 12px).

## BottomTabBar (abas da obra no mobile)
`<BottomTabBar items active onSelect ariaLabel />`, itens `{ key, label, icon, dot?, hint? }`. Usada por `ObraDetail` apenas quando `useIsMobile()`; a faixa de topo (`.tabs-nav.tabs-nav--desktop`) some no mobile por CSS e continua no desktop. Ordem por perfil conforme agents.md seção 5. Comportamento:
- Fixa embaixo, altura mínima 56px + `env(safe-area-inset-bottom)`; colunas `minmax(max-content, 1fr)` (cabe "Compartilhar" a 320px com 11px).
- Ativa: coral-glow-600 + indicador de 2px no topo, `aria-current="page"`. Bolinha em Decisões quando há assinaturas pendentes.
- Esconde (translateY) enquanto o teclado virtual está aberto (`useKeyboardOpen`: campo de texto focado ou visualViewport encolhido > 150px).
- A página que a usa recebe a classe `.has-bottom-bar` (padding inferior = barra + safe area + 16).

## Bottom sheet (modais no mobile)
Sem mudar o markup: `.modal-backdrop > .modal-card > (.modal-header, .modal-body, .modal-footer)`. Em <= 768px o CSS faz: sobe de baixo, `max-height: calc(var(--vvh, 100dvh) - 16px)` (`--vvh` = visualViewport, definido em `App.tsx`), cantos superiores arredondados, cabeçalho fixo com fechar de 44px, UM único scroll (`.modal-body`), rodapé fixo com o primário em largura total (48px) e o secundário (`.btn-secondary`) como texto discreto abaixo, safe area. `sheetFocus.ts` leva o campo focado ao centro do corpo. `.modal-card--task` = ModalTaskDetails: 640x560 no desktop, altura total no mobile.
Regras para modais novos: use as classes; não ponha `padding`, `width`, `display` ou `overflow` inline em card/header/body/footer; mantenha `useEscapeKey` e o backdrop guard.

## Barra de rolagem
Uma única barra fina e translúcida (tons dark-coffee) em toda a aplicação: `::-webkit-scrollbar` (Chrome/Safari/Edge) e `scrollbar-width/color` (Firefox, via `@supports not selector(::-webkit-scrollbar)` porque no Chrome essas propriedades anulariam o estilo webkit). Sem setas, trilho transparente, canto transparente. Containers que escondem a barra de propósito (`.login-card-body`) continuam escondidos (regra mais específica). Em `pointer: coarse` a barra fica oculta dentro de sheets.

## Bloqueio de rolagem da página
Enquanto houver qualquer overlay na `overlayStack` (modal, sheet, lightbox, gaveta, calendário) a raiz recebe `overflow: hidden` e `padding-right` igual à largura da barra de rolagem, sem salto de layout; ao esvaziar a pilha tudo é restaurado. Funciona com overlays aninhados (confirmação sobre modal) e desmontagem, porque quem manda é o tamanho da pilha (`overlayStack.subscribe`). Lógica pura em `scrollLock.ts` (testes em `src/test/scrollLock.test.ts`); ligação com o DOM em `bodyScrollLock.ts` (chamada em `main.tsx`). `.modal-body` usa `overscroll-behavior: contain`. Todo overlay novo deve usar `useEscapeKey(..., isOpen)` para entrar na pilha. Se o iOS ainda rolar o fundo, o próximo passo é a técnica `position: fixed` guardando `scrollY`.

## Como migrar uma tela
1. Raiz da tela: `.page` (ou `.has-bottom-bar` se for conteúdo da obra); remova margens soltas e use os `--space-*`.
2. Topo: `<PageHeader>` com voltar + título + no máximo uma ação.
3. Uma toolbar de ícones (busca, filtro) com popover; nada de chips horizontais nem barra de busca inline.
4. Uma ação principal por tela; nunca a mesma ação duas vezes (botão no header E no estado vazio, por exemplo). Secundárias viram ícone com `aria-label` ou menu.
5. Troque cartões aninhados por `.list-row`; vazio por `.empty-state`; carregando por `.loading-line`.
6. Status por `.badge--*`; botões com texto que diz o que fazem, frase com inicial maiúscula.
7. Modais: classes padrão, sem estilos inline de layout; rodapé com primário + secundário.
8. Texto >= 14px (secundário 13, piso 12), alvos >= 44px, no máximo dois pesos por bloco.
9. Teste em 390 e 320 (sem rolagem horizontal), com teclado aberto e no desktop (inalterado).
