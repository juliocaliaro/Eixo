/**
 * Lógica pura do bloqueio de rolagem da página: liga quando há pelo menos um overlay
 * aberto e desliga quando o último fecha. Sem DOM, testável em node.
 */
export interface ScrollLockController {
  /** Informa quantos overlays estão abertos (ex.: overlayStack.size()). */
  sync: (overlayCount: number) => void;
  isLocked: () => boolean;
}

export function createScrollLockController(lock: () => void, unlock: () => void): ScrollLockController {
  let locked = false;
  return {
    sync(count) {
      if (count > 0 && !locked) {
        locked = true;
        lock();
      } else if (count <= 0 && locked) {
        locked = false;
        unlock();
      }
    },
    isLocked: () => locked,
  };
}
