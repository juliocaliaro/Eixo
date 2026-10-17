import { describe, it, expect } from 'vitest';
import { atualizarPrazo, diasAssinados, novaDataPrevista, apenasDigitos } from '../utils/prazoDecisao';
import { interpretarEmails, mesclarEmails, emailsDaObra, emailValido } from '../utils/emailsCliente';

describe('prazo da decisao', () => {
  it('exclusao mutua entre acrescimo e reducao', () => {
    let s = atualizarPrazo('acrescimo', '5', { acrescimo: '', reducao: '3' });
    expect(s).toEqual({ acrescimo: '5', reducao: '' });
    s = atualizarPrazo('reducao', '2', s);
    expect(s).toEqual({ acrescimo: '', reducao: '2' });
    s = atualizarPrazo('acrescimo', '0', s);
    expect(s.reducao).toBe('2');
  });
  it('aceita apenas inteiros', () => {
    expect(apenasDigitos('1a,5-')).toBe('15');
  });
  it('dias assinados', () => {
    expect(diasAssinados({ acrescimo: '7', reducao: '' })).toBe(7);
    expect(diasAssinados({ acrescimo: '', reducao: '4' })).toBe(-4);
    expect(diasAssinados({ acrescimo: '', reducao: '' })).toBeUndefined();
  });
  it('nova data prevista', () => {
    expect(novaDataPrevista('2026-03-30', 5)).toBe('2026-04-04');
    expect(novaDataPrevista('2026-03-01', -1)).toBe('2026-02-28');
    expect(novaDataPrevista('', 5)).toBeUndefined();
    expect(novaDataPrevista('2026-03-01', undefined)).toBeUndefined();
  });
});

describe('e-mails do cliente', () => {
  it('normaliza, valida e remove duplicatas', () => {
    const r = interpretarEmails(' Ana@Ex.com, bruno@ex.com; ana@ex.com  invalido ');
    expect(r.validos).toEqual(['ana@ex.com', 'bruno@ex.com']);
    expect(r.invalidos).toEqual(['invalido']);
  });
  it('valida formato', () => {
    expect(emailValido('a@b.co')).toBe(true);
    expect(emailValido('a@b')).toBe(false);
  });
  it('mescla e extrai da obra', () => {
    expect(mesclarEmails(['a@a.com'], ['a@a.com', 'b@b.com'])).toEqual(['a@a.com', 'b@b.com']);
    expect(emailsDaObra({ clienteEmail: 'A@a.com', emailsClientes: ['b@b.com', 'a@a.com'] })).toEqual(['a@a.com', 'b@b.com']);
  });
});
