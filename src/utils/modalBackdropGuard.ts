/**
 * Utilitário global para proteger modais e diálogos de fechamentos acidentais:
 * Caso o clique/arraste comece dentro de um modal (ex: seleção de texto, arraste de cursor ou clique próximo à borda)
 * e o botão do mouse seja solto fora (no backdrop), o modal NÃO será fechado.
 *
 * Apenas cliques que começam e terminam diretamente no backdrop fecham o modal.
 */

let pointerDownTarget: EventTarget | null = null;
let pointerUpTarget: EventTarget | null = null;
let isInitialized = false;

export function isModalBackdrop(el: HTMLElement | null): boolean {
  if (!el || typeof el.closest !== 'function') return false;

  // 1. Classes padrão de backdrop da aplicação
  if (
    el.classList?.contains('modal-backdrop') ||
    el.classList?.contains('relatorio-modal-overlay') ||
    el.getAttribute?.('data-modal-backdrop') === 'true'
  ) {
    return true;
  }

  // 2. Elemento fixo que encapsula um modal ou diálogo
  try {
    if (el.querySelector?.('.modal-card, [role="dialog"], .modal-novo-anexo, .modal-card-relatorio')) {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'absolute') {
        return true;
      }
    }
  } catch {
    // fallback seguro caso getComputedStyle não esteja disponível
  }

  return false;
}

export function isInsideModal(el: EventTarget | null): boolean {
  if (!el || typeof (el as any).closest !== 'function') return false;
  const targetEl = el as HTMLElement;

  // Se o próprio elemento for um backdrop, ele não está dentro do modal
  if (isModalBackdrop(targetEl)) return false;

  // Está dentro de um card de modal, formulário, diálogo ou controle interno
  return Boolean(
    targetEl.closest(
      '.modal-card, [role="dialog"], .modal-header, .modal-body, .modal-footer, .modal-novo-anexo, .modal-card-relatorio, form, input, textarea, select, button'
    )
  );
}

export function initModalBackdropGuard(): () => void {
  if (typeof window === 'undefined' || isInitialized) {
    return () => {};
  }
  isInitialized = true;

  const handlePointerDown = (e: MouseEvent | PointerEvent | TouchEvent) => {
    pointerDownTarget = e.target;
  };

  const handlePointerUp = (e: MouseEvent | PointerEvent | TouchEvent) => {
    pointerUpTarget = e.target;
  };

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Se o elemento clicado for um backdrop de modal:
    if (isModalBackdrop(target)) {
      const startedInsideModal = isInsideModal(pointerDownTarget);
      const endedInsideModal = isInsideModal(pointerUpTarget);
      const startedOnBackdrop = pointerDownTarget === target;
      const endedOnBackdrop = pointerUpTarget === target;

      // Se começou dentro do modal e terminou fora no backdrop (ou se não começou e terminou no próprio backdrop):
      if (startedInsideModal || endedInsideModal || !startedOnBackdrop || !endedOnBackdrop) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }

    // Reset para o próximo ciclo de interação
    pointerDownTarget = null;
    pointerUpTarget = null;
  };

  // Registra os listeners na fase de captura da window (antes de qualquer elemento ou raiz do React)
  window.addEventListener('pointerdown', handlePointerDown, true);
  window.addEventListener('mousedown', handlePointerDown, true);
  window.addEventListener('pointerup', handlePointerUp, true);
  window.addEventListener('mouseup', handlePointerUp, true);
  window.addEventListener('click', handleClick, true);

  return () => {
    window.removeEventListener('pointerdown', handlePointerDown, true);
    window.removeEventListener('mousedown', handlePointerDown, true);
    window.removeEventListener('pointerup', handlePointerUp, true);
    window.removeEventListener('mouseup', handlePointerUp, true);
    window.removeEventListener('click', handleClick, true);
    isInitialized = false;
  };
}
