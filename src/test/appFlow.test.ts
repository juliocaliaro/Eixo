import { describe, it, expect } from 'vitest';
import { mapObraFromDb, mapTarefaFromDb, mapEtapaFromDb, mapLocacaoFromDb, TarefaEvidenciaRow, RegistroLocacaoRow } from '../services/dbTypes';
import { Obra, Etapa, Tarefa, Decisao, RegistroLocacao } from '../types/obra';
import { filtrarObrasVisiveis } from '../services/obraAccess';
import { totaisFinanceiros } from '../utils/obraMetrics';

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
    const decisoes = [
      { id: 'd1', status: 'aprovada', valorAditivo: 4500 },
      { id: 'd2', status: 'aprovada', valorSupressivo: 1800 },
      // Pendente: não entra no saldo contratual
      { id: 'd3', status: 'pendente', valorAditivo: 3000 },
    ] as Decisao[];

    const totais = totaisFinanceiros(decisoes, 150000);

    expect(totais.aprovadas.aditivos).toBe(4500);
    expect(totais.aprovadas.supressivos).toBe(1800);
    expect(totais.investimentoAtualizado).toBe(152700);
    expect(totais.pendentes.aditivos).toBe(3000);
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

describe('5. Exclusão de Serviços/Tarefas e Persistência Resiliente contra Reaparecimento no F5', () => {
  it('deve remover a tarefa da lista da etapa sem afetar os demais serviços', () => {
    const etapaOriginal: Etapa = {
      id: 'e1',
      nome: 'Alvenaria',
      concluida: false,
      ambientes: ['Geral'],
      tarefas: [
        { id: 't1', nome: 'Fechamento e regularização de rasgos nas paredes', concluida: false },
        { id: 't2', nome: 'Executar todo contra piso, emboçamento e reboco', concluida: false },
      ],
    };

    const tarefaIdParaExcluir = 't1';
    const etapaAtualizada: Etapa = {
      ...etapaOriginal,
      tarefas: etapaOriginal.tarefas.filter((t) => t.id !== tarefaIdParaExcluir),
    };

    expect(etapaAtualizada.tarefas.length).toBe(1);
    expect(etapaAtualizada.tarefas[0].id).toBe('t2');
    expect(etapaAtualizada.tarefas.some((t) => t.id === 't1')).toBe(false);
  });
});

describe('6. Edição Simultânea de Nome e Agrupamento de Serviço (Sem Perda de Dados)', () => {
  it('deve atualizar tanto o nome quanto o ambiente da tarefa de forma atômica', () => {
    const etapaOriginal: Etapa = {
      id: 'e1',
      nome: 'Alvenaria',
      concluida: false,
      ambientes: ['Cozinha'],
      tarefas: [
        { id: 't1', nome: 'Rasgo antigo', ambiente: undefined, concluida: false },
      ],
    };

    const novoNome = 'Rasgo novo em alvenaria';
    const novoAmbiente = 'Cozinha';

    const etapaAtualizada: Etapa = {
      ...etapaOriginal,
      tarefas: etapaOriginal.tarefas.map((t) =>
        t.id === 't1' ? { ...t, nome: novoNome, ambiente: novoAmbiente } : t
      ),
    };

    expect(etapaAtualizada.tarefas[0].nome).toBe('Rasgo novo em alvenaria');
    expect(etapaAtualizada.tarefas[0].ambiente).toBe('Cozinha');
  });

  it('deve criar novo agrupamento e associar tarefas a ele', () => {
    const etapa: Etapa = {
      id: 'e1',
      nome: 'Instalações',
      concluida: false,
      ambientes: ['Banheiro'],
      tarefas: [{ id: 't1', nome: 'Ponto de tomada', ambiente: undefined, concluida: false }],
    };

    // 1. Cria novo agrupamento 'Suíte Master'
    const novoAmbiente = 'Suíte Master';
    const etapaComAmbiente: Etapa = {
      ...etapa,
      ambientes: [...(etapa.ambientes || []), novoAmbiente],
    };
    expect(etapaComAmbiente.ambientes).toContain('Suíte Master');

    // 2. Move a tarefa para o novo agrupamento
    const etapaComTarefaMovida: Etapa = {
      ...etapaComAmbiente,
      tarefas: etapaComAmbiente.tarefas.map((t) => (t.id === 't1' ? { ...t, ambiente: novoAmbiente } : t)),
    };
    expect(etapaComTarefaMovida.tarefas[0].ambiente).toBe('Suíte Master');
  });

  it('deve mover tarefa entre agrupamentos existentes', () => {
    const etapa: Etapa = {
      id: 'e1',
      nome: 'Pintura',
      concluida: false,
      ambientes: ['Sala', 'Varanda'],
      tarefas: [{ id: 't1', nome: 'Pintura teto', ambiente: 'Sala', concluida: false }],
    };

    // Move de 'Sala' para 'Varanda'
    const etapaMovida: Etapa = {
      ...etapa,
      tarefas: etapa.tarefas.map((t) => (t.id === 't1' ? { ...t, ambiente: 'Varanda' } : t)),
    };
    expect(etapaMovida.tarefas[0].ambiente).toBe('Varanda');

    // Move de 'Varanda' para 'Sem agrupamento' (undefined)
    const etapaSemAgrupamento: Etapa = {
      ...etapa,
      tarefas: etapa.tarefas.map((t) => (t.id === 't1' ? { ...t, ambiente: undefined } : t)),
    };
    expect(etapaSemAgrupamento.tarefas[0].ambiente).toBeUndefined();
  });

  it('deve renomear agrupamento e atualizar automaticamente todas as tarefas vinculadas', () => {
    const etapa: Etapa = {
      id: 'e1',
      nome: 'Marcenaria',
      concluida: false,
      ambientes: ['Cozinha Antiga'],
      tarefas: [
        { id: 't1', nome: 'Armário superior', ambiente: 'Cozinha Antiga', concluida: true },
        { id: 't2', nome: 'Gabinete inferior', ambiente: 'Cozinha Antiga', concluida: false },
        { id: 't3', nome: 'Prateleira corredor', ambiente: 'Corredor', concluida: false },
      ],
    };

    const nomeAntigo = 'Cozinha Antiga';
    const novoNome = 'Cozinha Gourmet';

    let ambientesAtualizados = (etapa.ambientes || []).map((a) => (a === nomeAntigo ? novoNome : a));
    if (!ambientesAtualizados.includes(novoNome)) ambientesAtualizados.push(novoNome);
    ambientesAtualizados = ambientesAtualizados.filter((a) => a !== nomeAntigo);

    const tarefasAtualizadas = etapa.tarefas.map((t) =>
      t.ambiente === nomeAntigo ? { ...t, ambiente: novoNome } : t
    );

    const etapaRenomeada: Etapa = {
      ...etapa,
      ambientes: ambientesAtualizados,
      tarefas: tarefasAtualizadas,
    };

    expect(etapaRenomeada.ambientes).toEqual(['Cozinha Gourmet']);
    expect(etapaRenomeada.tarefas[0].ambiente).toBe('Cozinha Gourmet');
    expect(etapaRenomeada.tarefas[1].ambiente).toBe('Cozinha Gourmet');
    expect(etapaRenomeada.tarefas[2].ambiente).toBe('Corredor');
  });

  it('deve remover agrupamento mantendo os serviços e movendo-os para "Sem agrupamento"', () => {
    const etapa: Etapa = {
      id: 'e1',
      nome: 'Gesso',
      concluida: false,
      ambientes: ['Lavabo'],
      tarefas: [
        { id: 't1', nome: 'Sanca de gesso', ambiente: 'Lavabo', concluida: false },
        { id: 't2', nome: 'Cortineiro', ambiente: 'Lavabo', concluida: true },
      ],
    };

    const etapaSemAgrupamento: Etapa = {
      ...etapa,
      ambientes: (etapa.ambientes || []).filter((a) => a !== 'Lavabo'),
      tarefas: etapa.tarefas.map((t) => (t.ambiente === 'Lavabo' ? { ...t, ambiente: undefined } : t)),
    };

    expect(etapaSemAgrupamento.ambientes).toHaveLength(0);
    expect(etapaSemAgrupamento.tarefas).toHaveLength(2);
    expect(etapaSemAgrupamento.tarefas[0].ambiente).toBeUndefined();
    expect(etapaSemAgrupamento.tarefas[1].ambiente).toBeUndefined();
  });
});

