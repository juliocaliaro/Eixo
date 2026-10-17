/**
 * Politica de senha do Eixo (mesma regra do cadastro em LoginPage):
 * minimo de 8 caracteres, maiuscula, minuscula, numero e simbolo.
 */
export interface RequisitosSenha {
  minimo: boolean;
  maiuscula: boolean;
  minuscula: boolean;
  numero: boolean;
  simbolo: boolean;
}

export const avaliarSenha = (senha: string): RequisitosSenha & { valida: boolean } => {
  const r: RequisitosSenha = {
    minimo: senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    minuscula: /[a-z]/.test(senha),
    numero: /[0-9]/.test(senha),
    simbolo: /[^A-Za-z0-9]/.test(senha),
  };
  return { ...r, valida: Object.values(r).every(Boolean) };
};

export const MENSAGEM_POLITICA_SENHA =
  'A senha deve conter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos.';

/** Valida nova senha + confirmacao. Devolve a mensagem de erro em linguagem simples, ou null se estiver tudo certo. */
export const validarNovaSenha = (senha: string, confirmacao: string): string | null => {
  if (!senha.trim()) return 'Defina a nova senha de acesso.';
  if (!avaliarSenha(senha).valida) return MENSAGEM_POLITICA_SENHA;
  if (senha !== confirmacao) return 'A confirmação da senha não coincide com a senha digitada.';
  return null;
};

/** Traduz erros do Supabase Auth na troca de senha para texto claro. */
export const mensagemErroTrocaSenha = (mensagem: string | null | undefined): string => {
  const m = (mensagem || '').toLowerCase();
  if (m.includes('different from the old') || m.includes('same password')) {
    return 'A nova senha precisa ser diferente da senha atual.';
  }
  if (m.includes('session') || m.includes('jwt') || m.includes('expired') || m.includes('not authenticated')) {
    return 'O link de recuperação expirou ou já foi usado. Volte ao login e solicite um novo link.';
  }
  if (m.includes('weak') || m.includes('at least') || m.includes('password should')) {
    return MENSAGEM_POLITICA_SENHA;
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }
  return 'Não foi possível redefinir a senha agora. Tente novamente em instantes.';
};

/** O link de e-mail de recuperacao chega com type=recovery no hash (fluxo implicito). */
export const urlIndicaRecuperacao = (hash: string, search = ''): boolean =>
  /(^|[#&?])type=recovery(&|$)/.test(hash) || /(^|[?&])type=recovery(&|$)/.test(search);
