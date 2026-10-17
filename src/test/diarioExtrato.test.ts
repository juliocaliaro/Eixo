import { describe, it, expect } from 'vitest';
import {
  montarLancamentos,
  filtrarLancamentos,
  agruparPorDia,
  montarExtrato,
  extrairDataKey,
  DATA_DESCONHECIDA_KEY,
  rotuloDiaCurto,
} from '../utils/diarioExtrato';
import { Obra, Decisao } from '../types/obra';

// Horários ao meio-dia UTC: o mesmo dia local em qualquer fuso razoável.
const NOW = new Date(2026, 9, 17, 12, 0, 0); // 17/10/2026 local
const iso = (dia: string, hora = '12:00:00') => `${dia}T${hora}.000Z`;

const obraBase = (parcial: Partial<Obra> = {}): Obra => ({
  id: 'o1',
  nome: 'Obra',
  cliente: 'C',
  endereco: 'E',
  dataPrevista: '2026-12-01',
  criadaEm: iso('2026-10-01'),
  etapas: [],
  ...parcial,
});

const decisao = (parcial: Partial<Decisao>): Decisao =>
  ({
    id: 'd1',
    titulo: 'Piso',
    descricao: 'desc',
    criadaPor: 'construtor',
    criadorNome: 'Ana',
    criadaEm: iso('2026-10-10'),
    status: 'pendente',
    ...parcial,
  }) as Decisao;

describe('diarioExtrato - datas ausentes', () => {
  it('extrairDataKey não inventa data', () => {
    expect(extrairDataKey(undefined)).toBeNull();
    expect(extrairDataKey('')).toBeNull();
    expect(extrairDataKey('lixo')).toBeNull();
    expect(extrairDataKey('2026-10-05')).toBe('2026-10-05');
  });

  it('tarefa concluída sem concluidaEm usa a data de criação da obra, não "hoje"', () => {
    const obra = obraBase({
      etapas: [{ id: 'e1', nome: 'E', tarefas: [{ id: 't1', nome: 'Reboco', concluida: true }] }],
    });
    const [entry] = montarLancamentos(obra);
    expect(entry.dataKey).toBe(extrairDataKey(iso('2026-10-01')));
    expect(entry.dataHora).toBe(iso('2026-10-01'));
  });

  it('sem timestamp e sem criadaEm vai para o grupo "sem data", no fim, nunca para hoje', () => {
    const obra = obraBase({
      criadaEm: '' as string,
      etapas: [{ id: 'e1', nome: 'E', tarefas: [{ id: 't1', nome: 'Reboco', concluida: true }] }],
      decisoes: [decisao({ criadaEm: iso('2026-10-16') })],
    });
    const grupos = montarExtrato(obra, {}, NOW);
    expect(grupos).toHaveLength(2);
    expect(grupos[1].diaKey).toBe(DATA_DESCONHECIDA_KEY);
    expect(grupos[1].headerTexto).toBe('Data não registrada');
    expect(grupos[1].entries[0].dataHora).toBe('');
    expect(grupos.some((g) => g.headerTexto.startsWith('Hoje'))).toBe(false);
  });

  it('o resultado não depende do relógio: mesma obra, mesmo extrato em "agora" diferentes', () => {
    const obra = obraBase({ anexosGerais: [{ id: 'a', titulo: 'x', tipo: 'anotacao', conteudo: 'n', data: '' }] });
    const a = montarLancamentos(obra);
    const b = montarLancamentos(obra);
    expect(a).toEqual(b);
    expect(a[0].dataKey).toBe(extrairDataKey(iso('2026-10-01')));
  });

  it('timestamp inválido do próprio item cai na data da obra', () => {
    const obra = obraBase({ punchList: [{ id: 'p', item: 'Pintura', concluido: true, concluidoEm: 'nao-e-data' }] });
    expect(montarLancamentos(obra)[0].dataKey).toBe(extrairDataKey(iso('2026-10-01')));
  });
});

