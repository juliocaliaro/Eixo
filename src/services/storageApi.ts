import { supabase } from './supabaseClient';
import { trackApi } from './apiTracking';

/**
 * Object Storage (Supabase). Todas as operacoes de envio lancam erro em caso de falha:
 * nao ha fallback para base64 nem para armazenamento local.
 */

export class StorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

const client = () => {
  if (!supabase) throw new StorageError('Supabase não configurado.');
  return supabase;
};

// Bucket de reserva quando 'registro-notas' nao aceita o envio (unica regra de fallback do sistema).
const FALLBACK_BUCKET = 'evidencias-diario';

const publicUrl = (bucket: string, path: string): string => {
  const { data } = client().storage.from(bucket).getPublicUrl(path);
  if (!data.publicUrl) throw new StorageError(`URL pública indisponível para ${bucket}/${path}.`);
  return data.publicUrl;
};

const uploadWithFallback = async (
  bucket: string,
  path: string,
  body: Blob | File,
  contentType?: string
): Promise<string> => {
  const options = contentType ? { contentType, upsert: true } : { upsert: true };
  const first = await client().storage.from(bucket).upload(path, body, options);
  if (!first.error) return publicUrl(bucket, path);
  if (bucket === 'registro-notas') {
    const second = await client().storage.from(FALLBACK_BUCKET).upload(path, body, options);
    if (!second.error) return publicUrl(FALLBACK_BUCKET, path);
  }
  throw new StorageError(`Falha ao enviar arquivo para ${bucket}: ${first.error.message}`, first.error);
};

export const storageApi = {
  dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } | null {
    try {
      const arr = dataUrl.split(',');
      if (arr.length < 2) return null;
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return { blob: new Blob([u8arr], { type: mime }), mime };
    } catch {
      return null;
    }
  },

  async uploadBlob(bucket: string, path: string, blob: Blob, mimeType = 'image/jpeg'): Promise<string> {
    return trackApi(() => uploadWithFallback(bucket, path, blob, mimeType), 'Enviando imagem...');
  },

  async uploadFile(bucket: string, path: string, file: File): Promise<string> {
    return trackApi(() => uploadWithFallback(bucket, path, file), 'Enviando arquivo para o armazenamento...');
  },

  /**
   * Normalizacao data-URL -> Storage (unico ponto). URLs que ja sao remotas voltam intactas.
   */
  async uploadDataUrl(bucket: string, path: string, dataUrl: string): Promise<string> {
    if (!dataUrl.startsWith('data:')) return dataUrl;
    const parsed = this.dataUrlToBlob(dataUrl);
    if (!parsed) throw new StorageError('Arquivo embutido (data URL) inválido.');
    const ext = ['png', 'pdf'].find((e) => parsed.mime.includes(e)) ?? 'jpg';
    const fullPath = /\.[a-zA-Z0-9]+$/.test(path) ? path : `${path}.${ext}`;
    return uploadWithFallback(bucket, fullPath, parsed.blob, parsed.mime);
  },

  /**
   * Remove um arquivo a partir da URL publica. E limpeza best-effort: falhar aqui nao deve
   * impedir a exclusao do registro, entao devolve false (e registra no console) em vez de lancar.
   */
  async deleteFileFromUrl(bucket: string, url: string): Promise<boolean> {
    if (!supabase || !url) return false;
    if (url.startsWith('data:') || url.startsWith('blob:')) return false;
    try {
      const marker = `/${bucket}/`;
      const idx = url.indexOf(marker);
      if (idx === -1) return false;
      const filePath = decodeURIComponent(url.substring(idx + marker.length).split('?')[0]);
      if (!filePath) return false;
      const { error } = await supabase.storage.from(bucket).remove([filePath]);
      if (error) {
        console.warn(`Erro ao excluir arquivo ${filePath} no bucket ${bucket}:`, error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn(`Falha ao excluir arquivo do bucket ${bucket}:`, err);
      return false;
    }
  },
};
