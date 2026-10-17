import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { trackApi } from '../apiTracking';
import { normalizeRowAssets } from '../assets';
import { ApplyReport, ObraRepository, StoreIdentity } from '../obraStore';
import { AnyRow, ChangeSet, RawRows, TABLES, TableName, emptyRawRows, filtrarRawRowsPorIdentidade } from '../obraRows';
import { SupabaseWriteError, upsertTolerant } from '../supabaseWrite';

const CHUNK = 100;

// Colunas de apoio recem-migradas que podem faltar: descartadas (e reportadas) em vez de bloquear o save.
const TOLERATED_COLUMNS: Partial<Record<TableName, string[]>> = {
  tarefa_evidencias: ['ordem'],
  registro_locacoes: ['quantidade', 'periodo'],
  punch_list_items: ['ordem'],
};

const CONFLICT_TARGET: Partial<Record<TableName, string>> = {
  decisao_assinaturas: 'decisao_id,papel',
};

const chunk = <T>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

const requireClient = (client: SupabaseClient | null): SupabaseClient => {
  if (!client) throw new Error('Supabase não configurado.');
  return client;
};

const selectAll = async (client: SupabaseClient, table: TableName, build?: (q: any) => any): Promise<AnyRow[]> => {
  const base = client.from(table).select('*');
  const { data, error } = await (build ? build(base) : base);
  if (error) throw new Error(`Falha ao ler ${table}: ${error.message}`);
  return (data || []) as AnyRow[];
};

const selectIn = async (client: SupabaseClient, table: TableName, column: string, ids: string[]): Promise<AnyRow[]> => {
  const out: AnyRow[] = [];
  for (const part of chunk(ids, CHUNK)) {
    out.push(...(await selectAll(client, table, (q) => q.in(column, part))));
  }
  return out;
};

export const createSupabaseObraRepository = (client: SupabaseClient | null = supabase): ObraRepository => ({
  async load(identity: StoreIdentity): Promise<RawRows> {
    const db = requireClient(client);
    return trackApi(async () => {
      // Construtor: filtro no servidor. Cliente: a RLS restringe e o filtro de acesso e reaplicado abaixo.
      const obras = await selectAll(db, 'obras', (q) =>
        identity.role === 'cliente' ? q : q.eq('construtor_id', identity.userId)
      );

      const raw = { ...emptyRawRows(), obras };
      const obraIds = obras.map((o) => o.id);
      if (obraIds.length === 0) return raw;

      const [etapas, decisoes, projetos, notas, punch, locacoes] = await Promise.all([
        selectIn(db, 'etapas', 'obra_id', obraIds),
        selectIn(db, 'decisoes', 'obra_id', obraIds),
        selectIn(db, 'projetos_pdf', 'obra_id', obraIds),
        selectIn(db, 'registro_notas', 'obra_id', obraIds),
        selectIn(db, 'punch_list_items', 'obra_id', obraIds),
        selectIn(db, 'registro_locacoes', 'obra_id', obraIds),
      ]);
      Object.assign(raw, {
        etapas,
        decisoes,
        projetos_pdf: projetos,
        registro_notas: notas,
        punch_list_items: punch,
        registro_locacoes: locacoes,
      });

      const [tarefas, assinaturas] = await Promise.all([
        selectIn(db, 'tarefas', 'etapa_id', etapas.map((e) => e.id)),
        selectIn(db, 'decisao_assinaturas', 'decisao_id', decisoes.map((d) => d.id)),
      ]);
      raw.tarefas = tarefas;
      raw.decisao_assinaturas = assinaturas;
      raw.tarefa_evidencias = await selectIn(db, 'tarefa_evidencias', 'tarefa_id', tarefas.map((t) => t.id));

      return filtrarRawRowsPorIdentidade(raw, identity);
    }, 'Carregando suas obras...');
  },

  async apply(changes: ChangeSet): Promise<ApplyReport> {
    const db = requireClient(client);
    return trackApi(async () => {
      const warnings: string[] = [];

      // 1. Upserts na ordem pai -> filho.
      for (const table of TABLES) {
        const rows = changes.upserts[table];
        if (rows.length === 0) continue;
        for (const part of chunk(rows, CHUNK)) {
          const prepared = await Promise.all(part.map((r) => normalizeRowAssets(table, r)));
          const { degradedColumns } = await upsertTolerant(
            table,
            prepared,
            (batch) => {
              const conflict = CONFLICT_TARGET[table];
              return Promise.resolve(
                db.from(table).upsert(batch, conflict ? { onConflict: conflict } : undefined)
              ) as Promise<{ error: { code?: string; message?: string } | null }>;
            },
            TOLERATED_COLUMNS[table]
          );
          degradedColumns.forEach((c) => warnings.push(`${table}.${c}`));
        }
      }

      // 2. Exclusoes na ordem filho -> pai (filhos de linhas excluidas ja foram podados).
      for (const table of [...TABLES].reverse()) {
        for (const part of chunk(changes.deletes[table], CHUNK)) {
          const { error } = await db.from(table).delete().in('id', part);
          if (error) throw new SupabaseWriteError(table, error);
        }
      }

      return { warnings: Array.from(new Set(warnings)) };
    }, 'Salvando na nuvem...');
  },
});

export const supabaseObraRepository: ObraRepository = createSupabaseObraRepository();
