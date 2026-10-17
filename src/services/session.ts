import { PerfilUsuario } from '../types/obra';
import { authApi, ProfileRow } from './api';
import { normalizeEmail } from './obraAccess';
import { TimeoutError, classificarFalha } from '../utils/mensagensErro';

/** Usuario autenticado, derivado da sessao Supabase + linha de public.profiles. */
export interface SessionUser {
  id: string;
  email: string;
  nome: string;
  empresa: string;
  /** Papel da conta (nao o perfil de visualizacao alternavel na interface). */
  role: PerfilUsuario;
  /** Perfil nao pôde ser lido (mesmo apos nova tentativa): papel assumido como 'cliente' (menor privilegio). */
  perfilIndisponivel?: boolean;
}

interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
}

/**
 * Fonte primaria: profiles. O papel (role) vem SOMENTE da linha de profiles (imutavel para o usuario via
 * trigger): user_metadata e editavel pelo proprio usuario e nunca define permissao. Sem perfil carregado
 * o papel e o de menor privilegio ('cliente'). Nome e empresa podem usar os metadados como apresentacao.
 */
export const buildSessionUser = (user: AuthUserLike, profile: ProfileRow | null): SessionUser => {
  const meta = user.user_metadata || {};
  const email = normalizeEmail(user.email || profile?.email);
  const role: PerfilUsuario = profile?.role === 'construtor' ? 'construtor' : 'cliente';
  return {
    id: user.id,
    email,
    nome: profile?.nome || meta.nome || email.split('@')[0] || '',
    empresa: profile?.empresa ?? meta.empresa ?? '',
    role,
  };
};

const avisados = new Set<string>();

/** Zera o controle de avisos (troca de sessao/testes). */
export const resetAvisosPerfil = () => avisados.clear();

export interface LoadSessionOptions {
  /** Espera antes da segunda tentativa de ler o perfil (ms). */
  retryDelayMs?: number;
  /** Tempo maximo de cada leitura do perfil (ms). Com o servidor fora do ar o SDK espera 30-60 s. */
  profileTimeoutMs?: number;
}

const comLimite = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError('A leitura do perfil excedeu o tempo limite.')), ms);
    promise.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e) => (clearTimeout(timer), reject(e))
    );
  });

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const loadSessionUser = async (
  session: { user?: AuthUserLike | null } | null,
  options: LoadSessionOptions = {}
): Promise<SessionUser | null> => {
  const user = session?.user;
  if (!user) return null;
  const tentar = async (): Promise<{ profile: ProfileRow | null; ok: boolean; err?: unknown }> => {
    try {
      return { profile: await comLimite(authApi.getProfile(user.id), options.profileTimeoutMs ?? 8000), ok: true };
    } catch (err) {
      return { profile: null, ok: false, err };
    }
  };
  let r = await tentar();
  // Timeout nao e falha transitoria: repetir so dobraria a espera.
  if (!r.ok && classificarFalha(r.err) !== 'timeout') {
    await esperar(options.retryDelayMs ?? 800);
    r = await tentar();
  }
  const indisponivel = !r.ok || !r.profile;
  if (indisponivel && !avisados.has(user.id)) {
    avisados.add(user.id);
    console.warn('Perfil indisponível, usando metadados da conta (papel: cliente):', r.err ?? 'sem linha em profiles');
  }
  if (!indisponivel) avisados.delete(user.id);
  const built = buildSessionUser(user, r.profile);
  return indisponivel ? { ...built, perfilIndisponivel: true } : built;
};
