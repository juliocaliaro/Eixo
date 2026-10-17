import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authApi } from '../services/api';
import { SessionUser, loadSessionUser } from '../services/session';
import { urlIndicaRecuperacao } from '../utils/senha';
import { registrarErro, TimeoutError } from '../utils/mensagensErro';

const SESSION_TIMEOUT_MS = 15000;
const MSG_SESSAO_NAO_RESTAURADA = 'Não foi possível restaurar sua sessão. Entre novamente para continuar.';

/** 'recovery': usuario chegou pelo link de redefinicao de senha e precisa definir a nova senha. */
export type SessionStatus = 'loading' | 'anon' | 'authed' | 'recovery';

export interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  /** Aviso nao bloqueante para a tela de login (ex.: falha ao restaurar a sessao). */
  notice?: string | null;
}

/**
 * Unico ponto de hidratacao de sessao: getSession inicial + onAuthStateChange passam
 * pela mesma funcao. Nada sobre autenticacao e guardado fora do SDK do Supabase.
 */
export const useSession = (): SessionState & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  finishRecovery: () => Promise<void>;
} => {
  const [state, setState] = useState<SessionState>({ status: 'loading', user: null });
  const seq = useRef(0);
  // Verdadeiro entre o evento PASSWORD_RECOVERY (ou o link com type=recovery) e a troca de senha concluida.
  const recovery = useRef(
    typeof window !== 'undefined' && urlIndicaRecuperacao(window.location.hash, window.location.search)
  );

  const hydrate = useCallback(async (session: any) => {
    const mySeq = ++seq.current;
    const user = await loadSessionUser(session);
    if (mySeq !== seq.current) return; // resposta obsoleta
    setState((prev) => {
      if (!user) return prev.status === 'anon' && !prev.notice ? prev : { status: 'anon', user: null };
      return { status: recovery.current ? 'recovery' : 'authed', user };
    });
  }, []);

  useEffect(() => {
    let active = true;
    // Servidor fora do ar: o SDK tenta renovar o token por 30-60 s. Limita a espera; se a resposta chegar
    // depois, o evento do onAuthStateChange hidrata a sessao normalmente.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError('A restauração da sessão excedeu o tempo limite.')), SESSION_TIMEOUT_MS);
    });
    Promise.race([authApi.getSession(), limite])
      .finally(() => clearTimeout(timer))
      .then((session) => {
        if (!session) recovery.current = false; // link expirado/sem sessao: nada a recuperar
        if (active) void hydrate(session);
      })
      .catch((err) => {
        registrarErro('Falha ao restaurar a sessão', err);
        if (!active) return;
        recovery.current = false;
        seq.current += 1;
        setState({ status: 'anon', user: null, notice: MSG_SESSAO_NAO_RESTAURADA });
      });

    const subscription = authApi.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.user) return; // mesma identidade
      if (event === 'PASSWORD_RECOVERY') recovery.current = true;
      if (event === 'SIGNED_OUT') recovery.current = false;
      // Nao aguardar chamadas ao Supabase dentro do callback (evita deadlock do SDK).
      setTimeout(() => {
        if (active) void hydrate(session);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [hydrate]);

  const refresh = useCallback(async () => {
    await hydrate(await authApi.getSession());
  }, [hydrate]);

  const signOut = useCallback(async () => {
    recovery.current = false;
    await authApi.signOut();
    await hydrate(null);
  }, [hydrate]);

  /** Encerra o modo de recuperacao (senha trocada) e segue para o app com a sessao atual. */
  const finishRecovery = useCallback(async () => {
    recovery.current = false;
    await hydrate(await authApi.getSession());
  }, [hydrate]);

  return { ...state, refresh, signOut, finishRecovery };
};

const SessionUserContext = createContext<SessionUser | null>(null);

export const SessionUserProvider: React.FC<{ user: SessionUser | null; children: React.ReactNode }> = ({
  user,
  children,
}) => <SessionUserContext.Provider value={user}>{children}</SessionUserContext.Provider>;

/** Usuario autenticado para componentes que precisam (ex.: empresa responsavel). Null fora do provider. */
export const useSessionUser = (): SessionUser | null => useContext(SessionUserContext);
