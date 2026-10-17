# 0001. O banco é a única fonte da verdade (sem localStorage)

Status: aceita

## Contexto
O Eixo nasceu como experimento com `localStorage`. Isso criou um cache local por usuário, tombstones para exclusões, migração de chave legada, modo demo e um fallback para quando o Supabase não estava configurado. Resultados observados: obras apagadas voltando, cache de um usuário herdado por outro, a última obra apagada nunca chegando ao cache, binários em base64 estourando a cota e erros de gravação engolidos.

## Decisão
Supabase (PostgreSQL, Storage e Auth) é a única fonte da verdade. O aplicativo não usa `localStorage`/`sessionStorage`; sem as variáveis `VITE_SUPABASE_*` ele mostra uma tela de erro de configuração. Não há modo demo nem seed local. A sessão de login fica no armazenamento do próprio `supabase-js`.

## Consequências
- Todo dado novo exige migration SQL e RLS.
- Offline não é suportado; o app mostra erro claro com "Tentar novamente".
- Chaves `eixo_*` foram removidas; `src/test/noLocalStorage.test.ts` impede a volta.
- Empresa, nome e papel vêm do perfil (`profiles`) e da sessão, não de cache.
