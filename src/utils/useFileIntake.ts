import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NormalizedFile, normalizeFile, releasePreview } from './fileIntake';

/**
 * Estado de seletor multi-foto: normaliza, mantém previews, libera object URLs.
 * `handleInputChange` copia os arquivos e zera o <input> (permite reselecionar o mesmo arquivo).
 */
export function useFileIntake(onError?: (message: string) => void) {
  const [items, setItems] = useState<NormalizedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const itemsRef = useRef<NormalizedFile[]>([]);
  itemsRef.current = items;

  useEffect(() => () => itemsRef.current.forEach(releasePreview), []);

  const addFiles = useCallback(
    async (files: FileList | File[] | null | undefined) => {
      const list = files ? Array.from(files) : [];
      if (list.length === 0) return;
      setIsProcessing(true);
      try {
        const novos: NormalizedFile[] = [];
        for (const f of list) novos.push(await normalizeFile(f));
        setItems((prev) => [...prev, ...novos]);
      } catch {
        onError?.('Falha ao processar arquivo(s). Tente novamente.');
      } finally {
        setIsProcessing(false);
      }
    },
    [onError]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = '';
      return addFiles(list);
    },
    [addFiles]
  );

  const remove = useCallback((index: number) => {
    setItems((prev) => {
      releasePreview(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clear = useCallback(() => {
    setItems((prev) => {
      prev.forEach(releasePreview);
      return [];
    });
  }, []);

  return { items, isProcessing, addFiles, handleInputChange, remove, clear };
}
