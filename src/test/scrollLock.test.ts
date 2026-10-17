import { describe, it, expect, vi } from 'vitest';
import { createScrollLockController } from '../utils/scrollLock';
import { createOverlayStack } from '../utils/overlayStack';

describe('scrollLock', () => {
  it('trava no primeiro overlay e destrava só quando o último fecha (aninhados)', () => {
    const lock = vi.fn();
    const unlock = vi.fn();
    const ctl = createScrollLockController(lock, unlock);
    const stack = createOverlayStack();
    stack.subscribe((n) => ctl.sync(n));

    const closeModal = stack.push(() => {});
    const closeConfirm = stack.push(() => {});
    expect(lock).toHaveBeenCalledTimes(1);
    closeConfirm();
    expect(unlock).not.toHaveBeenCalled();
    expect(ctl.isLocked()).toBe(true);
    closeModal();
    expect(unlock).toHaveBeenCalledTimes(1);
    expect(ctl.isLocked()).toBe(false);
  });

  it('remoção repetida (unmount duplo) não destrava de novo nem desbalanceia', () => {
    const lock = vi.fn();
    const unlock = vi.fn();
    const ctl = createScrollLockController(lock, unlock);
    const stack = createOverlayStack();
    stack.subscribe((n) => ctl.sync(n));
    const close = stack.push(() => {});
    close();
    close();
    expect(unlock).toHaveBeenCalledTimes(1);
    stack.push(() => {});
    expect(lock).toHaveBeenCalledTimes(2);
  });
});
