import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const uploadBlob = vi.fn();
vi.mock('../services/api', () => ({ storageApi: { uploadBlob: (...a: any[]) => uploadBlob(...a) } }));

const mockHeic2any = vi.fn();
vi.mock('heic2any', () => ({
  default: (...args: any[]) => mockHeic2any(...args),
}));

import {
  INTAKE_POLICY,
  fitWithin,
  normalizeFile,
  convertHeicToJpeg,
  storeNormalized,
  UploadError,
  ImageProcessingError,
  extensionForMime,
  buildStoragePath,
} from '../utils/fileIntake';
import { isHeicFile } from '../utils/fileUtils';

function installCanvas(opts: { w: number; h: number; ctx?: boolean; blob?: boolean; imgError?: boolean }) {
  const drawn: any = { stepCanvasCount: 0 };
  (globalThis as any).Image = class {
    width = opts.w;
    height = opts.h;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_v: string) {
      setTimeout(() => (opts.imgError ? this.onerror?.() : this.onload?.()), 0);
    }
  };
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () =>
            opts.ctx === false
              ? null
              : {
                  fillStyle: '',
                  imageSmoothingEnabled: false,
                  imageSmoothingQuality: 'low',
                  fillRect: () => {},
                  drawImage: (_i: any, _x: number, _y: number, w: number, h: number) => {
                    drawn.stepCanvasCount++;
                    Object.assign(drawn, { w, h });
                  },
                },
          toBlob(cb: (b: Blob | null) => void, mime: string, q: number) {
            Object.assign(drawn, { mime, q });
            cb(opts.blob === false ? null : new Blob(['x'], { type: mime }));
          },
        };
      }
      return {};
    },
  };
  return drawn;
}

describe('isHeicFile', () => {
  it('detecta arquivos HEIC/HEIF por tipo MIME ou extensao', () => {
    expect(isHeicFile(new File(['x'], 'foto.heic', { type: '' }))).toBe(true);
    expect(isHeicFile(new File(['x'], 'foto.HEIF', { type: '' }))).toBe(true);
    expect(isHeicFile(new File(['x'], 'foto.jpg', { type: 'image/heic' }))).toBe(true);
    expect(isHeicFile(new File(['x'], 'foto.jpg', { type: 'image/heif' }))).toBe(true);
    expect(isHeicFile(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))).toBe(false);
    expect(isHeicFile(new File(['x'], 'documento.pdf', { type: 'application/pdf' }))).toBe(false);
    expect(isHeicFile(null)).toBe(false);
  });
});

