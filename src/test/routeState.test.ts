import { describe, it, expect } from 'vitest';
import { parseRoute, serializeRoute, defaultTab, normalizeTab, resolveTab, resolvePerfil } from '../utils/routeState';

describe('routeState', () => {
  it('round-trip de links de compartilhamento', () => {
    const q = '?obra=abc&perfil=cliente&tab=decisoes';
    expect(serializeRoute(parseRoute(q))).toBe(q);
    expect(serializeRoute(parseRoute('?obra=abc&tab=projetos'))).toBe('?obra=abc&tab=projetos');
    expect(serializeRoute(parseRoute('?view=locacoes'))).toBe('?view=locacoes');
    expect(serializeRoute(parseRoute('?upload=projeto&obra=x'))).toBe('?upload=projeto&obra=x');
  });

  it('defaults por perfil e omissao da aba padrao', () => {
    expect(defaultTab('cliente')).toBe('diario');
    expect(defaultTab('construtor')).toBe('etapas');
    expect(resolveTab(parseRoute('?obra=a&perfil=cliente'))).toBe('diario');
    expect(resolveTab(parseRoute('?obra=a'))).toBe('etapas');
    expect(serializeRoute(parseRoute('?obra=a&tab=etapas'))).toBe('?obra=a');
    expect(serializeRoute(parseRoute('?obra=a&perfil=cliente&tab=diario'))).toBe('?obra=a&perfil=cliente');
  });

  it('alias anexos -> diario', () => {
    expect(normalizeTab('anexos')).toBe('diario');
    expect(parseRoute('?obra=a&tab=anexos').tab).toBe('diario');
  });

  it('descarta parametros desconhecidos e valores invalidos', () => {
    expect(serializeRoute(parseRoute('?obra=a&foo=1&tab=xyz&perfil=admin&view=zzz'))).toBe('?obra=a');
    expect(parseRoute('?tab=etapas').tab).toBeNull();
  });

  it('precedencia de view e upload', () => {
    expect(parseRoute('?view=notas&view=locacoes').view).toBe('notas');
    const up = parseRoute('?upload=projeto&obra=x&view=notas');
    expect(up.uploadObraId).toBe('x');
    expect(up.view).toBeNull();
    expect(parseRoute('?upload=outro&obra=x').uploadObraId).toBeNull();
  });

  it('voltar para lista nao carrega aba', () => {
    const s = { ...parseRoute('?obra=a&tab=decisoes&perfil=cliente'), obraId: null };
    expect(serializeRoute(s)).toBe('?perfil=cliente');
  });

  it('perfil da URL nunca eleva privilegios', () => {
    expect(resolvePerfil('cliente', 'construtor')).toBe('cliente');
    expect(resolvePerfil('cliente', 'cliente')).toBe('cliente');
    expect(resolvePerfil('construtor', 'cliente')).toBe('cliente');
    expect(resolvePerfil('construtor', 'construtor')).toBe('construtor');
  });
});
