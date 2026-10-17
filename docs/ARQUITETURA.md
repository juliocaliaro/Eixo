# Arquitetura do Eixo

Guia para quem vai trabalhar neste projeto. Complementa o `agents.md` (regras de produto e design, vinculantes) e o `GLOSSARY.md` (linguagem do domínio). As decisões que mudaram o rumo do código estão em `docs/adr/`; o que ficou pendente está em `docs/BACKLOG.md`.

## Princípios que não se negociam

1. **O banco é a única fonte da verdade.** Supabase (PostgreSQL) + Storage + Auth. Não existe cache local, modo offline nem modo demo. Nenhum código de aplicação usa `localStorage` ou `sessionStorage` (o teste `src/test/noLocalStorage.test.ts` falha se alguém reintroduzir). O único armazenamento no navegador é o que o próprio `supabase-js` mantém para a sessão de login.
2. **Sem Supabase configurado, o app não sobe.** Falta de `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` mostra `ConfigErrorScreen`. Isso é intencional: um fallback silencioso esconde falhas e vazamentos.
3. **Erros nunca são engolidos.** Falha de leitura ou escrita vira erro tipado, aparece para o usuário em português simples e o detalhe técnico (tabela, código) vai só para o console.
4. **Regra de negócio vive em módulos puros e testáveis**, não dentro de componentes React. Componentes cuidam de estado de tela, toasts, modais e JSX.
5. **A RLS é a barreira de segurança.** Filtros no cliente são conveniência, nunca proteção.

## Mapa do código

```
src/
  App.tsx                    composição: sessão, obras, rota, modais globais
  hooks/
    useSession.tsx           sessão (status, usuário, recuperação de senha)
    useObras.ts              estado das obras sobre o ObraStore
    useRouteState.ts         URL <-> estado (push/replace, popstate)
    useEscapeKey.ts          Escape para o overlay do topo (usa overlayStack)
    useIsMobile.ts           breakpoint único (768px)
    usePopoverDismiss.ts     fechar popover: clique fora + Escape
    useToggleMap.ts          estado dos accordions mobile
  services/
    supabaseClient.ts        cliente Supabase (só a chave anon)
    session.ts               monta o SessionUser (papel vem de profiles.role)
    obraStore.ts             ObraStore: load/save por diff (ver ADR 0002)
    obraRows.ts              achata Obra[] em linhas por tabela, diff, remonta
    obraAccess.ts            regra única de visibilidade do cliente
    dbTypes.ts               tipos de linha + map*FromDb / to*Row
    supabaseWrite.ts         upsert com retry sem coluna ausente (PGRST204/42703)
    storageApi.ts            upload para Storage (lança erro, sem null)
    assets.ts                converte data URL de fotos em arquivos do Storage
    api.ts                   APIs por entidade (decisões, locações, notas, auth...)
    repositories/
      supabaseObraRepository.ts   adapter de produção
      inMemoryObraRepository.ts   adapter de teste
  utils/
    obraMetrics.ts           progresso, totais de aditivo/supressivo, mensagem WhatsApp
    obraTransitions.ts       transições puras: tarefa, etapa, decisão, prazo, anexos
    diarioExtrato.ts         monta/filtra/agrupa o extrato do Diário
    locacao.ts               status de vencimento, KPIs, renovação, devolução
    fileIntake.ts            normalizar (comprimir) e armazenar arquivos
    routeState.ts            parse/serialize da URL, abas padrão, perfil efetivo
    prazoDecisao.ts          exclusão mútua e nova data prevista da decisão
    emailsCliente.ts         normalização/validação de e-mails de cliente
    mensagensErro.ts         erro técnico -> mensagem em português
    overlayStack.ts          pilha de overlays (Escape fecha só o do topo)
    senha.ts                 política de senha e mensagens
supabase/
  schema.sql                 estado final para instalação nova
  migrations/                alterações para bancos existentes, em ordem
```

## Fluxo de dados

```
Componente -> setObras(fn)  -> useObras -> ObraStore.save(next)
                                              | diff contra o último snapshot salvo
                                              v
                                      ObraRepository.apply(changes)
                                        - supabaseObraRepository (produção)
                                        - inMemoryObraRepository (testes)
```

- `ObraStore.load(identity)` lê as linhas, aplica a regra de acesso e monta `Obra[]`.
- `ObraStore.save(next)` compara o estado novo com o último salvo, grava só o que mudou e remove o que sumiu. Saves são serializados e coalescidos. Falha vira `ObraStoreError` (`load-failed`, `save-failed`, `not-loaded`, `forbidden`) e o App recarrega do servidor.
- O cliente só pode escrever `decisoes` e `decisao_assinaturas`; qualquer outra mudança vira `forbidden` já no store (a RLS repete a regra no banco).
- Fotos entram no estado como data URL (otimista) e `assets.ts` as sobe para o Storage na hora de salvar. Uploads feitos direto pelos modais usam `fileIntake.ts`.

## Como adicionar uma funcionalidade

