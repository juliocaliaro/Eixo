import { describe, it, expect } from 'vitest';
import { createObraStore, ObraStoreError, StoreIdentity } from '../services/obraStore';
import { createInMemoryObraRepository } from '../services/repositories/inMemoryObraRepository';
import { flattenObras, rowSetToRaw, TABLES } from '../services/obraRows';
import { Obra } from '../types/obra';
import { criarObraCompleta } from './obraFixtures';

const CONSTRUTOR: StoreIdentity = { userId: 'c0000000-0000-4000-8000-000000000001', email: 'eng@x.com', role: 'construtor' };

const setup = (obras: Obra[] = [criarObraCompleta()]) => {
  const repo = createInMemoryObraRepository();
  repo.seed(rowSetToRaw(flattenObras(obras)));
  const store = createObraStore(repo);
  return { repo, store };
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const tabelasAlteradas = (repo: ReturnType<typeof setup>['repo'], idx = repo.applied.length - 1) =>
  TABLES.filter((t) => repo.applied[idx].upserts[t].length > 0 || repo.applied[idx].deletes[t].length > 0);

describe('obraStore: carga e diff', () => {
  it('carrega as obras da identidade e nao grava nada quando o estado nao muda', async () => {
    const { repo, store } = setup();
    const obras = await store.load(CONSTRUTOR);
    expect(obras).toHaveLength(1);
    expect(obras[0].etapas[0].tarefas[0].fotos).toHaveLength(2);

    const result = await store.save(clone(obras));
    expect(result).toMatchObject({ upserted: 0, deleted: 0 });
    expect(repo.applied).toHaveLength(0);
  });

  it('grava apenas a entidade alterada', async () => {
    const { repo, store } = setup();
    const obras = await store.load(CONSTRUTOR);
    const next = clone(obras);
    next[0].etapas[0].tarefas[1].concluida = true;
    next[0].etapas[0].tarefas[1].concluidaEm = '2026-10-10T10:00:00.000Z';

    const result = await store.save(next);
    expect(result.upserted).toBe(1);
    expect(tabelasAlteradas(repo)).toEqual(['tarefas']);
    expect(repo.applied[0].upserts.tarefas[0]).toMatchObject({ concluida: true, status: 'concluido' });
  });

  it('adicionar uma foto cria uma unica evidencia', async () => {
    const { repo, store } = setup();
    const obras = await store.load(CONSTRUTOR);
    const next = clone(obras);
    next[0].etapas[0].tarefas[0].fotos!.push('https://cdn.exemplo.com/f3.jpg');
    await store.save(next);
    expect(tabelasAlteradas(repo)).toEqual(['tarefa_evidencias']);
    expect(repo.applied[0].upserts.tarefa_evidencias).toHaveLength(1);
    expect(repo.applied[0].upserts.tarefa_evidencias[0]).toMatchObject({ tipo: 'foto', ordem: 2 });

    const recarregado = await store.load(CONSTRUTOR);
    expect(recarregado[0].etapas[0].tarefas[0].fotos).toHaveLength(3);
  });

  it('remover uma foto exclui a evidencia no banco (inclusive quando o id veio do banco)', async () => {
    const obra = criarObraCompleta();
    const repo = createInMemoryObraRepository();
    const raw = rowSetToRaw(flattenObras([obra]));
    // ids legados/aleatorios, como os gravados pelo salvamento antigo
    raw.tarefa_evidencias.forEach((r, i) => (r.id = `legado-${i}`));
    repo.seed(raw);
    const store = createObraStore(repo);

    const obras = await store.load(CONSTRUTOR);
    expect((await store.save(clone(obras))).upserted).toBe(0); // ids legados reaproveitados: sem churn

    const next = clone(obras);
    const removida = next[0].etapas[0].tarefas[0].fotos!.shift()!;
    await store.save(next);

    expect(repo.applied[0].deletes.tarefa_evidencias).toHaveLength(1);
    expect(repo.dump().tarefa_evidencias.some((r) => r.conteudo === removida)).toBe(false);
    const recarregado = await store.load(CONSTRUTOR);
    expect(recarregado[0].etapas[0].tarefas[0].fotos).toEqual(['https://cdn.exemplo.com/f2.jpg']);
  });

  it('excluir a ultima obra remove obra e filhos (filhos podados do diff, cascata no banco)', async () => {
    const { repo, store } = setup();
    const obras = await store.load(CONSTRUTOR);
    expect(obras).toHaveLength(1);

    await store.save([]);
    const change = repo.applied[0];
    expect(change.deletes.obras).toHaveLength(1);
    expect(change.deletes.etapas).toHaveLength(0);
    expect(change.deletes.tarefas).toHaveLength(0);
    TABLES.forEach((t) => expect(repo.dump()[t]).toHaveLength(0));
    expect(await store.load(CONSTRUTOR)).toEqual([]);
  });

  it('reconcilia exclusoes de etapa, tarefa, decisao, locacao, nota, projeto e item de vistoria', async () => {
    const { repo, store } = setup();
    const obras = await store.load(CONSTRUTOR);
    const next = clone(obras);
    next[0].etapas.pop(); // Pintura
    next[0].etapas[0].tarefas.pop(); // Ensacar entulho
    next[0].decisoes = [];
    next[0].locacoes = [];
    next[0].notas = [];
    next[0].projetos = [];
    next[0].punchList = [];
    await store.save(next);

    const dump = repo.dump();
    expect(dump.etapas).toHaveLength(1);
    expect(dump.tarefas).toHaveLength(1);
    expect(dump.decisoes).toHaveLength(0);
    expect(dump.decisao_assinaturas).toHaveLength(0);
    expect(dump.registro_locacoes).toHaveLength(0);
    expect(dump.registro_notas).toHaveLength(0);
    expect(dump.projetos_pdf).toHaveLength(0);
    expect(dump.punch_list_items).toHaveLength(0);
    expect(dump.obras).toHaveLength(1);
  });

  it('mover tarefa entre etapas atualiza etapa_id sem excluir a tarefa nem suas evidencias', async () => {
    const { repo, store } = setup();
    const obras = await store.load(CONSTRUTOR);
    const next = clone(obras);
    const [tarefa] = next[0].etapas[0].tarefas.splice(0, 1);
    next[0].etapas[1].tarefas.push(tarefa);
    await store.save(next);
    expect(repo.applied[0].deletes.tarefas).toHaveLength(0);
    expect(repo.applied[0].deletes.tarefa_evidencias).toHaveLength(0);
    const recarregado = await store.load(CONSTRUTOR);
    expect(recarregado[0].etapas[1].tarefas[0].fotos).toHaveLength(2);
  });

  it('agrupamentos (ambientes) persistem no banco, inclusive ambiente vazio e ordem', async () => {
    const { store } = setup();
    const obras = await store.load(CONSTRUTOR);
    const next = clone(obras);
    next[0].etapas[1].ambientes = ['Varanda', 'Suíte'];
    await store.save(next);
    const recarregado = await store.load(CONSTRUTOR);
    expect(recarregado[0].etapas[1].ambientes).toEqual(['Varanda', 'Suíte']);
  });

  it('nova obra recebe o construtor da identidade', async () => {
    const { repo, store } = setup([]);
    await store.load(CONSTRUTOR);
    const nova: Obra = { ...criarObraCompleta('22222222-2222-4222-8222-222222222222'), construtorId: undefined };
    await store.save([nova]);
    expect(repo.dump().obras[0].construtor_id).toBe(CONSTRUTOR.userId);
  });
});

describe('obraStore: concorrencia e falhas', () => {
  it('serializa saves concorrentes e coalesce os intermediarios; o estado final e o ultimo', async () => {
    const { repo, store } = setup();
    repo.applyDelayMs = 15;
    const obras = await store.load(CONSTRUTOR);

    const estados = [1, 2, 3, 4].map((n) => {
      const s = clone(obras);
      s[0].nome = `Nome ${n}`;
      return s;
    });
    const resultados = await Promise.all(estados.map((e) => store.save(e)));

    expect(resultados.length).toBe(4);
    expect(repo.applied.length).toBeLessThanOrEqual(2); // 1o em voo + 1 coalescido
    expect(repo.dump().obras[0].nome).toBe('Nome 4');
  });

  it('nunca executa dois apply ao mesmo tempo', async () => {
    const { repo, store } = setup();
    let emVoo = 0;
    let maxEmVoo = 0;
    const apply = repo.apply.bind(repo);
    repo.apply = async (c, id) => {
      emVoo++;
      maxEmVoo = Math.max(maxEmVoo, emVoo);
      try {
        return await apply(c, id);
      } finally {
        emVoo--;
      }
    };
    repo.applyDelayMs = 10;
    const obras = await store.load(CONSTRUTOR);
    await Promise.all(
      [1, 2, 3].map(async (n) => {
        const s = clone(obras);
        s[0].etapas[0].nome = `Etapa ${n}`;
        await store.save(s);
        await new Promise((r) => setTimeout(r, 3));
      })
    );
    expect(maxEmVoo).toBe(1);
  });

  it('falha de gravacao e reportada como ObraStoreError(save-failed) e nao avanca o snapshot', async () => {
    const { repo, store } = setup();
    const obras = await store.load(CONSTRUTOR);
    const next = clone(obras);
    next[0].nome = 'Renomeada';

    repo.failNextApply = new Error('RLS violation');
    const erro = await store.save(next).catch((e) => e);
    expect(erro).toBeInstanceOf(ObraStoreError);
    expect(erro.kind).toBe('save-failed');
    expect((erro.cause as Error).message).toBe('RLS violation');
    expect(repo.dump().obras[0].nome).toBe('Reforma Apto 402');

    // Retentar o mesmo estado volta a gravar (snapshot nao avancou)
    await store.save(next);
    expect(repo.dump().obras[0].nome).toBe('Renomeada');
  });

  it('falha de leitura vira ObraStoreError(load-failed)', async () => {
    const repo = createInMemoryObraRepository();
    repo.load = async () => {
      throw new Error('offline');
    };
    const store = createObraStore(repo);
    const erro = await store.load(CONSTRUTOR).catch((e) => e);
    expect(erro).toBeInstanceOf(ObraStoreError);
    expect(erro.kind).toBe('load-failed');
  });

  it('save antes de load (ou apos reset) falha com not-loaded', async () => {
    const { store } = setup();
    expect((await store.save([]).catch((e) => e)).kind).toBe('not-loaded');
    await store.load(CONSTRUTOR);
    store.reset();
    expect((await store.save([]).catch((e) => e)).kind).toBe('not-loaded');
  });
});

describe('obraStore: perfil cliente', () => {
  const CLIENTE: StoreIdentity = { userId: 'cl000000-0000-4000-8000-000000000009', email: 'Carolina@Cliente.com', role: 'cliente' };

  it('cliente carrega somente obras vinculadas pelo e-mail e nunca recebe lista sem filtro', async () => {
    const outra = { ...criarObraCompleta('33333333-3333-4333-8333-333333333333'), emailsClientes: ['alguem@x.com'], clienteEmail: undefined };
    const { store } = setup([criarObraCompleta(), outra]);

    const minhas = await store.load(CLIENTE);
    expect(minhas.map((o) => o.id)).toEqual(['11111111-1111-4111-8111-111111111111']);

    const estranho = await store.load({ userId: 'x', email: 'estranho@x.com', role: 'cliente' });
    expect(estranho).toEqual([]);
  });

  it('cliente pode assinar decisao (decisoes e assinaturas) mas nao alterar o cronograma', async () => {
    const obra = criarObraCompleta();
    obra.decisoes![0] = { ...obra.decisoes![0], status: 'pendente', assinaturaContraparte: undefined };
    const { repo, store } = setup([obra]);
    const obras = await store.load(CLIENTE);

    const assinar = clone(obras);
    assinar[0].decisoes![0].status = 'aprovada';
    assinar[0].decisoes![0].assinaturaContraparte = {
      autor: 'cliente',
      nomeSignatario: 'Carolina',
      assinadoEm: '2026-10-09T10:00:00.000Z',
    };
    await store.save(assinar);
    expect(tabelasAlteradas(repo)).toEqual(['decisoes', 'decisao_assinaturas']);

    const indevido = clone(assinar);
    indevido[0].etapas[0].nome = 'Alterada pelo cliente';
    const erro = await store.save(indevido).catch((e) => e);
    expect(erro).toBeInstanceOf(ObraStoreError);
    expect(erro.kind).toBe('forbidden');
    expect(repo.applied).toHaveLength(1);
  });
});
