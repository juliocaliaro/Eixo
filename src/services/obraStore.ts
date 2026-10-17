import { Obra, PerfilUsuario } from '../types/obra';
import {
  ChangeSet,
  RawRows,
  TABLES,
  TableName,
  assembleObras,
  diffRowSets,
  flattenObras,
  indexRows,
  isEmptyChangeSet,
  RowSet,
} from './obraRows';
import { TimeoutError } from '../utils/mensagensErro';

/**
 * Costura de persistencia das obras.
 *
 * O restante do app trabalha com o estado inteiro (Obra[]). O store guarda o ultimo
 * snapshot persistido, calcula o diff do proximo estado contra ele e pede ao
 * repositorio que grave apenas o que mudou (inclusive exclusoes). Saves concorrentes
 * sao serializados e coalescidos. Erros nunca sao engolidos: viram ObraStoreError.
 */

export interface StoreIdentity {
  userId: string;
  email: string;
  /** Papel da conta autenticada. */
  role: PerfilUsuario;
}

export interface ApplyReport {
  /** Colunas toleraveis ausentes no banco que foram descartadas na gravacao. */
  warnings: string[];
}

/** Adaptador de armazenamento. Producao: Supabase. Testes: em memoria. */
export interface ObraRepository {
  /** Le as linhas que a identidade pode enxergar (o filtro de acesso e responsabilidade do adaptador). */
  load(identity: StoreIdentity): Promise<RawRows>;
  /** Aplica o conjunto de mudancas: upserts em ordem pai->filho e depois exclusoes filho->pai. */
  apply(changes: ChangeSet, identity: StoreIdentity): Promise<ApplyReport>;
}

export type ObraStoreErrorKind = 'load-failed' | 'save-failed' | 'not-loaded' | 'forbidden';

export class ObraStoreError extends Error {
  readonly kind: ObraStoreErrorKind;
  readonly cause?: unknown;
  constructor(kind: ObraStoreErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = 'ObraStoreError';
    this.kind = kind;
    this.cause = cause;
  }
}

export interface SaveResult {
  upserted: number;
  deleted: number;
  warnings: string[];
}

export interface ObraStore {
  load(identity: StoreIdentity): Promise<Obra[]>;
  save(next: Obra[]): Promise<SaveResult>;
  /** Descarta identidade e snapshot (logout). Saves pendentes falham com 'not-loaded'. */
  reset(): void;
}

// Cliente so interage ativamente em Decisoes & Aprovacoes (AGENTS.md secoes 3.2 e 23).
const TABELAS_ESCRITA_CLIENTE: TableName[] = ['decisoes', 'decisao_assinaturas'];

const semAlteracao: SaveResult = { upserted: 0, deleted: 0, warnings: [] };

export interface ObraStoreOptions {
  /** Tempo maximo de cada tentativa de carga (ms). Ao estourar, load falha com 'load-failed'. */
  loadTimeoutMs?: number;
}

export const LOAD_TIMEOUT_MS = 15000;

const comLimite = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(`A leitura excedeu ${ms} ms.`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });

export const createObraStore = (repository: ObraRepository, options: ObraStoreOptions = {}): ObraStore => {
  const loadTimeoutMs = options.loadTimeoutMs ?? LOAD_TIMEOUT_MS;
  let identity: StoreIdentity | null = null;
  let snapshot: RowSet | null = null;

  // Fila serial com coalescencia: no maximo um save em voo e um pendente (o mais recente).
  let tail: Promise<unknown> = Promise.resolve();
  let pending: { next: Obra[]; promise: Promise<SaveResult> } | null = null;

  const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
    const run = tail.then(job, job);
    tail = run.catch(() => undefined);
    return run;
  };

  const doSave = async (next: Obra[]): Promise<SaveResult> => {
    if (!identity || !snapshot) {
      throw new ObraStoreError('not-loaded', 'As obras ainda não foram carregadas do servidor.');
    }
    const nextRows = flattenObras(next, { construtorId: identity.userId, known: snapshot });
    const changes = diffRowSets(snapshot, nextRows);
    if (isEmptyChangeSet(changes)) {
      snapshot = nextRows;
      return semAlteracao;
    }

    if (identity.role === 'cliente') {
      const escreveForaDeDecisoes = TABLES.some(
        (t) => !TABELAS_ESCRITA_CLIENTE.includes(t) && (changes.upserts[t].length > 0 || changes.deletes[t].length > 0)
      );
      if (escreveForaDeDecisoes) {
        throw new ObraStoreError('forbidden', 'O perfil Cliente só pode alterar decisões e aprovações.');
      }
    }

    let report: ApplyReport;
    try {
      report = await repository.apply(changes, identity);
    } catch (err) {
      throw new ObraStoreError('save-failed', 'Não foi possível salvar as alterações no servidor.', err);
    }
    snapshot = nextRows;
    const total = (byTable: Record<TableName, unknown[]>) => TABLES.reduce((n, t) => n + byTable[t].length, 0);
    return { upserted: total(changes.upserts), deleted: total(changes.deletes), warnings: report.warnings };
  };

  return {
    load(id) {
      return enqueue(async () => {
        let raw: RawRows;
        try {
          raw = await comLimite(repository.load(id), loadTimeoutMs);
        } catch (err) {
          throw new ObraStoreError('load-failed', 'Não foi possível carregar as obras do servidor.', err);
        }
        const obras = assembleObras(raw);
        identity = id;
        // O snapshot e o estado normalizado (mesmo caminho do save) com os ids reais do banco.
        snapshot = flattenObras(obras, { construtorId: id.userId, known: indexRows(raw) });
        return obras;
      });
    },

    save(next) {
      if (pending) {
        pending.next = next;
        return pending.promise;
      }
      const slot: { next: Obra[]; promise: Promise<SaveResult> } = {
        next,
        promise: undefined as unknown as Promise<SaveResult>,
      };
      slot.promise = enqueue(() => {
        if (pending === slot) pending = null;
        return doSave(slot.next);
      });
      pending = slot;
      return slot.promise;
    },

    reset() {
      identity = null;
      snapshot = null;
    },
  };
};
