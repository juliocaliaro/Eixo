import { storageApi } from './storageApi';
import { AnyRow, TableName } from './obraRows';

/**
 * Normalizacao de arquivos embutidos (data URL) para o Object Storage, aplicada
 * imediatamente antes de gravar uma linha. Unico ponto do sistema que faz esse trabalho
 * para as linhas de obra. Lanca erro se o envio falhar (a gravacao nao acontece).
 */

const isDataUrl = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:');

const uploadAll = async (bucket: string, prefix: string, urls: unknown): Promise<string[]> => {
  const list = Array.isArray(urls) ? (urls as string[]) : [];
  const out: string[] = [];
  for (let i = 0; i < list.length; i++) {
    out.push(isDataUrl(list[i]) ? await storageApi.uploadDataUrl(bucket, `${prefix}_${i}`, list[i]) : list[i]);
  }
  return out;
};

const safeName = (name: unknown) => String(name || 'arquivo').replace(/[^a-zA-Z0-9._-]/g, '_');

// Tabelas com lista de fotos embutidas: bucket e pasta de destino.
const FOTOS_DESTINO: Partial<Record<TableName, { bucket: string; folder: string }>> = {
  registro_notas: { bucket: 'registro-notas', folder: 'notas' },
  registro_locacoes: { bucket: 'registro-notas', folder: 'locacoes' },
  decisoes: { bucket: 'evidencias-diario', folder: 'decisoes' },
};

export const normalizeRowAssets = async (table: TableName, row: AnyRow): Promise<AnyRow> => {
  const fotosDestino = FOTOS_DESTINO[table];
  if (fotosDestino) {
    if (!(row.fotos as unknown[]).some(isDataUrl)) return row;
    const prefix = `${row.obra_id}/${fotosDestino.folder}/${row.id}`;
    return { ...row, fotos: await uploadAll(fotosDestino.bucket, prefix, row.fotos) };
  }

  switch (table) {
    case 'projetos_pdf':
      if (!isDataUrl(row.url)) return row;
      return {
        ...row,
        url: await storageApi.uploadDataUrl(
          'projetos-pdf',
          `${row.obra_id}/projetos/${row.id}_${safeName(row.arquivo_nome)}`,
          row.url
        ),
      };
    case 'tarefa_evidencias':
      if (row.tipo !== 'foto' || !isDataUrl(row.conteudo)) return row;
      return {
        ...row,
        conteudo: await storageApi.uploadDataUrl('evidencias-diario', `diario/${row.tarefa_id}_${row.id}`, row.conteudo),
      };
    default:
      return row;
  }
};
