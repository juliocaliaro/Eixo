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
import { isPdfFile, isHeicFile } from './fileUtils';
import { storageApi } from '../services/api';

export const INTAKE_POLICY = {
  maxDim: 1400,
  quality: 0.82,
  fallbackMaxDim: 1024,
  fallbackQuality: 0.70,
  maxAllowedFileSize: 1.5 * 1024 * 1024, // 1.5 MB para arquivos não comprimidos que falharam
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

export class ImageProcessingError extends Error {
  constructor(
    message = 'Não foi possível processar a imagem selecionada. A imagem é muito grande para a memória do dispositivo ou está corrompida.'
  ) {
    super(message);
    this.name = 'ImageProcessingError';
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

/**
 * Converte arquivos no formato HEIC / HEIF (comuns em iOS/iPhones) para JPEG.
 * Usa importação dinâmica de heic2any para compatibilidade com navegadores e bundlers,
 * convertendo o arquivo antes de passar pela rotina de compressão padrão.
 */
export async function convertHeicToJpeg(file: File | Blob): Promise<File | Blob> {
  try {
    const heic2anyModule = await import('heic2any');
    const heic2any = (heic2anyModule.default || heic2anyModule) as (options: {
      blob: Blob;
      toType?: string;
      quality?: number;
    }) => Promise<Blob | Blob[]>;

    const result = await heic2any({
      blob: file,
      toType: INTAKE_POLICY.imageMime,
      quality: INTAKE_POLICY.quality,
    });

    const convertedBlob = Array.isArray(result) ? result[0] : result;
    if (!convertedBlob) return file;

    const originalName = 'name' in file && typeof (file as any).name === 'string' ? (file as any).name : 'foto.heic';
    const newName = originalName.replace(/\.(heic|heif)$/i, '.jpg');

    if (typeof File !== 'undefined') {
      return new File([convertedBlob], newName, { type: INTAKE_POLICY.imageMime });
    }
    return convertedBlob;
  } catch (err) {
    console.warn('[fileIntake] Falha ao converter arquivo HEIC com heic2any:', err);
    throw new ImageProcessingError(
      'Não foi possível converter a foto no formato HEIC/HEIF do iPhone. Tente selecionar outra foto ou alterar o formato nas configurações da câmera para "Mais Compatível".'
    );
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), mime, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Desenha uma fonte (ImageBitmap ou HTMLImageElement) em canvas com suporte
 * a downscale em etapas (stepping) para evitar estouro de memória e artefatos
 * ao reduzir imagens gigantes (ex: fotos de 12MP-48MP de câmeras de celular).
 */
async function drawAndExportCanvas(
  source: ImageBitmap | HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  quality: number = INTAKE_POLICY.quality
): Promise<Blob | null> {
  let curWidth = source.width;
  let curHeight = source.height;

  // Se a redução for drástica (> 2x em qualquer dimensão), reduz em etapas (stepping) pela metade
  let stepCanvas: HTMLCanvasElement | null = null;
  let curSource: CanvasImageSource = source;

  while (curWidth / 2 >= targetWidth && curHeight / 2 >= targetHeight) {
    const nextWidth = Math.round(curWidth / 2);
    const nextHeight = Math.round(curHeight / 2);
    const canvas = document.createElement('canvas');
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (stepCanvas) {
        stepCanvas.width = 0;
        stepCanvas.height = 0;
      }
      return null;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(curSource, 0, 0, nextWidth, nextHeight);

    if (stepCanvas) {
      stepCanvas.width = 0;
      stepCanvas.height = 0;
    }
    stepCanvas = canvas;
    curSource = canvas;
    curWidth = nextWidth;
    curHeight = nextHeight;
  }

  // Canvas final
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) {
    if (stepCanvas) {
      stepCanvas.width = 0;
      stepCanvas.height = 0;
    }
    return null;
  }

  // Preenche fundo branco (evita áreas pretas se a imagem original possuir transparência)
  finalCtx.fillStyle = '#ffffff';
  finalCtx.fillRect(0, 0, targetWidth, targetHeight);
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(curSource, 0, 0, targetWidth, targetHeight);

  if (stepCanvas) {
    stepCanvas.width = 0;
    stepCanvas.height = 0;
  }

  const blob = await canvasToBlob(finalCanvas, INTAKE_POLICY.imageMime, quality);

  // Libera buffer de canvas
  finalCanvas.width = 0;
  finalCanvas.height = 0;

  return blob;
}

/**
 * Tenta comprimir a imagem usando createImageBitmap nativo com resizeOptions quando disponível.
 * Isso decodifica a imagem diretamente nas dimensões alvo, economizando memória no mobile.
 */
async function compressWithImageBitmap(
  file: File,
  targetMaxDim: number,
  quality: number
): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function') return null;

  try {
    // 1. Tenta decodificação direta com resize no createImageBitmap (evita carregar bitmap de 12MP em memória)
    try {
      const bmpPreview = await createImageBitmap(file);
      const { width, height } = fitWithin(bmpPreview.width, bmpPreview.height, targetMaxDim);
      bmpPreview.close();

      const resizedBitmap = await createImageBitmap(file, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high',
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resizedBitmap.close();
        return null;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(resizedBitmap, 0, 0, width, height);
      resizedBitmap.close();

      const blob = await canvasToBlob(canvas, INTAKE_POLICY.imageMime, quality);
      canvas.width = 0;
      canvas.height = 0;
      return blob;
    } catch {
      // Se options de resize não forem suportadas pelo navegador, decodifica bitmap puro
      const rawBmp = await createImageBitmap(file);
      const { width, height } = fitWithin(rawBmp.width, rawBmp.height, targetMaxDim);
      const blob = await drawAndExportCanvas(rawBmp, width, height, quality);
      rawBmp.close();
      return blob;
    }
  } catch {
    return null;
  }
}

/**
 * Fallback clássico usando Image e canvas com stepping downscale.
 */
function compressWithImageElement(
  file: File,
  targetMaxDim: number,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    let objectUrl = '';
    const cleanUp = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = '';
      }
    };

    try {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        try {
          const { width, height } = fitWithin(img.width, img.height, targetMaxDim);
          const blob = await drawAndExportCanvas(img, width, height, quality);
          cleanUp();
          resolve(blob);
        } catch {
          cleanUp();
          resolve(null);
        }
      };
      img.onerror = () => {
        cleanUp();
        resolve(null);
      };
      img.src = objectUrl;
    } catch {
      cleanUp();
      resolve(null);
    }
  });
}