describe('diarioExtrato - filtros de período', () => {
  const obra = obraBase({
    anexosGerais: [
      { id: 'hoje', titulo: 'Hoje', tipo: 'anotacao', conteudo: 'a', data: iso('2026-10-17') },
      { id: 'ontem', titulo: 'Ontem', tipo: 'anotacao', conteudo: 'b', data: iso('2026-10-16') },
      { id: 'd7', titulo: 'Sete dias', tipo: 'anotacao', conteudo: 'c', data: '2026-10-10' },
      { id: 'd8', titulo: 'Oito dias', tipo: 'anotacao', conteudo: 'd', data: '2026-10-09' },
      { id: 'd30', titulo: 'Trinta dias', tipo: 'anotacao', conteudo: 'e', data: '2026-09-17' },
      { id: 'd31', titulo: 'Trinta e um', tipo: 'anotacao', conteudo: 'f', data: '2026-09-16' },
    ],
  });
  const todos = montarLancamentos(obra);
  const titulos = (f: Parameters<typeof filtrarLancamentos>[1]) =>
    filtrarLancamentos(todos, f, NOW).map((e) => e.titulo);

  it.each([
    ['todos', { periodo: 'todos' as const }, 6],
    ['hoje', { periodo: 'hoje' as const }, 1],
    ['7dias (inclui exatamente 7 dias atrás)', { periodo: '7dias' as const }, 3],
    ['30dias (inclui exatamente 30 dias atrás)', { periodo: '30dias' as const }, 5],
    ['intervalo fechado', { periodo: 'intervalo' as const, dataInicio: '2026-10-09', dataFim: '2026-10-16' }, 3],
    ['intervalo só início', { periodo: 'intervalo' as const, dataInicio: '2026-10-16' }, 2],
    ['intervalo só fim', { periodo: 'intervalo' as const, dataFim: '2026-09-17' }, 2],
  ])('%s', (_nome, filtro, quantidade) => {
    expect(titulos(filtro)).toHaveLength(quantidade);
  });

  it('7dias contém hoje, ontem e o limite', () => {
    expect(titulos({ periodo: '7dias' })).toEqual(['Hoje', 'Ontem', 'Sete dias']);
  });

  it('busca textual cobre título, descrição, autor e anotações; combina com período', () => {
    const o = obraBase({
      etapas: [
        {
          id: 'e',
          nome: 'Alvenaria',
          tarefas: [{ id: 't', nome: 'Parede', concluida: true, concluidaEm: iso('2026-10-17'), anotacoes: ['Prumo conferido'] }],
        },
      ],
      decisoes: [decisao({ titulo: 'Granito', criadorNome: 'Marcos', criadaEm: iso('2026-10-02') })],
    });
    const lanc = montarLancamentos(o);
    expect(filtrarLancamentos(lanc, { busca: 'prumo' }, NOW)).toHaveLength(1);
    expect(filtrarLancamentos(lanc, { busca: 'MARCOS' }, NOW)).toHaveLength(1);
    expect(filtrarLancamentos(lanc, { busca: 'granito', periodo: 'hoje' }, NOW)).toHaveLength(0);
    expect(filtrarLancamentos(lanc, { busca: '  ' }, NOW)).toHaveLength(2);
  });

  it('lançamentos sem data são excluídos de qualquer filtro de período, mas aparecem em "todos"', () => {
    const o = obraBase({
      criadaEm: '' as string,
      anexosGerais: [{ id: 'a', titulo: 'x', tipo: 'anotacao', conteudo: 'n', data: '' }],
    });
    const lanc = montarLancamentos(o);
    expect(filtrarLancamentos(lanc, { periodo: 'todos' }, NOW)).toHaveLength(1);
    expect(filtrarLancamentos(lanc, { periodo: 'intervalo', dataFim: '2026-12-31' }, NOW)).toHaveLength(0);
    expect(filtrarLancamentos(lanc, { periodo: '30dias' }, NOW)).toHaveLength(0);
  });
});

