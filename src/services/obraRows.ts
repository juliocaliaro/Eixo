import { Obra } from '../types/obra';
import { generateUUID } from '../utils/uuid';
import { AccessIdentity, filtrarObrasVisiveis } from './obraAccess';
import {
  ObraRow,
  EtapaRow,
  TarefaRow,
  TarefaEvidenciaRow,
  DecisaoRow,
  DecisaoAssinaturaRow,
  ProjetoPdfRow,
  RegistroNotaRow,
  PunchListItemRow,
  RegistroLocacaoRow,
  mapObraFromDb,
  mapEtapaFromDb,
  mapTarefaFromDb,
  mapDecisaoFromDb,
  mapProjetoFromDb,
  mapNotaFromDb,
  mapPunchItemFromDb,
  mapLocacaoFromDb,
  toObraRow,
  toEtapaRow,
  toTarefaRow,
  toEvidenciaRow,
  toDecisaoRow,
  toAssinaturaRow,
  toProjetoRow,
  toNotaRow,
  toPunchRow,
  toLocacaoRow,
} from './dbTypes';

/**
 * Representacao relacional do estado das obras: uma colecao de linhas por tabela.
 * - flattenObras: Obra[] -> RowSet (inverso de assembleObras)
 * - diffRowSets: RowSet x RowSet -> ChangeSet (somente o que mudou)
 * Este modulo e puro; nao conhece Supabase.
 */

export const TABLES = [
  'obras',
  'etapas',
  'tarefas',
  'tarefa_evidencias',
  'decisoes',
  'decisao_assinaturas',
  'projetos_pdf',
  'registro_notas',
  'punch_list_items',
  'registro_locacoes',
] as const;

export type TableName = (typeof TABLES)[number];

export type AnyRow = { id: string } & Record<string, unknown>;

/** Linhas brutas de cada tabela, como lidas do banco. */
export type RawRows = Record<TableName, AnyRow[]>;

/** Linhas indexadas por chave logica (id, ou chave natural para evidencias/assinaturas). */
export type RowSet = Record<TableName, Map<string, AnyRow>>;

export interface ChangeSet {
  upserts: Record<TableName, AnyRow[]>;
  /** ids das linhas a excluir (filhos de pais excluidos ja foram podados: o banco exclui em cascata). */
  deletes: Record<TableName, string[]>;
}

const perTable = <T>(make: () => T): Record<TableName, T> =>
  Object.fromEntries(TABLES.map((t) => [t, make()])) as Record<TableName, T>;

export const emptyRawRows = (): RawRows => perTable<AnyRow[]>(() => []);

export const emptyRowSet = (): RowSet => perTable(() => new Map<string, AnyRow>());

export const emptyChangeSet = (): ChangeSet => ({
  upserts: perTable<AnyRow[]>(() => []),
  deletes: perTable<string[]>(() => []),
});

export const isEmptyChangeSet = (c: ChangeSet): boolean =>
  TABLES.every((t) => c.upserts[t].length === 0 && c.deletes[t].length === 0);

// Tabelas cuja identidade logica nao e o id: o id e reaproveitado do estado conhecido.
const rowKey = (table: TableName, row: AnyRow): string => {
  if (table === 'tarefa_evidencias') {
    return `${row.tarefa_id}|${row.tipo}|${row.conteudo}`;
  }
  if (table === 'decisao_assinaturas') {
    return `${row.decisao_id}|${row.papel}`;
  }
  return row.id;
};

/** Indexa linhas brutas por chave logica. Chaves duplicadas (evidencias iguais) recebem sufixo de ocorrencia. */
export const indexRows = (raw: RawRows): RowSet => {
  const set = emptyRowSet();
  for (const table of TABLES) {
    const occurrences = new Map<string, number>();
    for (const row of raw[table]) {
      const base = rowKey(table, row);
      const n = occurrences.get(base) || 0;
      occurrences.set(base, n + 1);
      set[table].set(n === 0 ? base : `${base}#${n}`, row);
    }
  }
  return set;
};

const asRaw = (set: RowSet): RawRows =>
  Object.fromEntries(TABLES.map((t) => [t, Array.from(set[t].values())])) as RawRows;

export interface FlattenOptions {
  /** Construtor padrao para obras sem construtorId (obra recem criada). */
  construtorId?: string | null;
  /** Estado conhecido: fornece os ids ja existentes das linhas de chave natural. */
  known?: RowSet;
}