describe('convertHeicToJpeg', () => {
  beforeEach(() => {
    mockHeic2any.mockReset();
  });

  it('converte arquivo HEIC chamando heic2any e renomeia extensao para .jpg', async () => {
    const fakeConvertedBlob = new Blob(['converted-jpeg'], { type: 'image/jpeg' });
    mockHeic2any.mockResolvedValue(fakeConvertedBlob);

    const heicFile = new File(['raw-heic'], 'obra_iphone.heic', { type: 'image/heic' });
    const result = await convertHeicToJpeg(heicFile);

    expect(mockHeic2any).toHaveBeenCalledWith({
      blob: heicFile,
      toType: INTAKE_POLICY.imageMime,
      quality: INTAKE_POLICY.quality,
    });
    expect(result).toBeInstanceOf(File);
    expect((result as File).name).toBe('obra_iphone.jpg');
    expect(result.type).toBe('image/jpeg');
  });

  it('lanca ImageProcessingError com mensagem clara se a conversao HEIC falhar', async () => {
    mockHeic2any.mockRejectedValue(new Error('HEIC decoding failed'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const heicFile = new File(['corrupted'], 'danificado.heic', { type: 'image/heic' });
    await expect(convertHeicToJpeg(heicFile)).rejects.toThrow(ImageProcessingError);
    await expect(convertHeicToJpeg(heicFile)).rejects.toThrow(/HEIC\/HEIF do iPhone/);

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('fitWithin', () => {
  it('reduz pelo maior lado mantendo proporcao', () => {
    expect(fitWithin(2800, 1400)).toEqual({ width: 1400, height: 700 });
    expect(fitWithin(1000, 4200)).toEqual({ width: 333, height: 1400 });
  });
  it('nunca amplia', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1400, 1400)).toEqual({ width: 1400, height: 1400 });
  });
});

describe('normalizeFile', () => {
  beforeEach(() => {
    mockHeic2any.mockReset();
  });

  afterEach(() => {
    delete (globalThis as any).Image;
    delete (globalThis as any).document;
    delete (globalThis as any).createImageBitmap;
  });

  it('PDF passa intacto, sem tocar em canvas', async () => {
    const pdf = new File(['%PDF'], 'planta.pdf', { type: 'application/pdf' });
    const r = await normalizeFile(pdf);
    expect(r.blob).toBe(pdf);
    expect(r.isPdf).toBe(true);
    expect(r.mimeType).toBe('application/pdf');
  });

  it('imagem e reduzida e recodificada em jpeg com a qualidade da politica', async () => {
    const drawn = installCanvas({ w: 2800, h: 1400 });
    const r = await normalizeFile(new File(['abc'], 'a.png', { type: 'image/png' }));
    expect(drawn).toMatchObject({ w: 1400, h: 700, mime: INTAKE_POLICY.imageMime, q: INTAKE_POLICY.quality });
    expect(r.blob.type).toBe('image/jpeg');
    expect(r.mimeType).toBe('image/jpeg');
    expect(r.isPdf).toBe(false);
  });

  it('processa e normaliza foto HEIC convertendo-a para JPEG', async () => {
    const fakeConvertedBlob = new Blob(['converted-jpeg'], { type: 'image/jpeg' });
    mockHeic2any.mockResolvedValue(fakeConvertedBlob);
    installCanvas({ w: 1200, h: 800 });

    const heicFile = new File(['heic-content'], 'foto_obra.heic', { type: 'image/heic' });
    const r = await normalizeFile(heicFile);

    expect(mockHeic2any).toHaveBeenCalled();
    expect(r.name).toBe('foto_obra.jpg');
    expect(r.mimeType).toBe('image/jpeg');
    expect(r.isPdf).toBe(false);
  });

  it('usa stepping (downscale em etapas) para imagens gigantes evitando estouro e degradação', async () => {
    // 6000 x 4000 reduzido para 1400 x 933 (> 2x redução) deve disparar passos intermediários
    const drawn = installCanvas({ w: 6000, h: 4000 });
    await normalizeFile(new File(['huge'], 'huge.jpg', { type: 'image/jpeg' }));
    expect(drawn.stepCanvasCount).toBeGreaterThan(1);
    expect(drawn.w).toBe(1400);
    expect(drawn.h).toBe(933);
  });

  it('prioriza createImageBitmap com resizeOptions quando suportado', async () => {
    const drawn = installCanvas({ w: 4000, h: 3000 });
    let usedBitmapOptions: any = null;
    (globalThis as any).createImageBitmap = vi.fn().mockImplementation(async (_f: any, opts?: any) => {
      if (opts) {
        usedBitmapOptions = opts;
        return {
          width: opts.resizeWidth,
          height: opts.resizeHeight,
          close: vi.fn(),
        };
      }
      return {
        width: 4000,
        height: 3000,
        close: vi.fn(),
      };
    });

    const r = await normalizeFile(new File(['data'], 'foto.jpg', { type: 'image/jpeg' }));
    expect((globalThis as any).createImageBitmap).toHaveBeenCalled();
    expect(usedBitmapOptions).toEqual({
      resizeWidth: 1400,
      resizeHeight: 1050,
      resizeQuality: 'high',
    });
    expect(r.blob.type).toBe('image/jpeg');
  });

  it.each([
    ['sem contexto 2d', { w: 10, h: 10, ctx: false }],
    ['toBlob nulo', { w: 10, h: 10, blob: false }],
    ['erro ao decodificar', { w: 10, h: 10, imgError: true }],
  ])('falha de compressão em arquivo pequeno (<= 1.5MB) (%s) devolve o original com aviso', async (_n, o) => {
    installCanvas(o);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const file = new File(['abc'], 'a.png', { type: 'image/png' });
    const r = await normalizeFile(file);
    expect(r.blob).toBe(file);
    expect(r.mimeType).toBe('image/png');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('recusa e lança ImageProcessingError se compressão falhar e arquivo for gigante (> 1.5MB)', async () => {
    installCanvas({ w: 10, h: 10, ctx: false });
    const errLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Simula arquivo de 2MB
    const bigArray = new Uint8Array(2 * 1024 * 1024);
    const bigFile = new File([bigArray], 'foto_gigante.jpg', { type: 'image/jpeg' });

    await expect(normalizeFile(bigFile)).rejects.toThrow(ImageProcessingError);
    expect(errLog).toHaveBeenCalled();
    errLog.mockRestore();
  });

  it('tipo nao imagem passa direto', async () => {
    const f = new File(['x'], 'a.txt', { type: 'text/plain' });
    expect((await normalizeFile(f)).blob).toBe(f);
  });
});

describe('storeNormalized', () => {
  beforeEach(() => uploadBlob.mockReset());
  const item = { blob: new Blob(['x'], { type: 'image/jpeg' }), mimeType: 'image/jpeg' };

  it('devolve a URL do bucket', async () => {
    uploadBlob.mockResolvedValue('https://cdn/x.jpg');
    expect(await storeNormalized(item, { bucket: 'b', path: 'p.jpg' })).toBe('https://cdn/x.jpg');
    expect(uploadBlob).toHaveBeenCalledWith('b', 'p.jpg', item.blob, 'image/jpeg');
  });
  it('tenta buckets alternativos', async () => {
    uploadBlob.mockResolvedValueOnce(null).mockResolvedValueOnce('https://alt/x.jpg');
    expect(await storeNormalized(item, { bucket: 'a', path: 'p', fallbackBuckets: ['b'] })).toBe('https://alt/x.jpg');
    expect(uploadBlob.mock.calls[1][0]).toBe('b');
  });
  it('por padrao lanca UploadError quando tudo falha', async () => {
    uploadBlob.mockResolvedValue(null);
    await expect(storeNormalized(item, { bucket: 'a', path: 'p' })).rejects.toBeInstanceOf(UploadError);
  });
  it('data URL somente com opt-in explicito (e registrado)', async () => {
    uploadBlob.mockResolvedValue(null);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (globalThis as any).FileReader = class {
      result: any = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = 'data:image/jpeg;base64,eA==';
        this.onload?.();
      }
    };
    const url = await storeNormalized(item, { bucket: 'a', path: 'p', dataUrlOnFailure: true });
    expect(url.startsWith('data:image/jpeg')).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    delete (globalThis as any).FileReader;
  });
});

describe('extensoes', () => {
  it('mapeia mime para extensao', () => {
    expect(extensionForMime('application/pdf')).toBe('pdf');
    expect(buildStoragePath('o/notas/1_0', { mimeType: 'image/jpeg' })).toBe('o/notas/1_0.jpg');
    expect(buildStoragePath('o/notas/1_0', { mimeType: 'application/pdf' })).toBe('o/notas/1_0.pdf');
  });
});
