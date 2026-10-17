import { describe, it, expect } from 'vitest';
import { Obra, Decisao } from '../types/obra';
import * as T from '../utils/obraTransitions';

const T0 = '2026-10-17T10:00:00.000Z';
const T1 = '2026-10-18T11:00:00.000Z';

const obraBase = (): Obra => ({
  id: 'o1',
  nome: 'Casa',
  cliente: 'Carlos',
  endereco: 'Rua A',
  dataPrevista: '2026-12-15',
  criadaEm: '2026-01-01T00:00:00.000Z',
  etapas: [
    {
      id: 'e1',
      nome: 'Demolição',
      tarefas: [
        { id: 't1', nome: 'A', concluida: false },
        { id: 't2', nome: 'B', concluida: false },
      ],
    },
    { id: 'e2', nome: 'Pintura', tarefas: [{ id: 't3', nome: 'C', concluida: false }] },
  ],
  decisoes: [],
});

const decisao = (over: Partial<Decisao> = {}): Decisao => ({
  id: 'd1',
  titulo: 'Granito',
  descricao: 'x',
  impactoPrazoDias: 15,
  criadaPor: 'construtor',
  criadorNome: 'Eng',
  criadaEm: T0,
  status: 'pendente',
  assinaturaCriador: { autor: 'construtor', nomeSignatario: 'Eng', assinadoEm: T0 },
  ...over,
});

describe('alternarTarefa', () => {
  it('marca tarefa com concluidaEm e nao conclui etapa parcial', () => {
    const r = T.alternarTarefa(obraBase(), 'e1', 't1', T0);
    expect(r.obra.etapas[0].tarefas[0]).toMatchObject({ concluida: true, concluidaEm: T0 });
    expect(r.obra.etapas[0].concluida).toBe(false);
    expect(r.etapaConcluida).toBe(false);
    expect(r.obraConcluida).toBe(false);
    expect(r.tarefaConcluida?.id).toBe('t1');
  });

  it('conclui a etapa na ultima tarefa preservando concluidaEm existente da etapa', () => {
    let o = T.alternarTarefa(obraBase(), 'e1', 't1', T0).obra;
    const r = T.alternarTarefa(o, 'e1', 't2', T1);
    expect(r.etapaConcluida).toBe(true);
    expect(r.obra.etapas[0]).toMatchObject({ concluida: true, concluidaEm: T1 });
    expect(r.obraConcluida).toBe(false);
  });

  it('conclui a obra quando todas as etapas terminam', () => {
    let o = T.alternarTarefa(obraBase(), 'e1', 't1', T0).obra;
    o = T.alternarTarefa(o, 'e1', 't2', T0).obra;
    const r = T.alternarTarefa(o, 'e2', 't3', T1);
    expect(r.obraConcluida).toBe(true);
    expect(r.etapaConcluida).toBe(true);
  });

  it('desmarcar limpa concluidaEm e reabre a etapa', () => {
    let o = T.alternarTarefa(obraBase(), 'e2', 't3', T0).obra;
    expect(o.etapas[1].concluida).toBe(true);
    const r = T.alternarTarefa(o, 'e2', 't3', T1);
    expect(r.tarefaConcluida).toBeNull();
    expect(r.obraConcluida).toBe(false);
    expect(r.obra.etapas[1]).toMatchObject({ concluida: false, concluidaEm: undefined });
    expect(r.obra.etapas[1].tarefas[0].concluidaEm).toBeUndefined();
  });

  it('nao muta a obra original', () => {
    const o = obraBase();
    T.alternarTarefa(o, 'e1', 't1', T0);
    expect(o.etapas[0].tarefas[0].concluida).toBe(false);
  });
});

describe('agrupamentos e tarefas', () => {
  it('renomear agrupamento atualiza tarefas; remover desvincula sem perder tarefas', () => {
    let o = T.adicionarTarefa(obraBase(), 'e1', 'D', undefined, ' Cozinha ');
    expect(o.etapas[0].ambientes).toEqual(['Cozinha']);
    o = T.renomearAgrupamento(o, 'e1', 'Cozinha', 'Copa');
    expect(o.etapas[0].ambientes).toEqual(['Copa']);
    expect(o.etapas[0].tarefas[2].ambiente).toBe('Copa');
    o = T.removerAgrupamento(o, 'e1', 'Copa');
    expect(o.etapas[0].tarefas).toHaveLength(3);
    expect(o.etapas[0].tarefas[2].ambiente).toBeUndefined();
  });

  it('reordenar tarefas e etapas', () => {
    expect(T.reordenarTarefas(obraBase(), 'e1', 0, 1).etapas[0].tarefas.map((t) => t.id)).toEqual(['t2', 't1']);
    expect(T.reordenarEtapas(obraBase(), 0, 1).etapas.map((e) => e.id)).toEqual(['e2', 'e1']);
  });
});