export const flattenObras = (obras: Obra[], opts: FlattenOptions = {}): RowSet => {
  const out = emptyRowSet();
  const known = opts.known;
  const asAny = (row: object) => row as unknown as AnyRow;

  // Chave logica livre em `out`: duplicatas ganham sufixo de ocorrencia (mesma regra de indexRows).
  const freeKey = (table: TableName, row: AnyRow): string => {
    const base = rowKey(table, row);
    let key = base;
    for (let n = 1; out[table].has(key); n++) key = `${base}#${n}`;
    return key;
  };

  const put = (table: TableName, row: AnyRow) => {
    out[table].set(freeKey(table, row), row);
  };

  // Linhas de chave natural: reaproveita o id conhecido, senao gera um novo.
  const putNatural = (table: TableName, draft: object) => {
    const row = asAny(draft);
    row.id = known?.[table].get(freeKey(table, row))?.id ?? generateUUID();
    put(table, row);
  };

  for (const obra of obras) {
    put('obras', asAny(toObraRow(obra, { construtorId: opts.construtorId })));

    (obra.etapas || []).forEach((etapa, eIdx) => {
      put('etapas', asAny(toEtapaRow(etapa, obra.id, eIdx + 1)));

      (etapa.tarefas || []).forEach((tarefa, tIdx) => {
        put('tarefas', asAny(toTarefaRow(tarefa, etapa.id, tIdx + 1)));

        (tarefa.fotos || []).forEach((foto, i) =>
          putNatural('tarefa_evidencias', toEvidenciaRow('', tarefa.id, 'foto', foto, i))
        );
        (tarefa.anotacoes || []).forEach((nota, i) =>
          putNatural('tarefa_evidencias', toEvidenciaRow('', tarefa.id, 'anotacao', nota, i))
        );
      });
    });

    (obra.decisoes || []).forEach((d) => {
      put('decisoes', asAny(toDecisaoRow(d, obra.id)));
      if (d.assinaturaCriador) {
        putNatural('decisao_assinaturas', toAssinaturaRow('', d.assinaturaCriador, d.id, 'criador'));
      }
      if (d.assinaturaContraparte) {
        putNatural('decisao_assinaturas', toAssinaturaRow('', d.assinaturaContraparte, d.id, 'contraparte'));
      }
    });

    (obra.projetos || []).forEach((p) => put('projetos_pdf', asAny(toProjetoRow(p, obra.id))));
    (obra.notas || []).forEach((n) => put('registro_notas', asAny(toNotaRow(n, obra.id))));
    (obra.punchList || []).forEach((p, i) => put('punch_list_items', asAny(toPunchRow(p, obra.id, i + 1))));
    (obra.locacoes || []).forEach((l) => put('registro_locacoes', asAny(toLocacaoRow(l, obra.id))));
  }

  return out;
};

const byOrdem = <T extends { ordem?: number | null; created_at?: string }>(a: T, b: T) =>
  (a.ordem ?? 0) - (b.ordem ?? 0) || (a.created_at || '').localeCompare(b.created_at || '');

const byCreatedDesc = <T extends { created_at?: string }>(a: T, b: T) =>
  (b.created_at || '').localeCompare(a.created_at || '');

const groupBy = <T>(rows: T[], key: (r: T) => string): Map<string, T[]> => {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = m.get(k);
    if (arr) arr.push(r);
    else m.set(k, [r]);
  }
  return m;
};

/** Monta Obra[] a partir das linhas brutas (usado por todos os repositorios). */
export const assembleObras = (raw: RawRows): Obra[] => {
  const obras = (raw.obras as unknown as ObraRow[]).slice().sort(byCreatedDesc);
  const etapas = raw.etapas as unknown as EtapaRow[];
  const tarefas = raw.tarefas as unknown as TarefaRow[];
  const evidencias = raw.tarefa_evidencias as unknown as TarefaEvidenciaRow[];
  const decisoes = raw.decisoes as unknown as DecisaoRow[];
  const assinaturas = raw.decisao_assinaturas as unknown as DecisaoAssinaturaRow[];
  const projetos = raw.projetos_pdf as unknown as ProjetoPdfRow[];
  const notas = raw.registro_notas as unknown as RegistroNotaRow[];
  const punch = raw.punch_list_items as unknown as PunchListItemRow[];
  const locacoes = raw.registro_locacoes as unknown as RegistroLocacaoRow[];

  const etapasByObra = groupBy(etapas.slice().sort(byOrdem), (e) => e.obra_id);
  const tarefasByEtapa = groupBy(tarefas.slice().sort(byOrdem), (t) => t.etapa_id);
  const evByTarefa = groupBy(evidencias, (e) => e.tarefa_id);
  const assByDecisao = groupBy(assinaturas, (a) => a.decisao_id);
  const decByObra = groupBy(decisoes.slice().sort(byCreatedDesc), (d) => d.obra_id);
  const projByObra = groupBy(projetos.slice().sort(byCreatedDesc), (p) => p.obra_id);
  const notasByObra = groupBy(notas.slice().sort(byCreatedDesc), (n) => n.obra_id);
  const punchByObra = groupBy(punch.slice().sort(byOrdem), (p) => p.obra_id);
  const locByObra = groupBy(
    locacoes.slice().sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || '')),
    (l) => l.obra_id
  );

  return obras.map((row) => {
    const etapasObra = (etapasByObra.get(row.id) || []).map((e) =>
      mapEtapaFromDb(
        e,
        (tarefasByEtapa.get(e.id) || []).map((t) => mapTarefaFromDb(t, evByTarefa.get(t.id) || []))
      )
    );
    return mapObraFromDb(
      row,
      etapasObra,
      (decByObra.get(row.id) || []).map((d) => mapDecisaoFromDb(d, assByDecisao.get(d.id) || [])),
      (projByObra.get(row.id) || []).map(mapProjetoFromDb),
      (notasByObra.get(row.id) || []).map(mapNotaFromDb),
      (punchByObra.get(row.id) || []).map(mapPunchItemFromDb),
      (locByObra.get(row.id) || []).map(mapLocacaoFromDb)
    );
  });
};

