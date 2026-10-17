import { describe, it, expect } from 'vitest';
import { upsertTolerant, missingColumnName, isMissingColumnError, SupabaseWriteError } from '../services/supabaseWrite';

describe('supabaseWrite.upsertTolerant', () => {
  it('descarta apenas colunas toleraveis ausentes e reporta quais', async () => {
    const calls: Record<string, unknown>[][] = [];
    const result = await upsertTolerant(
      'registro_locacoes',
      [{ id: '1', quantidade: 3, periodo: 'mensal' }],
      async (rows) => {
        calls.push(rows);
        if ('quantidade' in rows[0]) {
          return { error: { code: 'PGRST204', message: "Could not find the 'quantidade' column of 'registro_locacoes' in the schema cache" } };
        }
        return { error: null };
      },
      ['quantidade', 'periodo']
    );
    expect(result.degradedColumns).toEqual(['quantidade']);
    expect(calls).toHaveLength(2);
    expect(calls[1][0]).toEqual({ id: '1', periodo: 'mensal' });
  });

  it('nao tolera coluna fora da lista: lanca SupabaseWriteError', async () => {
    const erro = await upsertTolerant(
      'etapas',
      [{ id: '1', ambientes: [] }],
      async () => ({ error: { code: '42703', message: 'column "ambientes" of relation "etapas" does not exist' } }),
      []
    ).catch((e) => e);
    expect(erro).toBeInstanceOf(SupabaseWriteError);
    expect(erro.table).toBe('etapas');
  });

  it('outros erros (ex.: RLS) sao propagados sem retry', async () => {
    let n = 0;
    const erro = await upsertTolerant(
      'tarefas',
      [{ id: '1' }],
      async () => {
        n++;
        return { error: { code: '42501', message: 'new row violates row-level security policy' } };
      },
      ['ordem']
    ).catch((e) => e);
    expect(erro).toBeInstanceOf(SupabaseWriteError);
    expect(n).toBe(1);
  });

  it('helpers de deteccao', () => {
    expect(isMissingColumnError({ code: 'PGRST204' })).toBe(true);
    expect(isMissingColumnError({ code: '23505' })).toBe(false);
    expect(missingColumnName({ message: 'column "periodo" of relation x does not exist' }, ['periodo', 'quantidade'])).toBe('periodo');
  });
});