describe('decisoes e prazo', () => {
  it('propor com +15 dias estende dataPrevista uma vez', () => {
    const o = T.proporDecisao(obraBase(), decisao());
    expect(o.dataPrevista).toBe('2026-12-30');
    expect(o.decisoes).toHaveLength(1);
    // reenviar o mesmo id nao reaplica
    expect(T.proporDecisao(o, decisao()).dataPrevista).toBe('2026-12-30');
  });

  it('propor com -10 dias antecipa', () => {
    expect(T.proporDecisao(obraBase(), decisao({ impactoPrazoDias: -10 })).dataPrevista).toBe('2026-12-05');
  });

  it('sem impacto de prazo nao altera a data', () => {
    expect(T.proporDecisao(obraBase(), decisao({ impactoPrazoDias: undefined })).dataPrevista).toBe('2026-12-15');
  });

  it('data invalida ou ausente e no-op', () => {
    expect(T.proporDecisao({ ...obraBase(), dataPrevista: '' }, decisao()).dataPrevista).toBe('');
    expect(T.proporDecisao({ ...obraBase(), dataPrevista: 'abc' }, decisao()).dataPrevista).toBe('abc');
  });

  it('somente a contraparte assina', () => {
    const o = T.proporDecisao(obraBase(), decisao());
    expect(T.assinarDecisao(o, 'd1', 'construtor', 'Eng', T1)).toBe(o);
    const a = T.assinarDecisao(o, 'd1', 'cliente', 'Carlos', T1);
    expect(a.decisoes![0].status).toBe('aprovada');
    expect(a.decisoes![0].assinaturaContraparte).toEqual({ autor: 'cliente', nomeSignatario: 'Carlos', assinadoEm: T1 });
    expect(a.dataPrevista).toBe('2026-12-30');
    // aprovada nao pode ser recusada nem reassinada
    expect(T.recusarDecisao(a, 'd1', 'cliente')).toBe(a);
    expect(T.assinarDecisao(a, 'd1', 'cliente', 'Carlos', T1)).toBe(a);
  });

  it('recusar reverte o prazo uma unica vez', () => {
    const o = T.proporDecisao(obraBase(), decisao());
    expect(T.recusarDecisao(o, 'd1', 'construtor')).toBe(o);
    const r = T.recusarDecisao(o, 'd1', 'cliente');
    expect(r.decisoes![0].status).toBe('recusada');
    expect(r.dataPrevista).toBe('2026-12-15');
    const r2 = T.recusarDecisao(r, 'd1', 'cliente');
    expect(r2.dataPrevista).toBe('2026-12-15');
    expect(T.assinarDecisao(r, 'd1', 'cliente', 'C', T1)).toBe(r);
  });

  it('recusar reverte reducao de prazo (-N)', () => {
    const o = T.proporDecisao(obraBase(), decisao({ impactoPrazoDias: -10 }));
    expect(T.recusarDecisao(o, 'd1', 'cliente').dataPrevista).toBe('2026-12-15');
  });

  it('decisao ja recusada nao aplica prazo ao ser registrada', () => {
    expect(T.proporDecisao(obraBase(), decisao({ status: 'recusada' })).dataPrevista).toBe('2026-12-15');
  });

  it('remover decisao pendente reverte; aprovada nao reverte', () => {
    const o = T.proporDecisao(obraBase(), decisao());
    expect(T.removerDecisao(o, 'd1').dataPrevista).toBe('2026-12-15');
    const a = T.assinarDecisao(o, 'd1', 'cliente', 'C', T1);
    expect(T.removerDecisao(a, 'd1').dataPrevista).toBe('2026-12-30');
    expect(T.removerDecisao(o, 'inexistente')).toBe(o);
  });

  it('multiplas decisoes acumulam e revertem independentemente', () => {
    let o = T.proporDecisao(obraBase(), decisao({ id: 'a', impactoPrazoDias: 10 }));
    o = T.proporDecisao(o, decisao({ id: 'b', impactoPrazoDias: 5 }));
    expect(o.dataPrevista).toBe('2026-12-30');
    o = T.recusarDecisao(o, 'a', 'cliente');
    expect(o.dataPrevista).toBe('2026-12-20');
  });
});
