import { describe, it, expect } from 'vitest';
import {
  toObraRow,
  toEtapaRow,
  toTarefaRow,
  toEvidenciaRow,
  toDecisaoRow,
  toAssinaturaRow,
  toProjetoRow,
  toNotaRow,
  toPunchRow,
  toLocacaoRow,
  toTemplateRow,
  mapObraFromDb,
  mapEtapaFromDb,
  mapTarefaFromDb,
  mapDecisaoFromDb,
  mapProjetoFromDb,
  mapNotaFromDb,
  mapPunchItemFromDb,
  mapLocacaoFromDb,
  mapTemplateFromDb,
  ObraRow,
  EtapaRow,
  TarefaRow,
  TarefaEvidenciaRow,
  DecisaoRow,
  DecisaoAssinaturaRow,
  ProjetoPdfRow,
  RegistroNotaRow,
  PunchListItemRow,
  RegistroLocacaoRow,
} from '../services/dbTypes';
import { flattenObras, assembleObras, emptyRawRows, rowSetToRaw } from '../services/obraRows';
import { criarObraCompleta } from './obraFixtures';

const CREATED = '2026-10-01T00:00:00.000Z';

describe('row mappers: toRow -> fromDb (round trip)', () => {
  const obra = criarObraCompleta();

  it('obra', () => {
    const row = toObraRow(obra);
    const back = mapObraFromDb({ ...row, created_at: row.created_at!, updated_at: CREATED } as ObraRow);
    expect(back).toMatchObject({
      id: obra.id,
      nome: obra.nome,
      cliente: obra.cliente,
      endereco: obra.endereco,
      dataPrevista: obra.dataPrevista,
      empresaResponsavel: obra.empresaResponsavel,
      orcamentoInicial: obra.orcamentoInicial,
      construtorId: obra.construtorId,
      clienteEmail: 'carolina@cliente.com',
      emailsClientes: obra.emailsClientes,
      criadaEm: obra.criadaEm,
    });
  });

  it('obra usa o construtor padrao quando a obra ainda nao tem construtorId e normaliza e-mails', () => {
    const row = toObraRow(
      { ...obra, construtorId: undefined, clienteEmail: '  CLI@X.com ', emailsClientes: [' A@x.com', 'a@X.com', ''] },
      { construtorId: 'c-9' }
    );
    expect(row.construtor_id).toBe('c-9');
    expect(row.cliente_email).toBe('cli@x.com');
    expect(row.emails_clientes).toEqual(['a@x.com']);
  });

  it('etapa (ambientes ordenados, inclusive vazios, preservados)', () => {
    const etapa = obra.etapas[0];
    const row = toEtapaRow(etapa, obra.id, 1);
    expect(row.ambientes).toEqual(['Cozinha', 'Sala', 'Lavabo']);
    const back = mapEtapaFromDb({ ...row, created_at: CREATED } as EtapaRow, []);
    expect(back.ambientes).toEqual(['Cozinha', 'Sala', 'Lavabo']);
    expect(back.nome).toBe('Demolição');
    expect(back.tipoOrigem).toBe('Reforma');
  });

  it('etapa inclui ambientes que so existem nas tarefas', () => {
    const etapa = { ...obra.etapas[0], ambientes: ['Sala'] };
    expect(toEtapaRow(etapa, obra.id, 1).ambientes).toEqual(['Sala', 'Cozinha']);
  });

  it('tarefa + evidencias (fotos e anotacoes em ordem, ambiente na coluna)', () => {
    const tarefa = obra.etapas[0].tarefas[0];
    const row = toTarefaRow(tarefa, obra.etapas[0].id, 1);
    expect(row.ambiente).toBe('Cozinha');
    const evs = [
      toEvidenciaRow('ev3', tarefa.id, 'foto', tarefa.fotos![1], 1),
      toEvidenciaRow('ev1', tarefa.id, 'foto', tarefa.fotos![0], 0),
      toEvidenciaRow('ev2', tarefa.id, 'anotacao', tarefa.anotacoes![0], 0),
      toEvidenciaRow('ev4', tarefa.id, 'anotacao', tarefa.anotacoes![1], 1),
    ].map((e) => ({ ...e, created_at: CREATED }) as TarefaEvidenciaRow);
    const back = mapTarefaFromDb({ ...row, created_at: CREATED } as TarefaRow, evs);
    expect(back.fotos).toEqual(tarefa.fotos);
    expect(back.anotacoes).toEqual(tarefa.anotacoes);
    expect(back.ambiente).toBe('Cozinha');
    expect(back.concluida).toBe(true);
    expect(back.concluidaEm).toBe(tarefa.concluidaEm);
  });

  it('decisao + assinaturas', () => {
    const d = obra.decisoes![0];
    const row = toDecisaoRow(d, obra.id);
    const assinaturas = [
      toAssinaturaRow('s1', d.assinaturaCriador, d.id, 'criador'),
      toAssinaturaRow('s2', d.assinaturaContraparte!, d.id, 'contraparte'),
    ] as DecisaoAssinaturaRow[];
    const back = mapDecisaoFromDb({ ...row, created_at: row.created_at!, updated_at: CREATED } as DecisaoRow, assinaturas);
    expect(back).toMatchObject({
      id: d.id,
      titulo: d.titulo,
      tipoImpactoFinanceiro: 'aditivo',
      valorAditivo: 1250,
      impactoPrazoDias: 3,
      status: 'aprovada',
      criadaPor: 'construtor',
      criadaEm: d.criadaEm,
      fotos: d.fotos,
    });
    expect(back.assinaturaCriador).toEqual(d.assinaturaCriador);
    expect(back.assinaturaContraparte).toEqual(d.assinaturaContraparte);
  });

  it('projeto, nota, punch e locacao (inclui quantidade e periodo)', () => {
    const p = obra.projetos![0];
    expect(mapProjetoFromDb(toProjetoRow(p, obra.id) as ProjetoPdfRow)).toMatchObject({
      id: p.id,
      tipo: 'demolicao',
      url: p.url,
      versao: 'Rev. 02',
      dataUpload: p.dataUpload,
    });

    const n = obra.notas![0];
    expect(mapNotaFromDb(toNotaRow(n, obra.id) as RegistroNotaRow)).toEqual(n);

    const pi = obra.punchList![1];
    expect(mapPunchItemFromDb({ ...toPunchRow(pi, obra.id, 2), created_at: CREATED } as PunchListItemRow)).toEqual(pi);

    const l = obra.locacoes![0];
    const row = toLocacaoRow(l, obra.id);
    expect(row.quantidade).toBe(12);
    expect(row.periodo).toBe('mensal');
    const back = mapLocacaoFromDb(row as RegistroLocacaoRow);
    expect(back).toMatchObject({
      quantidade: 12,
      periodo: 'mensal',
      renovado: true,
      vencimentoOriginal: '2026-10-30',
      dataVencimento: '2026-11-10',
      fornecedor: 'Locadora X',
    });
  });

  it('template', () => {
    const t = { id: 'T1', nome: 'Fachada', etapas: [{ id: 'x', nome: 'Pintura', tarefas: [{ id: 'y', nome: 'Lixar' }] }] };
    expect(mapTemplateFromDb(toTemplateRow(t, 'u1'))).toEqual(t);
  });

  it('Obra inteira: flatten -> assemble preserva o estado', () => {
    const rows = flattenObras([obra]);
    const back = assembleObras(rowSetToRaw(rows) as ReturnType<typeof emptyRawRows>)[0];
    expect(back.etapas.map((e) => e.nome)).toEqual(['Demolição', 'Pintura']);
    expect(back.etapas[0].tarefas[0].fotos).toEqual(obra.etapas[0].tarefas[0].fotos);
    expect(back.etapas[0].tarefas[0].anotacoes).toEqual(obra.etapas[0].tarefas[0].anotacoes);
    expect(back.etapas[0].ambientes).toEqual(['Cozinha', 'Sala', 'Lavabo']);
    expect(back.decisoes![0].assinaturaContraparte).toEqual(obra.decisoes![0].assinaturaContraparte);
    expect(back.punchList!.map((p) => p.item)).toEqual(['Pintar rodapé', 'Trocar tomada']);
    expect(back.locacoes![0].quantidade).toBe(12);
    expect(back.notas![0].valor).toBe(980.5);
  });
});
