import type { PerfilUsuario } from '../types/obra';

// Estado de URL do Eixo: ?obra=&tab=&perfil=&view= (e ?upload=projeto&obra=).
// Modulo puro: sem acesso a window/history. A politica de historico vive em hooks/useRouteState.

export type RouteTab = 'etapas' | 'projetos' | 'decisoes' | 'diario' | 'compartilhar';
export type RouteView = 'notas' | 'locacoes';

export interface RouteState {
  obraId: string | null;
  /** null = aba padrao do perfil (ver defaultTab) */
  tab: RouteTab | null;
  /** Preferencia de visualizacao; NAO concede privilegios (ver resolvePerfil). */
  perfil: PerfilUsuario;
  view: RouteView | null;
  /** Link externo de upload de pranchas (?upload=projeto&obra=ID) */
  uploadObraId: string | null;
}

const TABS: readonly RouteTab[] = ['etapas', 'projetos', 'decisoes', 'diario', 'compartilhar'];

export const defaultTab = (perfil: PerfilUsuario): RouteTab => (perfil === 'cliente' ? 'diario' : 'etapas');

/** Normaliza o alias legado `anexos` -> `diario`; valores desconhecidos viram null. */
export const normalizeTab = (value: string | null | undefined): RouteTab | null => {
  if (value === 'anexos') return 'diario';
  return TABS.includes(value as RouteTab) ? (value as RouteTab) : null;
};

export const resolveTab = (state: Pick<RouteState, 'tab' | 'perfil'>): RouteTab =>
  state.tab ?? defaultTab(state.perfil);

/**
 * O parametro ?perfil= e apenas preferencia de visao. A conta cliente e sempre cliente;
 * a conta construtor pode pre-visualizar a visao do cliente.
 */
export const resolvePerfil = (accountRole: PerfilUsuario, urlPerfil: PerfilUsuario): PerfilUsuario =>
  accountRole === 'cliente' ? 'cliente' : urlPerfil;

export const parseRoute = (search: string): RouteState => {
  const params = new URLSearchParams(search);
  const perfil: PerfilUsuario = params.get('perfil') === 'cliente' ? 'cliente' : 'construtor';
  const obra = params.get('obra') || null;
  const viewParam = params.get('view');
  const view: RouteView | null = viewParam === 'notas' || viewParam === 'locacoes' ? viewParam : null;
  const uploadObraId = params.get('upload') === 'projeto' ? obra : null;
  return {
    obraId: obra,
    tab: obra ? normalizeTab(params.get('tab')) : null,
    perfil,
    view: uploadObraId ? null : view,
    uploadObraId,
  };
};

/** Retorna '' ou '?query' (ordem estavel: obra, perfil, tab, view). */
export const serializeRoute = (state: RouteState): string => {
  const params = new URLSearchParams();
  if (state.uploadObraId) {
    params.set('upload', 'projeto');
    params.set('obra', state.uploadObraId);
    if (state.perfil === 'cliente') params.set('perfil', 'cliente');
  } else {
    if (state.obraId) params.set('obra', state.obraId);
    if (state.perfil === 'cliente') params.set('perfil', 'cliente');
    if (state.obraId && state.tab && state.tab !== defaultTab(state.perfil)) params.set('tab', state.tab);
    if (state.view) params.set('view', state.view);
  }
  const q = params.toString();
  return q ? `?${q}` : '';
};

/** Rota inicial apos encerrar a sessao: home, sem obra/aba/view; a proxima conta parte dos padroes do seu perfil. */
export const routeAfterSignOut = (): RouteState => ({
  obraId: null,
  tab: null,
  perfil: 'construtor',
  view: null,
  uploadObraId: null,
});
