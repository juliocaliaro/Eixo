import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const uploadBlob = vi.fn();
vi.mock('../services/api', () => ({ storageApi: { uploadBlob: (...a: any[]) => uploadBlob(...a) } }));

import {
  INTAKE_POLICY,
  fitWithin,
  normalizeFile,
  storeNormalized,
  UploadError,
  extensionForMime,
  buildStoragePath,
} from '../utils/fileIntake';

function installCanvas(opts: { w: number; h: number; ctx?: boolean; blob?: boolean; imgError?: boolean }) {
  const drawn: any = {};
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
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () =>
        opts.ctx === false
          ? null
          : {
              fillStyle: '',
              fillRect: () => {},
              drawImage: (_i: any, _x: number, _y: number, w: number, h: number) => Object.assign(drawn, { w, h }),
            },
      toBlob(cb: (b: Blob | null) => void, mime: string, q: number) {
        Object.assign(drawn, { mime, q });
        cb(opts.blob === false ? null : new Blob(['x'], { type: mime }));
      },
    }),
  };
  return drawn;
}

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
  afterEach(() => {
    delete (globalThis as any).Image;
    delete (globalThis as any).document;
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

  it.each([
    ['sem contexto 2d', { w: 10, h: 10, ctx: false }],
    ['toBlob nulo', { w: 10, h: 10, blob: false }],
    ['erro ao decodificar', { w: 10, h: 10, imgError: true }],
  ])('falha de canvas (%s) devolve o original', async (_n, o) => {
    installCanvas(o);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const file = new File(['abc'], 'a.png', { type: 'image/png' });
    const r = await normalizeFile(file);
    expect(r.blob).toBe(file);
    expect(r.mimeType).toBe('image/png');
    warn.mockRestore();
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
