/**
 * Escrita tolerante a colunas ausentes (PGRST204 / 42703).
 * Unico ponto de retry do sistema: so remove colunas explicitamente declaradas como
 * toleraveis (campos de apoio recem-migrados) e devolve quais foram descartadas,
 * para que o chamador reporte o degradado em vez de engolir o erro.
 */

export interface WriteError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

export type UpsertExecutor = (rows: Record<string, unknown>[]) => Promise<{ error: WriteError | null }>;

export class SupabaseWriteError extends Error {
  readonly code?: string;
  readonly table: string;
  constructor(table: string, err: WriteError) {
    super(`Falha ao gravar em ${table}: ${err.message || err.code || 'erro desconhecido'}`);
    this.name = 'SupabaseWriteError';
    this.code = err.code;
    this.table = table;
  }
}

export const isMissingColumnError = (err?: WriteError | null): boolean =>
  Boolean(err && (err.code === 'PGRST204' || err.code === '42703'));

/** Extrai o nome da coluna da mensagem do PostgREST/Postgres. */
export const missingColumnName = (err: WriteError, candidates: string[]): string | null => {
  const msg = err.message || '';
  const quoted = msg.match(/'([a-zA-Z0-9_]+)' column/) || msg.match(/column "([a-zA-Z0-9_]+)"/);
  if (quoted && candidates.includes(quoted[1])) return quoted[1];
  return candidates.find((c) => msg.includes(c)) || null;
};

export const upsertTolerant = async (
  table: string,
  rows: Record<string, unknown>[],
  execute: UpsertExecutor,
  tolerateMissing: string[] = []
): Promise<{ degradedColumns: string[] }> => {
  if (rows.length === 0) return { degradedColumns: [] };
  let current = rows;
  const degraded: string[] = [];
  const remaining = [...tolerateMissing];

  // Cada iteracao descarta no maximo uma coluna toleravel.
  for (let attempt = 0; attempt <= tolerateMissing.length; attempt++) {
    const { error } = await execute(current);
    if (!error) return { degradedColumns: degraded };
    if (!isMissingColumnError(error)) throw new SupabaseWriteError(table, error);
    const col = missingColumnName(error, remaining);
    if (!col) throw new SupabaseWriteError(table, error);
    remaining.splice(remaining.indexOf(col), 1);
    degraded.push(col);
    current = current.map((r) => {
      const { [col]: _omit, ...rest } = r;
      return rest;
    });
  }
  throw new SupabaseWriteError(table, { message: 'Colunas ausentes no banco' });
};
