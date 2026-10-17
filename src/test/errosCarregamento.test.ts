import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mensagemParaUsuario,
  classificarFalha,
  TimeoutError,
  MSG_CARREGAR_OBRAS,
  MSG_SALVAR,
  MSG_PROIBIDO,
  MSG_SESSAO_EXPIRADA,
  MSG_TIMEOUT,
} from '../utils/mensagensErro';
import { adicionarToastUnico } from '../utils/toasts';
import { ObraStoreError, createObraStore, StoreIdentity } from '../services/obraStore';
import { createInMemoryObraRepository } from '../services/repositories/inMemoryObraRepository';
import { routeAfterSignOut, serializeRoute, resolveTab } from '../utils/routeState';
import { SupabaseWriteError } from '../services/supabaseWrite';

const ID: StoreIdentity = { userId: 'c0000000-0000-4000-8000-000000000001', email: 'a@b.com', role: 'construtor' };

describe('mensagemParaUsuario', () => {
  it('carga e gravacao usam o verbo certo e nunca vazam tabela/codigo', () => {
    const causa = new SupabaseWriteError('modelos_etapas_templates', { code: 'XX000', message: 'boom' });
    const load = new ObraStoreError('load-failed', 'x', causa);
    const save = new ObraStoreError('save-failed', 'x', causa);
    expect(mensagemParaUsuario(load, 'carregar')).toBe(MSG_CARREGAR_OBRAS);
    expect(mensagemParaUsuario(save, 'salvar')).toBe(MSG_SALVAR);
    for (const m of [mensagemParaUsuario(load), mensagemParaUsuario(save), mensagemParaUsuario(causa)]) {
      expect(m).not.toMatch(/modelos_etapas|XX000|boom|gravar/);
    }
  });

  it('erro de carga solto nunca e chamado de gravacao', () => {
    expect(mensagemParaUsuario(new SupabaseWriteError('t', { message: 'm' }), 'carregar')).toBe(MSG_CARREGAR_OBRAS);
  });

  it('classifica permissao, sessao expirada e timeout', () => {
    expect(mensagemParaUsuario(new ObraStoreError('forbidden', 'x'))).toBe(MSG_PROIBIDO);
    expect(mensagemParaUsuario(new ObraStoreError('load-failed', 'x', { code: '42501', message: 'rls' }))).toBe(MSG_PROIBIDO);
    expect(mensagemParaUsuario(new ObraStoreError('load-failed', 'x', { code: 'PGRST301', message: 'JWT expired' }))).toBe(
      MSG_SESSAO_EXPIRADA
    );
    expect(mensagemParaUsuario(new ObraStoreError('load-failed', 'x', new TimeoutError()))).toBe(MSG_TIMEOUT);
    expect(classificarFalha(new TypeError('Failed to fetch'))).toBe('rede');
  });
});

describe('adicionarToastUnico', () => {
  const t = (id: string, titulo = 'Erro', descricao = 'desc') => ({ id, tipo: 'error' as const, titulo, descricao });
  it('ignora mensagem identica ja visivel e aceita diferentes', () => {
    const um = adicionarToastUnico([], t('1'));
    expect(adicionarToastUnico(um, t('2'))).toHaveLength(1);
    expect(adicionarToastUnico(um, t('3', 'Outro'))).toHaveLength(2);
  });
});

describe('obraStore: limite de tempo da carga', () => {
  it('falha com load-failed (causa TimeoutError) quando o repositorio nunca responde', async () => {
    const repo = createInMemoryObraRepository();
    repo.load = () => new Promise(() => undefined);
    const store = createObraStore(repo, { loadTimeoutMs: 20 });
    const err = await store.load(ID).catch((e) => e);
    expect(err).toBeInstanceOf(ObraStoreError);
    expect(err.kind).toBe('load-failed');
    expect(mensagemParaUsuario(err)).toBe(MSG_TIMEOUT);
  });

  it('uma nova tentativa funciona depois de um timeout', async () => {
    const repo = createInMemoryObraRepository();
    const ok = repo.load.bind(repo);
    let primeira = true;
    repo.load = (id) => (primeira ? ((primeira = false), new Promise(() => undefined)) : ok(id));
    const store = createObraStore(repo, { loadTimeoutMs: 20 });
    await expect(store.load(ID)).rejects.toBeInstanceOf(ObraStoreError);
    await expect(store.load(ID)).resolves.toEqual([]);
  });
});

describe('routeAfterSignOut', () => {
  it('volta para a home e deixa o perfil escolher a aba padrao', () => {
    const r = routeAfterSignOut();
    expect(serializeRoute(r)).toBe('');
    expect(resolveTab({ tab: r.tab, perfil: 'cliente' })).toBe('diario');
    expect(r.view).toBeNull();
  });
});

describe('loadSessionUser', () => {
  beforeEach(() => vi.resetModules());
  it('papel cai para cliente, marca perfil indisponivel e avisa uma unica vez', async () => {
    vi.doMock('../services/api', () => ({
      authApi: { getProfile: vi.fn().mockRejectedValue(new Error('down')) },
    }));
    const { loadSessionUser } = await import('../services/session');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sess = { user: { id: 'u1', email: 'x@y.com', user_metadata: { role: 'construtor' } } };
    const a = await loadSessionUser(sess, { retryDelayMs: 1 });
    await loadSessionUser(sess, { retryDelayMs: 1 });
    expect(a).toMatchObject({ role: 'cliente', perfilIndisponivel: true });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    vi.doUnmock('../services/api');
  });
});
