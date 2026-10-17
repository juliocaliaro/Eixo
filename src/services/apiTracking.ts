// ==============================================================================
// TRACKING GLOBAL DE REQUISICOES DA API (indicador de carregamento)
// ==============================================================================

type ApiLoadingListener = (isLoading: boolean, details: { count: number; message: string }) => void;
let activeApiRequestsCount = 0;
let currentApiMessage = '';
const apiLoadingListeners = new Set<ApiLoadingListener>();

export const subscribeApiLoading = (listener: ApiLoadingListener) => {
  apiLoadingListeners.add(listener);
  listener(activeApiRequestsCount > 0, {
    count: activeApiRequestsCount,
    message: currentApiMessage,
  });
  return () => {
    apiLoadingListeners.delete(listener);
  };
};

export const trackApi = async <T>(
  promiseOrFn: Promise<T> | (() => Promise<T>),
  message: string = 'Sincronizando com o servidor...'
): Promise<T> => {
  activeApiRequestsCount++;
  currentApiMessage = message;
  apiLoadingListeners.forEach((l) => l(true, { count: activeApiRequestsCount, message: currentApiMessage }));
  try {
    const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
    return await promise;
  } finally {
    activeApiRequestsCount = Math.max(0, activeApiRequestsCount - 1);
    const stillLoading = activeApiRequestsCount > 0;
    if (!stillLoading) {
      currentApiMessage = '';
    }
    apiLoadingListeners.forEach((l) => l(stillLoading, { count: activeApiRequestsCount, message: currentApiMessage }));
  }
};
