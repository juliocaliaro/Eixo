# 0005. Estado da URL e overlays centralizados

Status: aceita

## Contexto
A URL (`?obra=&tab=&perfil=&view=`) era lida em cinco lugares e escrita em três, com corrida entre `pushState` e `replaceState`; o Voltar do navegador ignorava `view=locacoes`. Cerca de 22 componentes tinham seu próprio listener de Escape (um efeito fechava quatro overlays de uma vez), cinco copiavam o lightbox e três copiavam a verificação de breakpoint. `initModalBackdropGuard` existia mas nunca era chamada.

## Decisão
- `utils/routeState.ts` (parse/serialize/abas padrão/`resolvePerfil`) e `hooks/useRouteState.ts` (política push/replace e `popstate`). Abrir obra ou tela faz push; aba e perfil fazem replace. `?perfil=` nunca concede privilégio. Logout volta para a home.
- `utils/overlayStack.ts` + `useEscapeKey`: Escape fecha só o overlay do topo. `useIsMobile` (768px), `usePopoverDismiss`, `Lightbox`/`GalleryLightbox`.
- `initModalBackdropGuard()` é chamada em `main.tsx`.
- Tokens de `:root` para z-index e escala de fonte.

## Consequências
Abrir Notas/Locações agora entra no histórico (o Voltar as fecha). Ao voltar para a lista a aba da obra é zerada.
