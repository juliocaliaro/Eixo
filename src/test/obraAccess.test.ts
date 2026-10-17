import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  normalizeEmailList,
  obraPertenceAoCliente,
  obraPertenceAoConstrutor,
  filtrarObrasVisiveis,
} from '../services/obraAccess';
import { Obra } from '../types/obra';

const obra = (over: Partial<Obra>): Obra => ({
  id: 'o',
  nome: 'Obra',
  cliente: 'Cliente',
  endereco: 'Rua',
  dataPrevista: '2026-12-31',
  criadaEm: '2026-01-01T00:00:00.000Z',
  etapas: [],
  ...over,
});

describe('obraAccess', () => {
  it('normaliza e-mails (trim + minusculas) e listas', () => {
    expect(normalizeEmail('  A@B.Com ')).toBe('a@b.com');
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmailList([' X@y.com', '', 3, 'z@W.com'])).toEqual(['x@y.com', 'z@w.com']);
    expect(normalizeEmailList('Solo@Mail.com')).toEqual(['solo@mail.com']);
  });

  it('cliente acessa por clienteId, e-mail principal ou lista de e-mails autorizados', () => {
    const id = { userId: 'u1', email: ' Cli@Ex.com ', role: 'cliente' as const };
    expect(obraPertenceAoCliente(obra({ clienteId: 'u1' }), id)).toBe(true);
    expect(obraPertenceAoCliente(obra({ clienteEmail: 'CLI@ex.com' }), id)).toBe(true);
    expect(obraPertenceAoCliente(obra({ emailsClientes: ['outro@ex.com', 'cli@ex.com'] }), id)).toBe(true);
    expect(obraPertenceAoCliente(obra({ emailsClientes: ['outro@ex.com'] }), id)).toBe(false);
  });

  it('sem identidade verificavel o cliente nunca ve nada (sem fallback para lista completa)', () => {
    const obras = [obra({ id: 'a', emailsClientes: ['x@y.com'] }), obra({ id: 'b', clienteEmail: 'z@y.com' })];
    expect(filtrarObrasVisiveis(obras, { userId: null, email: '', role: 'cliente' })).toEqual([]);
    expect(filtrarObrasVisiveis(obras, { userId: 'u9', email: 'nao@vinculado.com', role: 'cliente' })).toEqual([]);
  });

  it('um id vazio nao casa com obras sem clienteId', () => {
    expect(obraPertenceAoCliente(obra({}), { userId: '', email: '', role: 'cliente' })).toBe(false);
  });

  it('construtor enxerga apenas as proprias obras', () => {
    const obras = [obra({ id: 'a', construtorId: 'c1' }), obra({ id: 'b', construtorId: 'c2' }), obra({ id: 'c' })];
    const id = { userId: 'c1', email: 'c@x.com', role: 'construtor' as const };
    expect(obraPertenceAoConstrutor(obras[0], id)).toBe(true);
    expect(filtrarObrasVisiveis(obras, id).map((o) => o.id)).toEqual(['a']);
  });
});
