import { describe, it, expect } from 'vitest';
import {
  impactoDaDecisao,
  totaisFinanceiros,
  progressoDaObra,
  montarMensagemWhatsApp,
  montarUrlDecisao,
  linkWhatsApp,
  percentualConcluido,
} from '../utils/obraMetrics';
import { Decisao, Obra } from '../types/obra';

const decisao = (parcial: Partial<Decisao>): Decisao =>
  ({
    id: 'd',
    titulo: 'Decisão',
    descricao: '',
    criadaPor: 'construtor',
    criadorNome: 'Ana',
    criadaEm: '2026-10-10T12:00:00.000Z',
    status: 'pendente',
    ...parcial,
  }) as Decisao;

describe('obraMetrics - impactoDaDecisao', () => {
  const casos: Array<[string, Partial<Decisao>, { aditivo: number; supressivo: number }]> = [
    ['aditivo explícito', { valorAditivo: 4500 }, { aditivo: 4500, supressivo: 0 }],
    ['supressivo explícito', { valorSupressivo: 1800 }, { aditivo: 0, supressivo: 1800 }],
    ['legado impactoFinanceiro positivo', { impactoFinanceiro: 1250 }, { aditivo: 1250, supressivo: 0 }],
    ['legado impactoFinanceiro negativo', { impactoFinanceiro: -320 }, { aditivo: 0, supressivo: 320 }],
    ['valorAditivo 0 (padrão do banco) com impacto positivo cai no legado', { valorAditivo: 0, valorSupressivo: 0, impactoFinanceiro: 900 }, { aditivo: 900, supressivo: 0 }],
    ['valorSupressivo 0 com impacto negativo cai no legado', { valorAditivo: 0, valorSupressivo: 0, impactoFinanceiro: -700 }, { aditivo: 0, supressivo: 700 }],
    ['valores explícitos prevalecem sobre impactoFinanceiro', { valorAditivo: 100, impactoFinanceiro: -500 }, { aditivo: 100, supressivo: 0 }],
    ['sem nada', {}, { aditivo: 0, supressivo: 0 }],
    ['tudo zero', { valorAditivo: 0, valorSupressivo: 0, impactoFinanceiro: 0 }, { aditivo: 0, supressivo: 0 }],
    ['legado com ambos: exclusão mútua pelo saldo (aditivo maior)', { valorAditivo: 1000, valorSupressivo: 400 }, { aditivo: 600, supressivo: 0 }],
    ['legado com ambos: exclusão mútua pelo saldo (supressivo maior)', { valorAditivo: 300, valorSupressivo: 1000 }, { aditivo: 0, supressivo: 700 }],
    ['NaN é ignorado', { valorAditivo: NaN, impactoFinanceiro: NaN }, { aditivo: 0, supressivo: 0 }],
  ];

  it.each(casos)('%s', (_nome, campos, esperado) => {
    const r = impactoDaDecisao(campos);
    expect(r.aditivo).toBe(esperado.aditivo);
    expect(r.supressivo).toBe(esperado.supressivo);
    expect(r.saldo).toBe(esperado.aditivo - esperado.supressivo);
    expect(r.temAditivo).toBe(esperado.aditivo > 0);
    expect(r.temSupressivo).toBe(esperado.supressivo > 0);
    // Nunca ambos
    expect(r.temAditivo && r.temSupressivo).toBe(false);
    expect(r.temImpactoFinanceiro).toBe(esperado.aditivo > 0 || esperado.supressivo > 0);
  });
});

describe('obraMetrics - totaisFinanceiros', () => {
  const decisoes = [
    decisao({ id: '1', status: 'aprovada', valorAditivo: 4500 }),
    decisao({ id: '2', status: 'aprovada', valorSupressivo: 1800 }),
    decisao({ id: '3', status: 'aprovada', impactoFinanceiro: 200 }),
    decisao({ id: '4', status: 'pendente', valorAditivo: 3000 }),
    decisao({ id: '5', status: 'pendente', impactoFinanceiro: -100 }),
    decisao({ id: '6', status: 'recusada', valorAditivo: 99999 }),
  ];

  it('soma apenas aprovadas nos totais e separa pendentes; recusadas nunca entram', () => {
    const t = totaisFinanceiros(decisoes, 150000);
    expect(t.aprovadas).toEqual({ aditivos: 4700, supressivos: 1800, saldo: 2900 });
    expect(t.pendentes).toEqual({ aditivos: 3000, supressivos: 100, saldo: 2900 });
    expect(t.investimentoAtualizado).toBe(152900);
  });

  it('aceita a obra e usa orcamentoInicial; sem orcamento o investimento é só o saldo', () => {
    expect(totaisFinanceiros({ decisoes, orcamentoInicial: 1000 }).investimentoAtualizado).toBe(3900);
    expect(totaisFinanceiros({ decisoes }).orcamentoBase).toBe(0);
  });

  it('obra sem decisões', () => {
    const t = totaisFinanceiros({ decisoes: undefined, orcamentoInicial: 500 });
    expect(t.investimentoAtualizado).toBe(500);
    expect(t.aprovadas.saldo).toBe(0);
  });
});