/**
 * Aplica a regra de acesso sobre as linhas de obras e descarta as linhas filhas
 * de obras que a identidade nao enxerga. Nunca devolve resultado sem filtro.
 */
export const filtrarRawRowsPorIdentidade = (raw: RawRows, identity: AccessIdentity): RawRows => {
  const obrasRows = raw.obras as unknown as ObraRow[];
  const visiveis = new Set(
    filtrarObrasVisiveis(
      obrasRows.map((r) => mapObraFromDb(r)),
      identity
    ).map((o) => o.id)
  );

  // Cada nivel so mantem linhas cujo pai sobreviveu ao filtro.
  const keepWhere = (table: TableName, parentColumn: string, parentIds: Set<string>): AnyRow[] =>
    raw[table].filter((r) => parentIds.has(String(r[parentColumn])));
  const idsOf = (rows: AnyRow[]) => new Set(rows.map((r) => r.id));

  const etapas = keepWhere('etapas', 'obra_id', visiveis);
  const tarefas = keepWhere('tarefas', 'etapa_id', idsOf(etapas));
  const decisoes = keepWhere('decisoes', 'obra_id', visiveis);
  return {
    obras: raw.obras.filter((r) => visiveis.has(r.id)),
    etapas,
    tarefas,
    tarefa_evidencias: keepWhere('tarefa_evidencias', 'tarefa_id', idsOf(tarefas)),
    decisoes,
    decisao_assinaturas: keepWhere('decisao_assinaturas', 'decisao_id', idsOf(decisoes)),
    projetos_pdf: keepWhere('projetos_pdf', 'obra_id', visiveis),
    registro_notas: keepWhere('registro_notas', 'obra_id', visiveis),
    punch_list_items: keepWhere('punch_list_items', 'obra_id', visiveis),
    registro_locacoes: keepWhere('registro_locacoes', 'obra_id', visiveis),
  };
};

const stable = (v: unknown): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(',')}}`;
};

export const PARENTS: Partial<Record<TableName, { table: TableName; column: string }>> = {
  etapas: { table: 'obras', column: 'obra_id' },
  tarefas: { table: 'etapas', column: 'etapa_id' },
  tarefa_evidencias: { table: 'tarefas', column: 'tarefa_id' },
  decisoes: { table: 'obras', column: 'obra_id' },
  decisao_assinaturas: { table: 'decisoes', column: 'decisao_id' },
  projetos_pdf: { table: 'obras', column: 'obra_id' },
  registro_notas: { table: 'obras', column: 'obra_id' },
  punch_list_items: { table: 'obras', column: 'obra_id' },
  registro_locacoes: { table: 'obras', column: 'obra_id' },
};

/**
 * Diferenca entre dois estados: linhas novas/alteradas viram upserts; linhas que
 * sumiram viram deletes. Isso reconcilia toda exclusao (obra, etapa, tarefa, foto,
 * decisao, locacao, nota, projeto, item de vistoria) sem tombstones.
 */
export const diffRowSets = (prev: RowSet, next: RowSet): ChangeSet => {
  const changes = emptyChangeSet();
  const fullDeletes = perTable(() => new Set<string>());
  const deletedRows = perTable<AnyRow[]>(() => []);

  for (const table of TABLES) {
    for (const [key, row] of next[table]) {
      const before = prev[table].get(key);
      if (!before || stable(before) !== stable(row)) {
        changes.upserts[table].push(row);
      }
    }
    for (const [key, row] of prev[table]) {
      if (!next[table].has(key)) {
        fullDeletes[table].add(row.id);
        deletedRows[table].push(row);
      }
    }
  }

  // Poda: filhos de pais excluidos sao removidos em cascata pelo banco.
  for (const table of TABLES) {
    const parent = PARENTS[table];
    changes.deletes[table] = deletedRows[table]
      .filter((row) => !parent || !fullDeletes[parent.table].has(String(row[parent.column])))
      .map((row) => row.id);
  }

  return changes;
};

export const rowSetToRaw = asRaw;
