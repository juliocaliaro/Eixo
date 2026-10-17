import { overlayStack } from './overlayStack';
import { createScrollLockController } from './scrollLock';

/**
 * Trava a rolagem da página enquanto houver modal, sheet, lightbox ou gaveta aberto
 * (qualquer coisa registrada em overlayStack). Compensa a largura da barra de rolagem
 * com padding-right para a página não "pular" no desktop. Chamada uma vez em main.tsx.
 * overflow:hidden na raiz basta no iOS moderno; a rolagem interna é do .modal-body
 * (overscroll-behavior: contain impede o encadeamento para a página).
 */
export function initBodyScrollLock(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const ctl = createScrollLockController(
    () => {
      const gap = window.innerWidth - root.clientWidth;
      root.style.overflow = 'hidden';
      if (gap > 0) root.style.paddingRight = `${gap}px`;
    },
    () => {
      root.style.overflow = '';
      root.style.paddingRight = '';
    }
  );
  overlayStack.subscribe((n) => ctl.sync(n));
  ctl.sync(overlayStack.size());
}
