import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PerfilUsuario } from '../types/obra';
import { parseRoute, routeAfterSignOut, serializeRoute, resolvePerfil, resolveTab, RouteState, RouteTab } from '../utils/routeState';

export type HistoryMode = 'push' | 'replace';

/**
 * Dono da politica de historico da URL.
 * - navegacao entre telas (obra, view): push; ajustes de aba/perfil: replace
 * - nunca grava entrada duplicada (compara com a URL atual)
 * - handlers gravam sincronamente; nao ha efeito de escrita concorrente
 * - accountRole null = sem sessao: a URL nao e reescrita (links de upload/obra sobrevivem ao login)
 */
export function useRouteState(accountRole: PerfilUsuario | null) {
  const [raw, setRaw] = useState<RouteState>(() => parseRoute(window.location.search));
  const rawRef = useRef(raw);
  const roleRef = useRef(accountRole);
  const prevRoleRef = useRef(accountRole);
  roleRef.current = accountRole;

  const effective = useCallback(
    (s: RouteState): RouteState =>
      roleRef.current ? { ...s, perfil: resolvePerfil(roleRef.current, s.perfil) } : s,
    []
  );

  const route = useMemo(
    () => (accountRole ? { ...raw, perfil: resolvePerfil(accountRole, raw.perfil) } : raw),
    [raw, accountRole]
  );

  const writeUrl = useCallback((state: RouteState, mode: HistoryMode) => {
    try {
      const search = serializeRoute(state);
      if (search === window.location.search) return;
      const url = `${window.location.pathname}${search}${window.location.hash}`;
      if (mode === 'push') window.history.pushState({}, '', url);
      else window.history.replaceState({}, '', url);
    } catch {
      /* ambientes sem history */
    }
  }, []);

  const navigate = useCallback(
    (patch: Partial<RouteState>, mode: HistoryMode = 'replace') => {
      const next = { ...rawRef.current, ...patch };
      rawRef.current = next;
      setRaw(next);
      if (roleRef.current) writeUrl(effective(next), mode);
    },
    [effective, writeUrl]
  );

  // Voltar/Avancar do navegador: vale para todas as views.
  useEffect(() => {
    const onPop = () => {
      const next = parseRoute(window.location.search);
      rawRef.current = next;
      setRaw(next);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Logout (ou sessao expirada): volta para a home e limpa a URL. Links externos so sobrevivem ao login
  // quando o usuario chega deslogado; uma sessao que acaba nao deve vazar obra/aba/view para a proxima conta.
  useEffect(() => {
    const had = prevRoleRef.current;
    prevRoleRef.current = accountRole;
    if (had && !accountRole) {
      const home = routeAfterSignOut();
      rawRef.current = home;
      setRaw(home);
      writeUrl(home, 'replace');
    }
  }, [accountRole, writeUrl]);

  // Normaliza a URL (ex.: conta cliente forcando perfil=cliente) sem criar entrada de historico.
  useEffect(() => {
    if (accountRole) writeUrl(route, 'replace');
  }, [accountRole, route, writeUrl]);

  const setTab = useCallback((tab: RouteTab | null) => navigate({ tab }, 'replace'), [navigate]);
  const tab = resolveTab(route);

  return { route, tab, navigate, setTab };
}
