import { useEffect, useRef } from 'react';
import { overlayStack } from '../utils/overlayStack';

let listening = false;
function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (overlayStack.dispatchEscape()) e.stopPropagation();
  });
}

/**
 * Fecha o overlay ativo com Escape. Só o overlay mais recente (topo da pilha)
 * reage; o handler pode mudar a cada render sem perder a posição na pilha.
 */
export function useEscapeKey(onEscape: () => void, active: boolean = true): void {
  const ref = useRef(onEscape);
  ref.current = onEscape;
  useEffect(() => {
    if (!active) return;
    ensureListener();
    return overlayStack.push(() => ref.current());
  }, [active]);
}