describe('obraMetrics - progresso', () => {
  it('obra sem tarefas tem 0% e não é concluída', () => {
    const p = progressoDaObra({ etapas: [{ id: 'e', nome: 'E', tarefas: [] }] });
    expect(p).toMatchObject({ totalTarefas: 0, concluidas: 0, percentual: 0, concluida: false });
    expect(progressoDaObra({ etapas: [] }).percentual).toBe(0);
    expect(percentualConcluido(0, 0)).toBe(0);
  });

  it('conta concluídas, em andamento e pendentes entre todas as etapas', () => {
    const obra = {
      etapas: [
        {
          id: 'e1',
          nome: 'A',
          tarefas: [
            { id: 't1', nome: 'a', concluida: true },
            { id: 't2', nome: 'b', concluida: false, fotos: ['x.jpg'] },
            { id: 't3', nome: 'c', concluida: false },
          ],
        },
        { id: 'e2', nome: 'B', tarefas: [{ id: 't4', nome: 'd', concluida: true }] },
      ],
    } as Pick<Obra, 'etapas'>;
    const p = progressoDaObra(obra);
    expect(p.totalTarefas).toBe(4);
    expect(p.concluidas).toBe(2);
    expect(p.emAndamento).toBe(1);
    expect(p.pendentes).toBe(1);
    expect(p.percentual).toBe(50);
    expect(p.concluida).toBe(false);
  });

  it('arredonda e marca 100% como concluída', () => {
    expect(percentualConcluido(1, 3)).toBe(33);
    expect(percentualConcluido(2, 3)).toBe(67);
    const p = progressoDaObra({ etapas: [{ id: 'e', nome: 'E', tarefas: [{ id: 't', nome: 't', concluida: true }] }] });
    expect(p.concluida).toBe(true);
    expect(p.percentual).toBe(100);
  });
});

describe('obraMetrics - WhatsApp', () => {
  it('monta mensagem com aditivo, prazo e link', () => {
    const msg = montarMensagemWhatsApp({
      obraNome: 'Casa Azul',
      decisao: decisao({ titulo: 'Piso', descricao: 'Trocar piso', valorAditivo: 1250, impactoPrazoDias: 3 }),
      urlObra: 'https://eixo.app/?obra=1',
    });
    expect(msg).toContain('*Casa Azul*');
    expect(msg).toContain('*Piso*');
    expect(msg).toMatch(/\+R\$\s1\.250,00 \(Aditivo\)/);
    expect(msg).toContain('+3 dias');
    expect(msg).toContain('https://eixo.app/?obra=1');
  });

  it('rotula supressivo, trunca descrição longa e omite valor zero', () => {
    const longa = 'x'.repeat(200);
    const msg = montarMensagemWhatsApp({
      obraNome: 'O',
      decisao: decisao({ descricao: longa, impactoFinanceiro: -50 }),
    });
    expect(msg).toContain('(Supressivo / Redução)');
    expect(msg).toContain('x'.repeat(137) + '...');
    expect(msg).not.toContain('Impacto no Prazo');
    const zero = montarMensagemWhatsApp({ obraNome: 'O', decisao: decisao({ valorAditivo: 0 }) });
    expect(zero).not.toContain('Impacto Financeiro');
  });

  it('url aponta para a contraparte e o link é codificado', () => {
    expect(montarUrlDecisao('https://a/b', 'o1', 'construtor')).toBe('https://a/b?obra=o1&perfil=cliente&tab=decisoes');
    expect(montarUrlDecisao('https://a/b', 'o1', 'cliente')).toContain('perfil=construtor');
    expect(linkWhatsApp('a b')).toBe('https://wa.me/?text=a%20b');
  });
});
