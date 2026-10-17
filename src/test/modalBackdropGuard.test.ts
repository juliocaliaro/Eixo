import { describe, it, expect, vi } from 'vitest';
import { isModalBackdrop, isInsideModal } from '../utils/modalBackdropGuard';

// Helper para criar mock de elemento DOM
function createMockElement(options: {
  className?: string;
  role?: string;
  attributes?: Record<string, string>;
  parent?: any;
}) {
  const classes = new Set((options.className || '').split(' ').filter(Boolean));
  const attributes = { ...(options.attributes || {}) };
  if (options.role) attributes.role = options.role;

  const el: any = {
    classList: {
      contains: (cls: string) => classes.has(cls),
      add: (cls: string) => classes.add(cls),
      remove: (cls: string) => classes.delete(cls),
    },
    getAttribute: (name: string) => attributes[name] || null,
    hasAttribute: (name: string) => name in attributes,
    parent: options.parent || null,
    closest: (selector: string) => {
      // Procura subindo na árvore
      let curr: any = el;
      const selectors = selector.split(',').map((s) => s.trim());
      while (curr) {
        for (const s of selectors) {
          if (s.startsWith('.') && curr.classList.contains(s.slice(1))) return curr;
          if (s.startsWith('[role="') && curr.getAttribute('role') === s.slice(7, -2)) return curr;
          if (s === 'input' && curr.tagName === 'INPUT') return curr;
          if (s === 'button' && curr.tagName === 'BUTTON') return curr;
        }
        curr = curr.parent;
      }
      return null;
    },
    querySelector: () => null,
  };

  return el;
}

describe('modalBackdropGuard - Regras e Lógica de Detecção', () => {
  it('detecta elementos de backdrop padrão (modal-backdrop e relatorio-modal-overlay)', () => {
    const backdrop1 = createMockElement({ className: 'modal-backdrop' });
    const backdrop2 = createMockElement({ className: 'relatorio-modal-overlay' });
    const backdrop3 = createMockElement({ attributes: { 'data-modal-backdrop': 'true' } });
    const modalContent = createMockElement({ className: 'modal-card' });

    expect(isModalBackdrop(backdrop1)).toBe(true);
    expect(isModalBackdrop(backdrop2)).toBe(true);
    expect(isModalBackdrop(backdrop3)).toBe(true);
    expect(isModalBackdrop(modalContent)).toBe(false);
  });

  it('detecta se um elemento está dentro do modal', () => {
    const backdrop = createMockElement({ className: 'modal-backdrop' });
    const modalCard = createMockElement({ className: 'modal-card', parent: backdrop });
    const input = createMockElement({ parent: modalCard });
    input.tagName = 'INPUT';
    const button = createMockElement({ className: 'btn-primary', parent: modalCard });
    button.tagName = 'BUTTON';

    expect(isInsideModal(input)).toBe(true);
    expect(isInsideModal(button)).toBe(true);
    expect(isInsideModal(modalCard)).toBe(true);
    expect(isInsideModal(backdrop)).toBe(false);
  });

  it('lógica de proteção bloqueia clique no backdrop quando começou dentro do modal', () => {
    const backdrop = createMockElement({ className: 'modal-backdrop' });
    const modalCard = createMockElement({ className: 'modal-card', parent: backdrop });
    const input = createMockElement({ parent: modalCard });
    input.tagName = 'INPUT';

    // Simulação do evento de clique disparado pelo browser quando mousedown foi no input e mouseup no backdrop:
    const pointerDownTarget = input; // Começou no input
    const pointerUpTarget = backdrop; // Soltou no backdrop
    const clickTarget = backdrop; // Evento click mira no backdrop (ancestral comum)

    const startedInsideModal = isInsideModal(pointerDownTarget);
    const endedInsideModal = isInsideModal(pointerUpTarget);
    const startedOnBackdrop = pointerDownTarget === clickTarget;
    const endedOnBackdrop = pointerUpTarget === clickTarget;

    // Regra: se começou dentro do modal e terminou fora no backdrop (ou se não começou e terminou no próprio backdrop)
    const shouldBlock = startedInsideModal || endedInsideModal || !startedOnBackdrop || !endedOnBackdrop;

    expect(startedInsideModal).toBe(true);
    expect(startedOnBackdrop).toBe(false);
    expect(shouldBlock).toBe(true);
  });

  it('lógica de proteção permite fechamento do modal quando o clique começa e termina no backdrop', () => {
    const backdrop = createMockElement({ className: 'modal-backdrop' });

    const pointerDownTarget = backdrop;
    const pointerUpTarget = backdrop;
    const clickTarget = backdrop;

    const startedInsideModal = isInsideModal(pointerDownTarget);
    const endedInsideModal = isInsideModal(pointerUpTarget);
    const startedOnBackdrop = pointerDownTarget === clickTarget;
    const endedOnBackdrop = pointerUpTarget === clickTarget;

    const shouldBlock = startedInsideModal || endedInsideModal || !startedOnBackdrop || !endedOnBackdrop;

    expect(startedInsideModal).toBe(false);
    expect(startedOnBackdrop).toBe(true);
    expect(endedOnBackdrop).toBe(true);
    expect(shouldBlock).toBe(false);
  });

  it('lógica de proteção bloqueia quando começou no backdrop e foi arrastado para dentro do modal', () => {
    const backdrop = createMockElement({ className: 'modal-backdrop' });
    const modalCard = createMockElement({ className: 'modal-card', parent: backdrop });

    const pointerDownTarget = backdrop;
    const pointerUpTarget = modalCard;
    const clickTarget = backdrop;

    const startedInsideModal = isInsideModal(pointerDownTarget);
    const endedInsideModal = isInsideModal(pointerUpTarget);
    const startedOnBackdrop = pointerDownTarget === clickTarget;
    const endedOnBackdrop = pointerUpTarget === clickTarget;

    const shouldBlock = startedInsideModal || endedInsideModal || !startedOnBackdrop || !endedOnBackdrop;

    expect(endedInsideModal).toBe(true);
    expect(endedOnBackdrop).toBe(false);
    expect(shouldBlock).toBe(true);
  });
});
