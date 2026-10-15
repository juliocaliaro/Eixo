import { describe, it, expect } from 'vitest';
import { mapTarefaFromDb, mapEtapaFromDb, mapLocacaoFromDb, TarefaEvidenciaRow, RegistroLocacaoRow } from '../services/dbTypes';
import { Etapa, Tarefa, Decisao, RegistroLocacao } from '../types/obra';

describe('1. Mapeamento e Resiliência de Ambientes (Supabase / Local)', () => {
  it('deve extrair ambiente a partir da anotação especial de sincronização resiliente __AMBIENTE__', () => {
    const evidencias: TarefaEvidenciaRow[] = [
      { id: '1', tarefa_id: 't1', tipo: 'foto', conteudo: 'https://exemplo.com/foto1.jpg', created_at: '' },
      { id: '2', tarefa_id: 't1', tipo: 'anotacao', conteudo: '__AMBIENTE__:Cozinha', created_at: '' },
      { id: '3', tarefa_id: 't1', tipo: 'anotacao', conteudo: 'Instalação da bancada finalizada', created_at: '' },
    ];

    const row = {
      id: 't1',
      etapa_id: 'e1',
      nome: 'Assentar pia',
      ordem: 1,
      status: 'concluido' as const,
      concluida: true,
      concluida_em: '2026-10-13T10:00:00.000Z',
      ambiente: null,
      created_at: '',
    };

    const tarefa = mapTarefaFromDb(row, evidencias);
    expect(tarefa.ambiente).toBe('Cozinha');
    expect(tarefa.anotacoes).toEqual(['Instalação da bancada finalizada']);
    expect(tarefa.fotos).toEqual(['https://exemplo.com/foto1.jpg']);
  });

  it('deve consolidar lista de ambientes da etapa a partir de row.ambientes e das tarefas filhas', () => {
    const etapaRow = {
      id: 'e1',
      obra_id: 'o1',
      nome: 'Revestimentos',
      ordem: 1,
      status: 'em_andamento' as const,
      concluida: false,
      ambientes: ['Sala', 'Cozinha'],
      created_at: '',
    };

    const tarefas: Tarefa[] = [
      { id: 't1', nome: 'Piso Sala', concluida: true, ambiente: 'Sala' },
      { id: 't2', nome: 'Pastilha Banheiro', concluida: false, ambiente: 'Banheiro' },
      { id: 't3', nome: 'Serviço Geral', concluida: false },
    ];

    const etapa = mapEtapaFromDb(etapaRow, tarefas);
    expect(etapa.ambientes).toContain('Sala');
    expect(etapa.ambientes).toContain('Cozinha');
    expect(etapa.ambientes).toContain('Banheiro');
  });
});

describe('2. Cálculos Financeiros: Aditivos e Supressivos Contratuais', () => {
  it('deve calcular corretamente o investimento atualizado com aditivos e supressivos aprovados', () => {
    const orcamentoBase = 150000;

    const decisoes: Partial<Decisao>[] = [
      {
        id: 'd1',
        titulo: 'Troca de piso porcelanato',
        status: 'aprovada',
        valorAditivo: 4500, // Aditivo
      },
      {
        id: 'd2',
        titulo: 'Cancelamento de sanca iluminada',
        status: 'aprovada',
        valorSupressivo: 1800, // Supressivo
      },
      {
        id: 'd3',
        titulo: 'Pintura externa extra',
        status: 'pendente', // Ainda não aprovada, não entra no saldo contratual
        valorAditivo: 3000,
      },
    ];

    const aditivosAprovados = decisoes
      .filter((d) => d.status === 'aprovada' && d.valorAditivo)
      .reduce((acc, d) => acc + (d.valorAditivo || 0), 0);

    const supressivosAprovados = decisoes
      .filter((d) => d.status === 'aprovada' && d.valorSupressivo)
      .reduce((acc, d) => acc + (d.valorSupressivo || 0), 0);

    const investimentoAtualizado = orcamentoBase + aditivosAprovados - supressivosAprovados;

    expect(aditivosAprovados).toBe(4500);
    expect(supressivosAprovados).toBe(1800);
    expect(investimentoAtualizado).toBe(152700);
  });
});

describe('3. Agrupamento de Ambientes e Preservação de Tarefas', () => {
  it('ao excluir um agrupamento, as tarefas do grupo devem ter o ambiente desvinculado sem perda de dados', () => {
    const tarefasIniciais: Tarefa[] = [
      { id: 't1', nome: 'Tomadas', ambiente: 'Cozinha', concluida: true },
      { id: 't2', nome: 'Torneira', ambiente: 'Cozinha', concluida: false },
      { id: 't3', nome: 'Lâmpadas', ambiente: 'Sala', concluida: false },
    ];

    const ambienteParaExcluir = 'Cozinha';

    // Simula lógica de exclusão do agrupamento preservando tarefas
    const tarefasAposExclusao = tarefasIniciais.map((t) =>
      t.ambiente === ambienteParaExcluir ? { ...t, ambiente: undefined } : t
    );

    expect(tarefasAposExclusao.length).toBe(3);
    expect(tarefasAposExclusao.find((t) => t.id === 't1')?.ambiente).toBeUndefined();
    expect(tarefasAposExclusao.find((t) => t.id === 't2')?.ambiente).toBeUndefined();
    expect(tarefasAposExclusao.find((t) => t.id === 't3')?.ambiente).toBe('Sala');
  });

  it('deve calcular corretamente a taxa de conclusão por ambiente', () => {
    const tarefas: Tarefa[] = [
      { id: 't1', nome: 'Pintura Parede', ambiente: 'Quarto', concluida: true },
      { id: 't2', nome: 'Pintura Teto', ambiente: 'Quarto', concluida: false },
      { id: 't3', nome: 'Rodapé', ambiente: 'Quarto', concluida: true },
    ];

    const total = tarefas.length;
    const concluidas = tarefas.filter((t) => t.concluida).length;

    expect(total).toBe(3);
    expect(concluidas).toBe(2);
    expect(`${concluidas}/${total} concluídos`).toBe('2/3 concluídos');
  });
});

describe('4. Gestão de Locações e Quantidade de Equipamentos', () => {
  it('deve mapear corretamente o campo quantidade a partir do banco de dados', () => {
    const row: RegistroLocacaoRow = {
      id: 'loc-1',
      obra_id: 'obra-1',
      item_locado: 'Escora metálica',
      quantidade: 15,
      periodo: 'mensal',
      data_vencimento: '2026-11-14',
      fotos: [],
      created_at: '2026-10-14T22:00:00.000Z',
    };

    const locacao = mapLocacaoFromDb(row);
    expect(locacao.itemLocado).toBe('Escora metálica');
    expect(locacao.quantidade).toBe(15);
    expect(locacao.periodo).toBe('mensal');
  });

  it('deve manter quantidade como undefined quando não informada no registro', () => {
    const row: RegistroLocacaoRow = {
      id: 'loc-2',
      obra_id: 'obra-1',
      item_locado: 'Betoneira 400L',
      quantidade: null,
      periodo: 'semanal',
      data_vencimento: '2026-10-21',
      fotos: [],
      created_at: '2026-10-14T22:00:00.000Z',
    };

    const locacao = mapLocacaoFromDb(row);
    expect(locacao.itemLocado).toBe('Betoneira 400L');
    expect(locacao.quantidade).toBeUndefined();
  });
});
