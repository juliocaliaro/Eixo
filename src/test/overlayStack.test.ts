import { describe, it, expect } from 'vitest';
import { createOverlayStack } from '../utils/overlayStack';

describe('overlayStack', () => {
  it('só o topo recebe Escape', () => {
    const s = createOverlayStack();
    const calls: string[] = [];
    s.push(() => calls.push('modal'));
    s.push(() => calls.push('calendario'));
    expect(s.dispatchEscape()).toBe(true);
    expect(calls).toEqual(['calendario']);
  });
  it('após remover o topo, o anterior assume', () => {
    const s = createOverlayStack();
    const calls: string[] = [];
    s.push(() => calls.push('modal'));
    const off = s.push(() => calls.push('lightbox'));
    off();
    s.dispatchEscape();
    expect(calls).toEqual(['modal']);
    expect(s.size()).toBe(1);
  });
  it('remoção é idempotente e pilha vazia retorna false', () => {
    const s = createOverlayStack();
    const off = s.push(() => {});
    off();
    off();
    expect(s.size()).toBe(0);
    expect(s.dispatchEscape()).toBe(false);
  });
  it('remover overlay do meio preserva a ordem', () => {
    const s = createOverlayStack();
    const calls: string[] = [];
    s.push(() => calls.push('a'));
    const offB = s.push(() => calls.push('b'));
    s.push(() => calls.push('c'));
    offB();
    s.dispatchEscape();
    expect(calls).toEqual(['c']);
  });
});
