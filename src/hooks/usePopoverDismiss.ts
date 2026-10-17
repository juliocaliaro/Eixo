import { useEffect, type RefObject } from 'react';
import { useEscapeKey } from './useEscapeKey';

/**
 * Fecha um popover flutuante ao clicar fora do container (`ref`) ou ao pressionar Escape.
 * O Escape respeita a pilha de overlays (um popover aberto sobre um modal fecha primeiro).
 */
export function usePopoverDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  events: Array<'mousedown' | 'touchstart'> = ['mousedown']
): void {
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    events.forEach((ev) => document.addEventListener(ev, onOutside));
    return () => events.forEach((ev) => document.removeEventListener(ev, onOutside));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEscapeKey(onClose, open);
}
