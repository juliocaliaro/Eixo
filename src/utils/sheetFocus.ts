/**
 * Dentro de um bottom sheet (mobile), traz o campo focado para o centro do corpo rolável,
 * para que o teclado virtual nunca o esconda. Chamada uma vez em main.tsx.
 */
export function initSheetFocusGuard(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('focusin', (e) => {
    if (window.innerWidth > 768) return;
    const el = e.target as HTMLElement | null;
    if (!el || !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
    if (!el.closest('.modal-card')) return;
    window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
  });
}
