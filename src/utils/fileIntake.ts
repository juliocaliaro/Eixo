/**
 * Entrada de arquivos do Eixo (fotos, notas, PDFs).
 *
 * Único ponto de normalização (compressão) e de envio ao Storage. Interface pública:
 *  - normalizeFile(file)            -> NormalizedFile (blob comprimido + preview)
 *  - storeNormalized(item, opts)    -> URL pública (lança UploadError se falhar)
 *  - blobToDataUrl(blob)            -> data URL (para contratos legados que ainda recebem base64)
 *
 * Política de compressão em um só lugar: INTAKE_POLICY.
 */
import { isPdfFile } from './fileUtils';
import { storageApi } from '../services/api';

export const INTAKE_POLICY = {
  maxDim: 1400,
  quality: 0.82,
  imageMime: 'image/jpeg',
  pdfMime: 'application/pdf',
} as const;

export interface NormalizedFile {
  blob: Blob;
  previewUrl: string;
  name: string;
  isPdf: boolean;
  mimeType: string;
}

export class UploadError extends Error {
  constructor(message = 'Falha ao enviar arquivo para o armazenamento.') {
    super(message);
    this.name = 'UploadError';
  }
}

/** Reduz proporcionalmente pelo maior lado, sem nunca ampliar. */
export function fitWithin(width: number, height: number, maxDim: number = INTAKE_POLICY.maxDim) {
  if (width <= maxDim && height <= maxDim) return { width, height };
  if (width > height) {
    return { width: maxDim, height: Math.round((height * maxDim) / width) };
  }
  return { width: Math.round((width * maxDim) / height), height: maxDim };
}

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export function extensionForMime(mime: string, fallback = 'bin'): string {
  return EXT_BY_MIME[mime] || fallback;
}

/** Tenta comprimir a imagem; em qualquer falha devolve null (o chamador usa o original). */
function compressImage(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    let objectUrl = '';
    const done = (blob: Blob | null) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };
    try {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const { width, height } = fitWithin(img.width, img.height);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return done(null);
          // JPEG não tem transparência: fundo branco evita áreas pretas em PNG
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => done(blob), INTAKE_POLICY.imageMime, INTAKE_POLICY.quality);
        } catch {
          done(null);
        }
      };
      img.onerror = () => done(null);
      img.src = objectUrl;
    } catch {
      done(null);
    }
  });
}

/**
 * Normaliza um arquivo: PDFs e tipos não-imagem passam intactos; imagens são
 * reduzidas (maxDim) e recodificadas em JPEG. Se a compressão falhar, devolve o original.
 */
export async function normalizeFile(file: File): Promise<NormalizedFile> {
  const name = file.name || 'arquivo';
  if (isPdfFile(file)) {
    return {
      blob: file,
      previewUrl: URL.createObjectURL(file),
      name,
      isPdf: true,
      mimeType: INTAKE_POLICY.pdfMime,
    };
  }

  let blob: Blob = file;
  if (file.type.startsWith('image/')) {
    const compressed = await compressImage(file);
    if (compressed) blob = compressed;
    else console.warn(`[fileIntake] Compressão falhou para "${name}"; usando arquivo original.`);
  }

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    name,
    isPdf: false,
    mimeType: blob.type || file.type || INTAKE_POLICY.imageMime,
  };
}

export function releasePreview(item: Pick<NormalizedFile, 'previewUrl'> | null | undefined) {
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new UploadError('Falha ao ler o arquivo.'));
    reader.readAsDataURL(blob);
  });
}

export interface StoreOptions {
  bucket: string;
  path: string;
  /** Buckets alternativos tentados em ordem se o principal falhar. */
  fallbackBuckets?: string[];
  /**
   * Somente quando TODOS os envios falharem: devolve um data URL (registrado em console).
   * Padrão false: o erro sobe para a UI exibir toast/mensagem.
   */
  dataUrlOnFailure?: boolean;
}

/** Envia o arquivo normalizado ao bucket e devolve a URL pública. */
export async function storeNormalized(
  item: Pick<NormalizedFile, 'blob' | 'mimeType'>,
  { bucket, path, fallbackBuckets = [], dataUrlOnFailure = false }: StoreOptions
): Promise<string> {
  for (const b of [bucket, ...fallbackBuckets]) {
    const url = await storageApi.uploadBlob(b, path, item.blob, item.mimeType);
    if (url) return url;
  }
  if (dataUrlOnFailure) {
    console.warn(`[fileIntake] Upload falhou em "${bucket}"; usando data URL como último recurso.`);
    return blobToDataUrl(item.blob);
  }
  throw new UploadError();
}

/** Caminho padrão com extensão coerente com o conteúdo normalizado. */
export function buildStoragePath(prefix: string, item: Pick<NormalizedFile, 'mimeType'>): string {
  return `${prefix}.${extensionForMime(item.mimeType, 'jpg')}`;
}

/** Atalho: normaliza e envia um arquivo único (sem manter preview). */
export async function storeFile(file: File, opts: StoreOptions): Promise<string> {
  const item = await normalizeFile(file);
  releasePreview(item);
  return storeNormalized(item, opts);
}
