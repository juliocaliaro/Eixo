import { SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Obra } from '../types/obra';
import { ObraRepository, ObraStore, ObraStoreError, SaveResult, StoreIdentity, createObraStore } from '../services/obraStore';
import { supabaseObraRepository } from '../services/repositories/supabaseObraRepository';

export type ObrasStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseObrasOptions {
  /** Chamado com todo erro de leitura/gravacao (nada e engolido). */
  onError?: (error: ObraStoreError) => void;
  /** Chamado com avisos de gravacao degradada (colunas toleraveis ausentes). */
  onWarning?: (result: SaveResult) => void;
  repository?: ObraRepository;
}

/**
 * Estado das obras sustentado pelo obraStore.
 * - setObras aceita valor ou funcao (como useState); cada mudanca e persistida por diff.
 * - Se uma gravacao falha, o erro e reportado e o estado e recarregado do servidor.
 */
export const useObras = (identity: StoreIdentity | null, options: UseObrasOptions = {}) => {
  const store: ObraStore = useMemo(
    () => createObraStore(options.repository ?? supabaseObraRepository),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.repository]
  );
  const [obras, setObrasState] = useState<Obra[]>([]);
  const [status, setStatus] = useState<ObrasStatus>('idle');
  const obrasRef = useRef<Obra[]>([]);
  const mutationRef = useRef(0);
  const identityRef = useRef<StoreIdentity | null>(identity);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  identityRef.current = identity;

  const identityKey = identity ? `${identity.userId}|${identity.role}|${identity.email}` : '';

  const commit = useCallback((next: Obra[]) => {
    obrasRef.current = next;
    setObrasState(next);
  }, []);

  const reload = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const id = identityRef.current;
      if (!id) return;
      const mutationsAtStart = mutationRef.current;
      if (!opts.silent) setStatus('loading');
      try {
        const loaded = await store.load(id);
        if (identityRef.current !== id) return; // identidade mudou durante a leitura
        // Se o usuario alterou algo durante a leitura, mantem o estado local (o save em fila reconcilia).
        if (mutationRef.current === mutationsAtStart) commit(loaded);
        setStatus('ready');
      } catch (err) {
        setStatus('error');
        optionsRef.current.onError?.(err as ObraStoreError);
      }
    },
    [store, commit]
  );

  // Troca de identidade (login/logout): zera tudo e carrega do servidor.
  useEffect(() => {
    store.reset();
    mutationRef.current += 1;
    commit([]);
    if (!identityRef.current) {
      setStatus('idle');
      return;
    }
    void reload();
  }, [identityKey, store, commit, reload]);

  const setObras = useCallback(
    (action: SetStateAction<Obra[]>) => {
      const next = typeof action === 'function' ? action(obrasRef.current) : action;
      mutationRef.current += 1;
      commit(next);
      store
        .save(next)
        .then((result) => {
          if (result.warnings.length > 0) optionsRef.current.onWarning?.(result);
        })
        .catch((err: ObraStoreError) => {
          optionsRef.current.onError?.(err);
          void reload({ silent: true });
        });
    },
    [store, commit, reload]
  );

  return { obras, setObras, status, reload };
};
