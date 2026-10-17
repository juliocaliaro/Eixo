import { ObraRepository, StoreIdentity, ApplyReport } from '../obraStore';
import {
  AnyRow,
  ChangeSet,
  PARENTS,
  RawRows,
  TABLES,
  TableName,
  emptyRawRows,
  filtrarRawRowsPorIdentidade,
} from '../obraRows';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export interface InMemoryObraRepository extends ObraRepository {
  /** Linhas atualmente gravadas (copia). */
  dump(): RawRows;
  /** Pre-carrega linhas como se ja existissem no banco. */
  seed(rows: Partial<RawRows>): void;
  /** Historico dos ChangeSets aplicados. */
  readonly applied: ChangeSet[];
  /** Quando definido, a proxima chamada a apply falha com este erro. */
  failNextApply: Error | null;
  /** Atraso artificial (ms) em apply, para testar concorrencia. */
  applyDelayMs: number;
}

export const createInMemoryObraRepository = (initial: Partial<RawRows> = {}): InMemoryObraRepository => {
  const tables = emptyRawRows();
  const repo: InMemoryObraRepository = {
    applied: [],
    failNextApply: null,
    applyDelayMs: 0,

    seed(rows) {
      for (const t of TABLES) {
        for (const r of rows[t] || []) tables[t].push(clone(r));
      }
    },

    dump() {
      return clone(tables);
    },

    async load(identity: StoreIdentity) {
      return clone(filtrarRawRowsPorIdentidade(tables, identity));
    },

    async apply(changes: ChangeSet): Promise<ApplyReport> {
      if (repo.applyDelayMs > 0) await new Promise((r) => setTimeout(r, repo.applyDelayMs));
      if (repo.failNextApply) {
        const err = repo.failNextApply;
        repo.failNextApply = null;
        throw err;
      }
      repo.applied.push(clone(changes));

      for (const table of TABLES) {
        for (const row of changes.upserts[table]) {
          const copy = clone(row) as AnyRow;
          let idx = tables[table].findIndex((r) => r.id === copy.id);
          if (idx === -1 && table === 'decisao_assinaturas') {
            // mesma semantica do onConflict (decisao_id, papel)
            idx = tables[table].findIndex((r) => r.decisao_id === copy.decisao_id && r.papel === copy.papel);
          }
          if (idx === -1) tables[table].push(copy);
          else tables[table][idx] = copy;
        }
      }

      const removeCascade = (table: TableName, ids: Set<string>) => {
        if (ids.size === 0) return;
        tables[table] = tables[table].filter((r) => !ids.has(r.id));
        for (const child of TABLES) {
          const parent = PARENTS[child];
          if (parent && parent.table === table) {
            const childIds = new Set(
              tables[child].filter((r) => ids.has(String(r[parent.column]))).map((r) => r.id)
            );
            removeCascade(child, childIds);
          }
        }
      };
      for (const table of [...TABLES].reverse()) {
        removeCascade(table, new Set(changes.deletes[table]));
      }
      return { warnings: [] };
    },
  };
  repo.seed(initial);
  return repo;
};
