import { describe, it, expect } from 'vitest';
import { indiceSelecionado, proximoIndice } from '../utils/segmented';

describe('segmented', () => {
  it('indiceSelecionado devolve a posição e 0 como reserva', () => {
    expect(indiceSelecionado(['a', 'b', 'c'], 'c')).toBe(2);
    expect(indiceSelecionado(['a', 'b'], 'x')).toBe(0);
  });

  it('setas circulam e Home/End vão às pontas', () => {
    expect(proximoIndice(0, 2, 'ArrowRight')).toBe(1);
    expect(proximoIndice(1, 2, 'ArrowRight')).toBe(0);
    expect(proximoIndice(0, 2, 'ArrowLeft')).toBe(1);
    expect(proximoIndice(1, 3, 'Home')).toBe(0);
    expect(proximoIndice(0, 3, 'End')).toBe(2);
  });

  it('cima/baixo só navegam no modo vertical (radiogroup)', () => {
    expect(proximoIndice(0, 2, 'ArrowDown')).toBeNull();
    expect(proximoIndice(0, 2, 'ArrowDown', true)).toBe(1);
    expect(proximoIndice(0, 2, 'ArrowUp', true)).toBe(1);
  });

  it('ignora outras teclas e listas vazias', () => {
    expect(proximoIndice(0, 2, 'a')).toBeNull();
    expect(proximoIndice(0, 0, 'ArrowRight')).toBeNull();
  });
});
