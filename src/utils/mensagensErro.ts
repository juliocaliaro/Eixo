// Mensagens de erro em linguagem simples para o usuario. Funcoes puras.
// Nomes de tabela, codigos e textos do Postgres nunca chegam a interface: vao para o console.

export type ContextoErro = 'carregar' | 'salvar';

export const MSG_CARREGAR_OBRAS = 'Não foi possível carregar suas obras. Verifique sua conexão e tente novamente.';
export const MSG_SALVAR = 'Não foi possível salvar a última alteração. Recarregamos os dados do servidor.';
export const MSG_PROIBIDO = 'Você não tem permissão para realizar esta ação.';
export const MSG_SESSAO_EXPIRADA = 'Sua sessão expirou. Entre novamente para continuar.';
export const MSG_TIMEOUT = 'O servidor demorou para responder. Verifique sua conexão e tente novamente.';
export const MSG_GENERICA = 'Algo deu errado. Tente novamente.';

export class TimeoutError extends Error {
  constructor(message = 'Tempo limite excedido.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export type TipoFalha = 'timeout' | 'sessao-expirada' | 'proibido' | 'rede' | 'outro';

interface ErroLike {
  name?: string;
  message?: string;
  code?: string | number;
  status?: number;
  cause?: unknown;
}

const asLike = (err: unknown): ErroLike =>
  err && typeof err === 'object' ? (err as ErroLike) : { message: typeof err === 'string' ? err : undefined };

/** Percorre a cadeia de `cause` (limitada) procurando o primeiro erro que o classificador reconheca. */
export const classificarFalha = (err: unknown): TipoFalha => {
  let atual: unknown = err;
  for (let i = 0; i < 5 && atual; i++) {
    const e = asLike(atual);
    const msg = (e.message || '').toLowerCase();
    const code = String(e.code ?? '');
    if (e.name === 'TimeoutError' || e.name === 'AbortError') return 'timeout';
    if (e.status === 401 || code === 'PGRST301' || code === 'PGRST303' || /jwt (expired|invalid)|invalid jwt|refresh token|session (expired|missing)/.test(msg)) {
      return 'sessao-expirada';
    }
    if (e.status === 403 || code === '42501' || /row-level security|permission denied/.test(msg)) return 'proibido';
    if (/failed to fetch|networkerror|network request failed|load failed|err_connection|fetch failed/.test(msg)) return 'rede';
    atual = e.cause;
  }
  return 'outro';
};

/** Texto seguro para exibir. `contexto` define a frase quando a causa nao e especifica. */
export const mensagemParaUsuario = (err: unknown, contexto: ContextoErro = 'carregar'): string => {
  const kind = (err as { kind?: string } | null)?.kind;
  if (kind === 'forbidden') return MSG_PROIBIDO;
  const falha = classificarFalha(err);
  if (falha === 'sessao-expirada') return MSG_SESSAO_EXPIRADA;
  if (falha === 'proibido') return MSG_PROIBIDO;
  if (falha === 'timeout' && contexto === 'carregar') return MSG_TIMEOUT;
  if (kind === 'load-failed') return MSG_CARREGAR_OBRAS;
  if (kind === 'save-failed' || kind === 'not-loaded') return MSG_SALVAR;
  return contexto === 'salvar' ? MSG_SALVAR : MSG_CARREGAR_OBRAS;
};

/** Registra o detalhe tecnico (tabela, codigo, texto do banco) apenas no console. */
export const registrarErro = (rotulo: string, err: unknown): void => {
  console.error(`[eixo] ${rotulo}`, err);
};
