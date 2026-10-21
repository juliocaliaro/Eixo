import { describe, it, expect } from 'vitest';
import {
  avaliarSenha,
  validarNovaSenha,
  mensagemErroTrocaSenha,
  urlIndicaRecuperacao,
  MENSAGEM_POLITICA_SENHA,
} from '../utils/senha';
import { buildSessionUser } from '../services/session';

describe('politica de senha', () => {
  it('exige 8+, maiuscula, minuscula, numero e simbolo', () => {
    expect(avaliarSenha('Abcdef1!').valida).toBe(true);
    expect(avaliarSenha('abcdef1!').maiuscula).toBe(false);
    expect(avaliarSenha('Abcdefg!').numero).toBe(false);
    expect(avaliarSenha('Abcdef12').simbolo).toBe(false);
    expect(avaliarSenha('Ab1!').minimo).toBe(false);
  });

  it('validarNovaSenha devolve mensagens claras', () => {
    expect(validarNovaSenha('', '')).toMatch(/Defina/);
    expect(validarNovaSenha('fraca', 'fraca')).toBe(MENSAGEM_POLITICA_SENHA);
    expect(validarNovaSenha('Abcdef1!', 'Abcdef1?')).toMatch(/não coincide/);
    expect(validarNovaSenha('Abcdef1!', 'Abcdef1!')).toBeNull();
  });

  it('traduz erros do Supabase', () => {
    expect(mensagemErroTrocaSenha('New password should be different from the old password.')).toMatch(/diferente/);
    expect(mensagemErroTrocaSenha('Auth session missing!')).toMatch(/expirou/);
    expect(mensagemErroTrocaSenha('Password should be at least 6 characters')).toBe(MENSAGEM_POLITICA_SENHA);
    expect(mensagemErroTrocaSenha('algo inesperado')).toMatch(/Tente novamente/);
  });
});

describe('deteccao do link de recuperacao', () => {
  it('reconhece type=recovery no hash ou na query', () => {
    expect(urlIndicaRecuperacao('#access_token=abc&type=recovery')).toBe(true);
    expect(urlIndicaRecuperacao('#type=recovery&access_token=abc')).toBe(true);
    expect(urlIndicaRecuperacao('', '?type=recovery')).toBe(true);
    expect(urlIndicaRecuperacao('#access_token=abc&type=signup')).toBe(false);
    expect(urlIndicaRecuperacao('')).toBe(false);
  });
});

describe('papel da sessao', () => {
  const user = { id: 'u1', email: 'A@B.com', user_metadata: { role: 'construtor', nome: 'Fulano' } };

  it('usa apenas profiles.role, nunca user_metadata', () => {
    expect(buildSessionUser(user, { id: 'u1', email: 'a@b.com', nome: 'F', role: 'cliente' }).role).toBe('cliente');
    expect(buildSessionUser(user, { id: 'u1', email: 'a@b.com', nome: 'F', role: 'construtor' }).role).toBe('construtor');
  });

  it('normaliza capitalizacao do papel (ex.: Construtor)', () => {
    expect(buildSessionUser(user, { id: 'u1', email: 'a@b.com', nome: 'F', role: 'Construtor' as 'construtor' }).role).toBe('construtor');
    expect(buildSessionUser(user, { id: 'u1', email: 'a@b.com', nome: 'F', role: 'CLIENTE' as 'cliente' }).role).toBe('cliente');
  });

  it('sem perfil carregado assume o menor privilegio (cliente) mesmo com metadado construtor', () => {
    expect(buildSessionUser(user, null).role).toBe('cliente');
  });
});
