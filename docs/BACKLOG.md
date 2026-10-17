# Pendências conhecidas

Itens identificados durante a refatoração "banco como fonte única" que ficaram fora do escopo, em ordem de prioridade.

## Segurança

1. **Link público de upload de projetos** (`?upload=projeto&obra=<id>`): hoje carrega só o UUID da obra, sem token, expiração nem revogação, e a página exige login porque a RLS não permite leitura anônima. Proposta: tabela `upload_tokens(token_hash, obra_id, expires_at, max_uses, revoked)`, RPC ou Edge Function que valida o token, emite URL de upload assinada limitada a `<obra>/projetos/` e insere a linha em `projetos_pdf` com `enviado_por='externo'` no servidor. Depois remover qualquer policy anônima de storage.
2. **Buckets privados com signed URLs.** O código usa `getPublicUrl` em tudo e grava URLs no banco. Notas fiscais e projetos são confidenciais. Passo: gravar `storage_path`, servir com `createSignedUrls`, tornar os três buckets privados (as policies de `storage.objects` já existem na migration de hardening) e remover o fallback de `registro-notas` para o bucket público.
3. **Papel na criação da conta.** O papel é escolhido no cadastro (`user_metadata.role`, validado por whitelist no trigger). Restringir quem vira construtor exige convite ou aprovação.
4. **Configurações de Auth do projeto** (fora do repositório): confirmar e-mail, senha mínima de 8, proteção contra senha vazada, rate limit e CAPTCHA no cadastro e na recuperação. O `agents.md` ainda cita mínimo de 6 na seção 19; a regra real é 8 com maiúscula, minúscula, número e símbolo.
5. `profiles.email` não acompanha mudança de e-mail em `auth.users` (falta trigger de sincronização).

## Dados

- Decisões pendentes registradas antes da regra de prazo nunca tiveram `dataPrevista` ajustada; recusar uma delas agora subtrai dias que nunca foram somados. Conferir e corrigir pontualmente: `SELECT id, obra_id FROM decisoes WHERE status='pendente' AND impacto_prazo_dias <> 0`.
- Tarefas em andamento não têm timestamp próprio; o Diário as ordena pela data de criação da obra. Um campo `iniciadaEm` resolveria.

## Código

- **Módulo de perfil e permissões:** `perfilAtivo ===` aparece em cerca de 40 pontos de 10 arquivos, misturando permissão, identidade (nome do assinante) e rótulo. Um módulo único com capacidades e um contexto no lugar do prop-drilling reduziria isso.
- **Carga inicial:** `React.lazy` para `ObraDetail` e `LoginPage` reduziria o JS inicial (hoje cerca de 990 kB não comprimidos, divididos em quatro arquivos).
- **Carregamento da lista:** o repositório faz várias consultas por obra. Selects embutidos (`obras(*, etapas(*, tarefas(*)))`) ou uma RPC `get_obra_full` reduziriam o número de requisições. Falta paginação.
- **Tipos do banco:** gerar com `supabase gen types typescript` em vez de manter `dbTypes.ts` à mão e usar `createClient<Database>`.
- `decisoesApi.create` usa `insert` simples: repetir a mesma decisão falha por chave duplicada. `evidenciasApi.deleteFoto` apaga por `tarefa_id` + `conteudo`, então fotos idênticas da mesma tarefa somem juntas.
- Fallback duplo de bucket em `fileIntake.storeNormalized` e `storageApi.uploadBlob`; o `if (url)` em `fileIntake` ficou morto porque o upload agora lança erro.
- `ModalAddMedia` e `ModalCreateDecisao` ainda devolvem data URL aos callbacks e dependem de `assets.ts` para subir ao salvar; mover o upload para dentro deles exigiria passar `obraId` até os modais.
- Mensagem de WhatsApp (`obraMetrics.montarMensagemWhatsApp`) ainda contém emojis, mantidos para preservar o texto enviado a clientes. O `agents.md` proíbe emojis na interface; decidir se vale para texto enviado.
- Realtime: não há `postgres_changes`; o contador de notificações só atualiza ao recarregar. Considerar assinatura de `decisoes` por obra.

## Interface (achados da revisão visual não tratados)

- Modais sem `role="dialog"`/`aria-modal` e sem trava de scroll do `body`.
- Cabeçalhos e botões "voltar" diferentes em Notas, Locação e Modelos ("Todas as Obras", "Voltar", "Voltar para Obras") e margens laterais diferentes.
- Barras de ação diferem entre abas (Arquivos, Diário, Decisões), principalmente no mobile.
- Controle segmentado com dois tons escuros (Login vs Configurações/Modelos).
- `<select>` nativos com altura e fonte diferentes dos inputs.
- Tira de abas no mobile com barra de rolagem visível e sem indício de continuação; dropdown de notificações sem margem lateral no mobile.
- Alvos de toque abaixo de 44px (ícones do header 40px, checkboxes, células do calendário ~36px).
- Painel financeiro: o tile "Investimento Atualizado" em coral lembra erro.
- A fonte tem 40 tamanhos distintos e 547 cores hexadecimais soltas nos TSX; migrar gradualmente para os tokens `--fs-*` e para variáveis de cor. Mais de dois terços dos estilos são inline, o que impede regras `:hover`/`:focus-visible` e mobile em CSS.
- Verificar com teclado real (o QA usou navegador embutido, onde `:focus-visible` não dispara) e com ponteiro de toque real a ampliação das áreas de 44px.

## Redesenho mobile (pendências)

- A lista de obras (`ObraList`) ainda tem seu próprio menu de linha (sheet no mobile com "Copiar endereço"); unificar com `OverflowMenu` exige um toast de "Endereço copiado".
- Testar em dispositivos reais: teclado virtual aberto em sheets, iOS Safari (se `overflow: hidden` na raiz basta para travar a rolagem; o plano B `position: fixed` está em `PADROES-MOBILE.md`), áreas de toque de 44px com ponteiro `coarse`, Firefox.
- `useIsMobile` só escuta `resize`; ferramentas que emulam viewport sem disparar o evento precisam recarregar a página.
- Home vazia (construtor e cliente) e prévia do relatório foram vistas só no código, não no navegador.
- Em Arquivos, a variante "filtrado" mostra "Limpar filtros" logo abaixo da faixa de chips que já tem "Limpar tudo" (possível duplicado).
- CSS morto restante em `index.css` (`.hero-*`, `.wizard-step*`, `.skeleton-shimmer`, `.decisao-card-mobile*`): `designAndResponsive.test.ts` lê o arquivo e depende de poucas classes; limpar junto com esse teste.
- Calendário dentro do modal de obra no desktop ainda abre para cima cobrindo campos quando não há espaço abaixo.
- Arrastar para reordenar não existe em Modelos (só o modo Reordenar com setas).