describe('diarioExtrato - agrupamento por dia e saldo', () => {
  const obra = obraBase({
    decisoes: [
      decisao({ id: 'a', status: 'aprovada', valorAditivo: 1000, criadaEm: iso('2026-10-16'), assinaturaContraparte: { autor: 'cliente', nomeSignatario: 'Cli', assinadoEm: iso('2026-10-17', '15:00:00') } }),
      decisao({ id: 'b', status: 'aprovada', valorSupressivo: 300, criadaEm: iso('2026-10-16'), assinaturaContraparte: { autor: 'cliente', nomeSignatario: 'Cli', assinadoEm: iso('2026-10-17', '09:00:00') } }),
      decisao({ id: 'c', status: 'pendente', valorAditivo: 777, criadaEm: iso('2026-10-17', '18:00:00') }),
      decisao({ id: 'd', status: 'aprovada', criadaEm: iso('2026-10-15'), assinaturaContraparte: { autor: 'cliente', nomeSignatario: 'Cli', assinadoEm: iso('2026-10-15') } }),
    ],
  });

  it('ordena dias do mais recente ao mais antigo e entradas por horário decrescente', () => {
    const grupos = montarExtrato(obra, {}, NOW);
    expect(grupos).toHaveLength(2);
    const chaves = grupos.map((g) => g.diaKey);
    expect([...chaves].sort((x, y) => y.localeCompare(x))).toEqual(chaves);
    const hoje = grupos[0];
    const horarios = hoje.entries.map((e) => new Date(e.dataHora).getTime());
    expect([...horarios].sort((x, y) => y - x)).toEqual(horarios);
  });

  it('saldo diário soma só decisões aprovadas (aditivo - supressivo); pendentes não entram', () => {
    const grupos = montarExtrato(obra, {}, NOW);
    const hoje = grupos[0];
    expect(hoje.entries.map((e) => e.decisaoId).sort()).toEqual(['a', 'b', 'c']);
    expect(hoje.saldoDia).toBe(700);
    // dia sem impacto financeiro
    expect(grupos[grupos.length - 1].saldoDia).toBe(0);
  });

  it('cabeçalhos: Hoje, Ontem e dia da semana', () => {
    const o = obraBase({
      anexosGerais: [
        { id: '1', titulo: 'a', tipo: 'anotacao', conteudo: '', data: '2026-10-17' },
        { id: '2', titulo: 'b', tipo: 'anotacao', conteudo: '', data: '2026-10-16' },
        { id: '3', titulo: 'c', tipo: 'anotacao', conteudo: '', data: '2026-10-12' },
      ],
    });
    const grupos = agruparPorDia(montarLancamentos(o), NOW);
    expect(grupos[0].headerTexto.startsWith('Hoje • ')).toBe(true);
    expect(grupos[1].headerTexto.startsWith('Ontem • ')).toBe(true);
    expect(grupos[2].headerTexto).toMatch(/12 de outubro de 2026 \(Segunda-feira\)/);
  });

  it('rótulo curto (mobile): Hoje, Ontem, dia por extenso sem repetir a data longa', () => {
    expect(rotuloDiaCurto('2026-10-17', NOW)).toBe('Hoje');
    expect(rotuloDiaCurto('2026-10-16', NOW)).toBe('Ontem');
    expect(rotuloDiaCurto('2026-10-12', NOW)).toBe('12 de outubro, segunda-feira');
    expect(rotuloDiaCurto('2025-12-31', NOW)).toBe('31 de dezembro de 2025, quarta-feira');
    expect(rotuloDiaCurto(DATA_DESCONHECIDA_KEY, NOW)).toBe('Data não registrada');
  });

  it('entradas de mesmo horário preservam a ordem de montagem (estável)', () => {
    const o = obraBase({
      etapas: [
        {
          id: 'e',
          nome: 'E',
          tarefas: [
            { id: 't1', nome: 'Primeira', concluida: false, fotos: ['1.jpg'] },
            { id: 't2', nome: 'Segunda', concluida: false, anotacoes: ['n'] },
          ],
        },
      ],
    });
    const [grupo] = agruparPorDia(montarLancamentos(o), NOW);
    expect(grupo.entries.map((e) => e.tarefaId)).toEqual(['t1', 't2']);
  });

  it('decisões recusadas e vistoria entram no extrato; recusada não carrega impacto', () => {
    const o = obraBase({
      decisoes: [decisao({ status: 'recusada', valorAditivo: 50 })],
      punchList: [{ id: 'p', item: 'Fachada', concluido: true, concluidoEm: iso('2026-10-05'), ambiente: 'Externo' }],
    });
    const lanc = montarLancamentos(o);
    expect(lanc.find((e) => e.tipo === 'decisao_recusada')?.impacto).toBeUndefined();
    expect(lanc.find((e) => e.tipo === 'vistoria_concluida')?.subtitulo).toContain('Externo');
  });
});