/**
 * Tenta comprimir a imagem com estratégias resilientes:
 * 1. createImageBitmap (otimizado para memória) com maxDim padrão.
 * 2. Fallback Image element com stepping downscale com maxDim padrão.
 * 3. Se falhar, retenta com parâmetros conservadores (fallbackMaxDim 1024, qualidade 0.70).
 */
async function compressImageResilient(file: File): Promise<Blob | null> {
  // Passada 1: Dimensão e qualidade padrão (1400px, 0.82)
  let blob = await compressWithImageBitmap(file, INTAKE_POLICY.maxDim, INTAKE_POLICY.quality);
  if (blob) return blob;

  blob = await compressWithImageElement(file, INTAKE_POLICY.maxDim, INTAKE_POLICY.quality);
  if (blob) return blob;

  // Passada 2: Fallback conservador (1024px, 0.70) para dispositivos sob pressão de memória
  blob = await compressWithImageBitmap(file, INTAKE_POLICY.fallbackMaxDim, INTAKE_POLICY.fallbackQuality);
  if (blob) return blob;

  blob = await compressWithImageElement(file, INTAKE_POLICY.fallbackMaxDim, INTAKE_POLICY.fallbackQuality);
  return blob;
}

/**
 * Normaliza um arquivo: PDFs e tipos não-imagem passam intactos; imagens são
 * reduzidas (maxDim) e recodificadas em JPEG.
 * Arquivos HEIC/HEIF são automaticamente convertidos para JPEG antes da normalização.
 *
 * Se a compressão falhar:
 * - Se o arquivo for pequeno/moderado (<= 1.5MB), aceita com aviso.
 * - Se o arquivo for grande (> 1.5MB), recusa com ImageProcessingError para evitar
 *   quebrar o preview ou estourar a memória/payload da requisição.
 */
export async function normalizeFile(file: File): Promise<NormalizedFile> {
  if (isPdfFile(file)) {
    const name = file.name || 'arquivo';
    return {
      blob: file,
      previewUrl: URL.createObjectURL(file),
      name,
      isPdf: true,
      mimeType: INTAKE_POLICY.pdfMime,
    };
  }

  let processedFile = file;

  // Detecta se é arquivo HEIC/HEIF (iOS) e converte previamente para JPEG
  if (isHeicFile(file)) {
    const converted = await convertHeicToJpeg(file);
    if (converted instanceof File) {
      processedFile = converted;
    } else {
      const origName = file.name || 'foto.heic';
      processedFile = new File([converted], origName.replace(/\.(heic|heif)$/i, '.jpg'), {
        type: INTAKE_POLICY.imageMime,
      });
    }
  }

  const name = processedFile.name || 'arquivo';
  let blob: Blob = processedFile;
  const isImage = processedFile.type.startsWith('image/') || isHeicFile(file);

  if (isImage) {
    const compressed = await compressImageResilient(processedFile);
    if (compressed) {
      blob = compressed;
    } else {
      if (processedFile.size > INTAKE_POLICY.maxAllowedFileSize) {
        console.error(
          `[fileIntake] Compressão falhou e a imagem "${name}" (${(processedFile.size / (1024 * 1024)).toFixed(
            2
          )}MB) excede o limite permitido.`
        );
        throw new ImageProcessingError(
          `A foto "${name}" é muito grande ou não pôde ser processada pela memória do aparelho. Tente tirar outra foto ou reduzir sua resolução.`
        );
      }
      console.warn(`[fileIntake] Compressão falhou para "${name}"; usando arquivo original.`);
    }
  }

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    name,
    isPdf: false,
    mimeType: blob.type || processedFile.type || INTAKE_POLICY.imageMime,
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
