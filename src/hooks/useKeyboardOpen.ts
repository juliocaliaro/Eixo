import { useEffect, useState } from 'react';

const TEXT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];
const NON_TEXT_INPUT = ['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color'];

function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el.getAttribute('contenteditable') === 'true') return true;
  if (!TEXT_TAGS.includes(el.tagName)) return false;
  if (el.tagName === 'INPUT') return !NON_TEXT_INPUT.includes((el as HTMLInputElement).type);
  return true;
}

/**
 * true enquanto o teclado virtual provavelmente está aberto: um campo de texto tem foco
 * OU o visualViewport encolheu mais de 150px em relação à janela.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      const vv = window.visualViewport;
      const shrunk = vv ? window.innerHeight - vv.height > 150 : false;
      setOpen(shrunk || isTextEntry(document.activeElement));
    };
    window.addEventListener('focusin', check);
    window.addEventListener('focusout', () => setTimeout(check, 0));
    window.visualViewport?.addEventListener('resize', check);
    check();
    return () => {
      window.removeEventListener('focusin', check);
      window.visualViewport?.removeEventListener('resize', check);
    };
  }, []);
  return open;
}