1. **Tabela ou coluna nova:** escreva a migration em `supabase/migrations/<timestamp>_nome.sql` (idempotente) e reflita o estado final em `schema.sql`. Inclua RLS usando `private.can_access_obra` / `private.can_write_obra`.
2. **Tipos:** atualize `src/types/obra.ts`, os tipos de linha e os mapeadores `map*FromDb` / `to*Row` em `dbTypes.ts`. Existe teste de ida e volta em `src/test/dbMappers.test.ts`: estenda-o.
3. **Entidade nova dentro da obra:** inclua a tabela em `obraRows.ts` (tabelas, pai e chave natural) para o diff enxergá-la.
4. **Regra de negócio:** funções puras em `src/utils/` com `now`/`hoje` como parâmetro. Nada de `new Date()` escondido nem `toISOString()` para "hoje" (use o dia local, ver `locacao.hojeLocal`).
5. **Componente:** só estado de tela. Para fechar com Escape use `useEscapeKey`; para breakpoint, `useIsMobile`; para foto, `useFileIntake`/`fileIntake`; para lightbox, `Lightbox`/`GalleryLightbox`.
6. **Teste:** em `src/test/`. O ambiente do vitest é `node`; teste a lógica pura e use `inMemoryObraRepository` para persistência.

## Perfis e permissões

- O papel (`construtor` ou `cliente`) vem de `profiles.role`, protegido por trigger no banco: o usuário não consegue alterá-lo. Sem perfil carregado, o papel cai para `cliente`.
- `?perfil=` na URL é só preferência de visualização. `resolvePerfil(papelDaConta, perfilDaUrl)` garante que conta cliente é sempre cliente e que o construtor pode usar `?perfil=cliente` apenas como pré-visualização.
- O cliente enxerga uma obra se o e-mail confirmado da sessão estiver em `emails_clientes`/`cliente_email`, ou se for o `cliente_id`. O construtor mantém a lista de acesso na aba Compartilhar da obra (e-mails salvos na hora em `emails_clientes`, com `cliente_email` = primeiro da lista). Os e-mails podem ser informados já na criação da obra (campo opcional) e depois são gerenciados só na aba Compartilhar; a edição da obra não tem esse campo.
- Decisões: só a contraparte de quem propôs pode aprovar ou recusar; valores, prazo e texto não mudam depois de criados (trigger no banco).

## Banco de dados e migrations

Ordem para um banco existente:

1. `20261017120000_eixo_banco_fonte_unica.sql`: colunas novas (`ambientes`, `ambiente`, `ordem`, `quantidade`, `periodo`), migra as linhas `__AMBIENTE__:`, remove duplicatas de evidências e assinaturas, cascatas, triggers de `updated_at`, templates por usuário, RLS conforme a seção 23 do `agents.md`.
2. `20261017130000_eixo_hardening_rls.sql`: schema `private` com helpers `SECURITY DEFINER`, todas as policies `TO authenticated` com `(select auth.uid())`, integridade das decisões por trigger, trava de `profiles.role`/`email`, `handle_new_user` endurecido, índices, checks, policies de `storage.objects` por pasta de obra.

Depois de aplicar a 2ª, rode no SQL Editor `SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects';` e remova qualquer policy permissiva antiga: policies do mesmo comando se somam com OR e uma antiga anula as novas.

`schema.sql` é só para instalação nova. Nunca rode em banco existente.

## Rodando e testando

- `npm run dev` precisa de `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (veja `.env.example`).
- `npm run build` (tsc + vite) e `npm test` (vitest) devem passar antes de qualquer PR.
- O build separa `vendor-react`, `vendor-supabase` e `vendor-phosphor` (`vite.config.ts`). Não importe o `supabase-js` em código que roda antes do primeiro render sem necessidade.
- Para inspecionar telas sem um projeto Supabase real, a revisão visual desta refatoração usou um backend Supabase falso descartável (GoTrue + PostgREST + Storage em memória). Ele não está no repositório; se for útil, vale versioná-lo em `tools/`.

## Convenções de trabalho

- Ajustes são feitos por subagentes em `git worktree` isolados e integrados depois (regra do `agents.md`). Nunca faça `git commit`/`git push` sem pedido explícito do usuário.
- Interface em português do Brasil, sem emojis (ícones Phosphor), sem `window.alert/confirm` (use `ModalConfirm`).
- O desktop (>768px) não muda por causa de ajustes mobile.
- Z-index e escala de fonte usam tokens de `:root` (`--z-nav`, `--z-popover`, `--z-modal`, `--z-toast`, `--z-lightbox`, `--z-drawer`, `--z-top`; `--fs-xs` a `--fs-xl`). Não use números soltos.
- Empilhamento: nav < popover < modal < confirmação/preview < toast < lightbox < drawer < relatório.

## Interface: fundação mobile-first

Detalhes em `docs/design/PADROES-MOBILE.md` e `docs/adr/0007-redesenho-mobile-first.md`.

- **CSS**: `src/index.css` (legado e tokens), `src/styles/foundation.css` (espaçamento, `.page`, `.toolbar`, `.badge--*`, `.list-row`, `.empty-state`, bottom sheet, `.bottom-tab-bar`, scrollbar fina) e um arquivo por área (`obra-etapas-arquivos.css`, `decisoes-diario.css`, `home-auth.css`, `registros-modelos.css`). A ordem de importação em `main.tsx` é parte do contrato: CSS global primeiro, CSS dos componentes depois.
- **Componentes compartilhados**: `PageHeader`, `BottomTabBar`, `EmptyState`, `OverflowMenu`, `SegmentedControl`, `Lightbox`/`GalleryLightbox`, `UploadArquivos`, `EmailChipsInput`.
- **Comportamento**: `bodyScrollLock` (rolagem da página travada com overlay aberto, ligado à `overlayStack`), `sheetFocus` (campo focado vai para o centro do sheet), `useKeyboardOpen` (a barra de abas some com o teclado aberto).
- **Regras de tela**: uma ação principal por tela, estados vazios via `EmptyState`, cliente somente leitura fora de Decisões e da própria aba Compartilhar sem lista de e-mails. A lista tela a tela está em `agents.md` §26.
