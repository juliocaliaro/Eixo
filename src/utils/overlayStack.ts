/**
 * Pilha de overlays (modais, lightbox, popovers) sem dependência de DOM.
 * Apenas o overlay do topo recebe a tecla Escape: o último a abrir fecha primeiro
 * (ex.: calendário dentro de modal, lightbox dentro de detalhes da tarefa).
 */
export interface OverlayStack {
  /** Registra um overlay no topo. Retorna a função que o remove. */
  push: (onEscape: () => void) => () => void;
  /** Entrega Escape ao overlay do topo. Retorna true se alguém tratou. */
  dispatchEscape: () => boolean;
  size: () => number;
  /** Avisa quando a pilha muda de tamanho. Retorna a função que cancela. */
  subscribe: (listener: (size: number) => void) => () => void;
}

export function createOverlayStack(): OverlayStack {
  const entries: Array<{ onEscape: () => void }> = [];
  const listeners = new Set<(size: number) => void>();
  const notify = () => listeners.forEach((l) => l(entries.length));
  return {
    push(onEscape) {
      const entry = { onEscape };
      entries.push(entry);
      notify();
      return () => {
        const i = entries.indexOf(entry);
        if (i >= 0) {
          entries.splice(i, 1);
          notify();
        }
      };
    },
    dispatchEscape() {
      const top = entries[entries.length - 1];
      if (!top) return false;
      top.onEscape();
      return true;
    },
    size: () => entries.length,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Pilha global compartilhada por toda a aplicação. */
export const overlayStack = createOverlayStack();