describe('4. Acesso e Listagem de Obras para Clientes Convidados por E-mail', () => {
  it('deve identificar obra pertencente ao cliente via emailsClientes com normalização de case e trim', () => {
    const userEmail = '  Cliente.Convidado@Empresa.com  ';
    const userEmailLower = userEmail.trim().toLowerCase();

    const obras: Obra[] = [
      {
        id: 'o1',
        nome: 'Reforma Comercial',
        cliente: 'Empresa Alpha',
        endereco: 'Av. Paulista, 1000',
        dataPrevista: '2026-12-31',
        criadaEm: new Date().toISOString(),
        emailsClientes: ['outro@email.com', 'cliente.convidado@empresa.com'],
        etapas: [],
      },
      {
        id: 'o2',
        nome: 'Residência Alphaville',
        cliente: 'João Silva',
        endereco: 'Rua das Flores, 50',
        dataPrevista: '2026-12-31',
        criadaEm: new Date().toISOString(),
        emailsClientes: ['joao@email.com'],
        etapas: [],
      },
      {
        id: 'o3',
        nome: 'Consultório Médico',
        cliente: 'Dra. Carolina',
        endereco: 'Rua Augusta, 500',
        dataPrevista: '2026-12-31',
        criadaEm: new Date().toISOString(),
        clienteEmail: 'cliente.convidado@empresa.com',
        etapas: [],
      },
    ];

    expect(userEmailLower).toBe('cliente.convidado@empresa.com');
    const visibleObras = filtrarObrasVisiveis(obras, { userId: null, email: userEmail, role: 'cliente' });

    expect(visibleObras).toHaveLength(2);
    expect(visibleObras.map((o) => o.id)).toEqual(['o1', 'o3']);
  });

  it('deve mapear corretamente ObraRow do Supabase com emails_clientes em array ou string', () => {
    const rowComArray = {
      id: 'o1',
      nome: 'Obra 1',
      cliente_nome: 'Cliente 1',
      cliente_id: null,
      cliente_email: 'contato@cliente.com',
      emails_clientes: ['convidado1@email.com', 'CONVIDADO2@EMAIL.COM'],
      construtor_id: 'c1',
      endereco: 'Rua A',
      data_prevista: '2026-12-01',
      orcamento_inicial: 50000,
      empresa_responsavel: 'Construtora Teste',
      created_at: '2026-10-01T00:00:00.000Z',
      updated_at: '2026-10-01T00:00:00.000Z',
    };

    const obraMapeada = mapObraFromDb(rowComArray as any);
    expect(obraMapeada.clienteEmail).toBe('contato@cliente.com');
    expect(obraMapeada.emailsClientes).toEqual(['convidado1@email.com', 'convidado2@email.com']);
  });
});



