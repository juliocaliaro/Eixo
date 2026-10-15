/**
 * Utilitários compartilhados para manipulação e detecção de arquivos e PDFs.
 */

export function isPdfUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  return (
    clean.endsWith('.pdf') ||
    clean.includes('application/pdf') ||
    url.startsWith('data:application/pdf') ||
    clean.includes('/pdf')
  );
}

export function isPdfFile(file?: File | Blob | null): boolean {
  if (!file) return false;
  if (file.type === 'application/pdf') return true;
  if ('name' in file && typeof (file as any).name === 'string') {
    return (file as any).name.toLowerCase().endsWith('.pdf');
  }
  return false;
}
