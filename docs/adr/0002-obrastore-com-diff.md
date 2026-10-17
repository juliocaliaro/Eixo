# 0002. Persistência da obra por ObraStore com diff e dois adapters

Status: aceita

## Contexto
`obrasApi.saveAll` reenviava o estado inteiro a cada mudança (centenas de upserts), derivava ids de evidência pela posição (remover uma foto do meio deixava linhas órfãs), mutava os objetos recebidos, ignorava erros e dependia de quatro refs em `App.tsx` para evitar laços de salvamento. O "fallback local" era um `if (isSupabaseConfigured())` em cada função, não um adapter.

## Decisão
`createObraStore(repository)` (`src/services/obraStore.ts`) guarda o último snapshot salvo, calcula o diff do próximo estado, grava só o que mudou e remove o que sumiu (por isso não há tombstones). Saves são serializados e coalescidos, a carga tem timeout (15 s) e qualquer falha vira `ObraStoreError`. `ObraRepository` é o seam, com dois adapters reais: Supabase (produção) e em memória (testes). Componentes continuam recebendo `obras` e um setter, como antes.

## Consequências
- Exclusões são reconciliadas pelo diff, inclusive de filhos.
- A lógica de ordem, merge e falha tem teste sem Supabase (`obraStore.test.ts`).
- O cliente só consegue gravar decisões e assinaturas; outra mudança vira `forbidden`.
- APIs por entidade (`decisoesApi`, `locacoesApi`, `notasApi`...) continuam para ações pontuais e agora lançam erro.
