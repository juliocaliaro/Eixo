import { describe, it, expect } from 'vitest';
import {
  hojeLocal,
  diasAte,
  statusLocacao,
  mapaStatusLocacoes,
  contarKpis,
  filtrarLocacoes,
  calcularVencimentoPeriodo,
  sugerirNovoVencimento,
  renovarLocacao,
  desfazerRenovacao,
  alternarDevolucao,
} from '../utils/locacao';
import { RegistroLocacao } from '../types/obra';

const HOJE = '2026-03-10';
const mk = (id: string, venc: string, extra: Partial<RegistroLocacao> = {}): RegistroLocacao => ({
  id,
  obraId: 'o1',
  itemLocado: `Item ${id}`,
  dataVencimento: venc,
  fotos: [],
  criadoEm: '2026-03-01T10:00:00.000Z',
  ...extra,
});

describe('hojeLocal', () => {
  it('usa o calendario local, nao UTC (noite no Brasil)', () => {
    // 22h30 locais de 10/03: em UTC-3 ja seria dia 11 em UTC
    const noite = new Date(2026, 2, 10, 22, 30);
    expect(hojeLocal(noite)).toBe('2026-03-10');
  });
  it('completa zeros', () => {
    expect(hojeLocal(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
});

describe('statusLocacao', () => {
  it('fronteiras de vencimento', () => {
    expect(statusLocacao(mk('a', '2026-03-09'), HOJE)).toMatchObject({ tipo: 'vencido', dias: -1 });
    expect(statusLocacao(mk('a', '2026-03-10'), HOJE)).toMatchObject({ tipo: 'hoje', dias: 0 });
    expect(statusLocacao(mk('a', '2026-03-11'), HOJE)).toMatchObject({ tipo: 'urgente', dias: 1 });
    expect(statusLocacao(mk('a', '2026-03-13'), HOJE)).toMatchObject({ tipo: 'urgente', dias: 3 });
    expect(statusLocacao(mk('a', '2026-03-14'), HOJE)).toMatchObject({ tipo: 'em_dia', dias: 4 });
  });
  it('devolvido tem precedencia e sem data e ativo', () => {
    expect(statusLocacao(mk('a', '2020-01-01', { status: 'devolvido' }), HOJE).tipo).toBe('devolvido');
    expect(statusLocacao(mk('a', ''), HOJE).tipo).toBe('ativo');
  });
  it('flag renovado', () => {
    expect(statusLocacao(mk('a', '2026-04-01', { renovado: true }), HOJE).renovado).toBe(true);
  });
  it('virada de mes e horario de verao sem erro de 1 dia', () => {
    expect(diasAte('2026-10-31', '2026-11-01')).toBe(1);
    expect(diasAte('2026-02-28', '2026-03-01')).toBe(1);
  });
  it('noite no Brasil: vencimento de hoje continua "vence hoje"', () => {
    const hoje = hojeLocal(new Date(2026, 2, 10, 23, 0));
    expect(statusLocacao(mk('a', '2026-03-10'), hoje).tipo).toBe('hoje');
  });
});

describe('kpis e filtros', () => {
  const locs = [
    mk('1', '2026-03-05'), // vencido
    mk('2', '2026-03-10'), // hoje
    mk('3', '2026-03-12'), // urgente
    mk('4', '2026-04-30'), // em dia
    mk('5', '2026-03-01', { status: 'devolvido' }),
  ];
  const statuses = mapaStatusLocacoes(locs, HOJE);
  const itens = locs.map((locacao, i) => ({
    locacao,
    obra: { id: i < 3 ? 'o1' : 'o2', nome: i < 3 ? 'Casa Azul' : 'Predio' },
  }));

  it('conta KPIs', () => {
    expect(contarKpis(statuses.values())).toEqual({ total: 5, ativos: 4, vencidos: 2, devolvidos: 1 });
  });
  it('filtra por aba de status', () => {
    const f = (status: 'todos' | 'ativos' | 'vencidos' | 'devolvidos') =>
      filtrarLocacoes(itens, { obraId: 'todas', status, termo: '' }, statuses).map((i) => i.locacao.id);
    expect(f('todos')).toEqual(['1', '2', '3', '4', '5']);
    expect(f('ativos')).toEqual(['1', '2', '3', '4']);
    expect(f('vencidos')).toEqual(['1', '2']);
    expect(f('devolvidos')).toEqual(['5']);
  });
  it('filtra por obra e texto (item, obra, fornecedor)', () => {
    expect(
      filtrarLocacoes(itens, { obraId: 'o2', status: 'todos', termo: '' }, statuses).map((i) => i.locacao.id)
    ).toEqual(['4', '5']);
    expect(
      filtrarLocacoes(itens, { obraId: 'todas', status: 'todos', termo: ' casa AZUL ' }, statuses).length
    ).toBe(3);
    const comForn = [{ locacao: mk('9', '2026-04-01', { fornecedor: 'Locamix' }), obra: { id: 'o1', nome: 'X' } }];
    const st = mapaStatusLocacoes(comForn.map((c) => c.locacao), HOJE);
    expect(filtrarLocacoes(comForn, { obraId: 'todas', status: 'todos', termo: 'locam' }, st)).toHaveLength(1);
  });
});

describe('vencimento por periodo', () => {
  it('soma dias a partir de hoje local', () => {
    expect(calcularVencimentoPeriodo('diaria', '2026-03-10')).toBe('2026-03-11');
    expect(calcularVencimentoPeriodo('semanal', '2026-03-10')).toBe('2026-03-17');
    expect(calcularVencimentoPeriodo('quinzenal', '2026-03-10')).toBe('2026-03-25');
    expect(calcularVencimentoPeriodo('mensal', '2026-03-10')).toBe('2026-04-09');
  });
  it('sugere +30 dias do vencimento atual', () => {
    expect(sugerirNovoVencimento({ dataVencimento: '2026-03-10' }, HOJE)).toBe('2026-04-09');
    expect(sugerirNovoVencimento({ dataVencimento: '' }, HOJE)).toBe('2026-04-09');
  });
});

describe('transicoes', () => {
  it('renovar e desfazer restaura o vencimento original', () => {
    const base = mk('1', '2026-03-10');
    const renovada = renovarLocacao(base, { novoVencimento: '2026-04-09', agora: '2026-03-10T12:00:00.000Z' });
    expect(renovada).toMatchObject({
      dataVencimento: '2026-04-09',
      vencimentoOriginal: '2026-03-10',
      renovado: true,
      status: 'ativo',
    });
    const desfeita = desfazerRenovacao(renovada);
    expect(desfeita.dataVencimento).toBe('2026-03-10');
    expect(desfeita.renovado).toBe(false);
    expect(desfeita.renovadoEm).toBeUndefined();
  });
  it('renovar duas vezes preserva o original inicial', () => {
    const r1 = renovarLocacao(mk('1', '2026-03-10'), { novoVencimento: '2026-03-20' });
    const r2 = renovarLocacao(r1, { novoVencimento: '2026-03-30' });
    expect(r2.vencimentoOriginal).toBe('2026-03-10');
    expect(desfazerRenovacao(r2).dataVencimento).toBe('2026-03-10');
  });
  it('renovar reativa uma locacao devolvida', () => {
    expect(
      renovarLocacao(mk('1', '2026-03-10', { status: 'devolvido' }), { novoVencimento: '2026-04-01' }).status
    ).toBe('ativo');
  });
  it('devolver e reativar alternam o status sem mutar', () => {
    const l = mk('1', '2026-03-10');
    const d = alternarDevolucao(l);
    expect(d.status).toBe('devolvido');
    expect(l.status).toBeUndefined();
    expect(alternarDevolucao(d).status).toBe('ativo');
  });
});

describe('resumoKpisTexto', () => {
  it('lista vencidos, ativos e devolvidos com plural correto', async () => {
    const { resumoKpisTexto } = await import('../utils/locacao');
    expect(resumoKpisTexto({ total: 7, ativos: 4, vencidos: 2, devolvidos: 3 }).map((p) => p.texto)).toEqual([
      '2 vencidos',
      '4 ativos',
      '3 devolvidos',
    ]);
    expect(resumoKpisTexto({ total: 2, ativos: 1, vencidos: 1, devolvidos: 1 }).map((p) => p.texto)).toEqual([
      '1 vencido',
      '1 ativo',
      '1 devolvido',
    ]);
  });
  it('omite vencidos e devolvidos zerados e marca vencidos como alerta', async () => {
    const { resumoKpisTexto } = await import('../utils/locacao');
    expect(resumoKpisTexto({ total: 3, ativos: 3, vencidos: 0, devolvidos: 0 })).toEqual([{ chave: 'ativos', texto: '3 ativos' }]);
    expect(resumoKpisTexto({ total: 1, ativos: 1, vencidos: 1, devolvidos: 0 })[0].alerta).toBe(true);
  });
});
