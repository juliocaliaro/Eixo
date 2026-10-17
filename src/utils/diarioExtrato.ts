/**
 * Extrato do Diário de Obra (puro, sem React).
 *
 * Consolida tarefas, etapas, decisões, anexos e vistoria em lançamentos,
 * filtra por período/busca e agrupa por dia com o saldo financeiro diário.
 *
 * Regras de data (decisões deste módulo):
 *  - Nada aqui lê o relógio: o "agora" é sempre o parâmetro `now`.
 *  - O dia de um lançamento é o dia LOCAL do timestamp (o mesmo fuso usado para exibir a hora);
 *    strings 'YYYY-MM-DD' são usadas como estão.
 *  - Lançamento sem timestamp próprio usa `obra.criadaEm` como data de referência estável.
 *    Se a obra também não tiver data válida, o lançamento vai para o grupo "sem data"
 *    (DATA_DESCONHECIDA_KEY), sempre no fim do extrato, e nunca é promovido a "hoje".
 *  - Tarefas em andamento não têm timestamp próprio no modelo (só `concluidaEm` existe,
 *    e só para concluídas): usam `obra.criadaEm`. Entre lançamentos de mesmo horário
 *    a ordem de montagem (ordem das etapas/tarefas) é preservada (sort estável).
 */
import { Obra, PerfilUsuario } from '../types/obra';
import { impactoDaDecisao, ImpactoDecisao } from './obraMetrics';
import { isTarefaConcluida } from './cronogramaStatus';

export type TipoDiarioEntry =
  | 'servico_concluido'
  | 'etapa_concluida'
  | 'decisao_criada'
  | 'decisao_aprovada'
  | 'decisao_recusada'
  | 'evidencia_tarefa'
  | 'anexo_geral'
  | 'vistoria_concluida'
  | 'material_registrado'
  | 'nota_registrada';

export interface DiarioEntry {
  id: string;
  dataHora: string; // ISO; '' quando não há data conhecida
  dataKey: string; // YYYY-MM-DD (local) ou DATA_DESCONHECIDA_KEY
  tipo: TipoDiarioEntry;
  categoria: 'etapa' | 'decisao' | 'evidencia' | 'financeiro' | 'material' | 'nota';
  titulo: string;
  subtitulo?: string;
  descricao?: string;
  autorNome?: string;
  autorPerfil?: PerfilUsuario;
  /** Impacto financeiro normalizado (aditivo XOR supressivo) quando a decisão tem valor. */
  impacto?: ImpactoDecisao;
  fotos?: string[];
  anotacoes?: string[];
  etapaId?: string;
  etapaNome?: string;
  tarefaId?: string;
  decisaoId?: string;
}

export type PeriodoDiario = 'todos' | 'hoje' | '7dias' | '30dias' | 'intervalo';

export interface FiltroDiario {
  busca?: string;
  periodo?: PeriodoDiario;
  /** YYYY-MM-DD, usado quando periodo === 'intervalo'. */
  dataInicio?: string;
  dataFim?: string;
}

export interface GrupoDiario {
  diaKey: string;
  headerTexto: string;
  /** Rótulo curto para o mobile: "Hoje", "Ontem", "15 de outubro, quinta-feira" (com o ano quando não é o atual). */
  headerCurto: string;
  entries: DiarioEntry[];
  /** Soma do saldo líquido (aditivo - supressivo) das decisões aprovadas do dia. */
  saldoDia: number;
}

/** Chave do grupo de lançamentos sem nenhuma data conhecida (ordena depois de qualquer data real). */
export const DATA_DESCONHECIDA_KEY = '0000-00-00';

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD no fuso local. */
export function dataKeyLocal(data: Date): string {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Dia (YYYY-MM-DD) de um timestamp, ou null se ausente/inválido. */
export function extrairDataKey(valor?: string | null): string | null {
  if (!valor) return null;
  if (REGEX_DATA.test(valor)) return valor;
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : dataKeyLocal(d);
}

function dataKeyDeslocada(now: Date, dias: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() + dias);
  return dataKeyLocal(d);
}

/** Texto do cabeçalho de um dia ("Hoje • ...", "Ontem • ...", "dd de mês de aaaa (Dia da semana)"). */
export function rotuloDia(dataKey: string, now: Date): string {
  if (dataKey === DATA_DESCONHECIDA_KEY) return 'Data não registrada';
  const [ano, mes, dia] = dataKey.split('-').map(Number);
  if (!ano || !mes || !dia) return dataKey;
  const dataObj = new Date(ano, mes - 1, dia);
  const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  if (dataKey === dataKeyLocal(now)) return `Hoje • ${dataFormatada}`;
  if (dataKey === dataKeyDeslocada(now, -1)) return `Ontem • ${dataFormatada}`;

  const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${dataFormatada} (${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)})`;
}

/** Rótulo curto de um dia (mobile): sem repetir a data longa em "Hoje"/"Ontem". */
export function rotuloDiaCurto(dataKey: string, now: Date): string {
  if (dataKey === DATA_DESCONHECIDA_KEY) return 'Data não registrada';
  const [ano, mes, dia] = dataKey.split('-').map(Number);
  if (!ano || !mes || !dia) return dataKey;
  if (dataKey === dataKeyLocal(now)) return 'Hoje';
  if (dataKey === dataKeyDeslocada(now, -1)) return 'Ontem';
  const dataObj = new Date(ano, mes - 1, dia);
  const base = dataObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  const sufixoAno = ano === now.getFullYear() ? '' : ` de ${ano}`;
  return `${base}${sufixoAno}, ${diaSemana}`;
}

/** Consolida todos os lançamentos da obra (sem ordenar). */
export function montarLancamentos(obra: Obra): DiarioEntry[] {
  const entries: DiarioEntry[] = [];
  const referencia = extrairDataKey(obra.criadaEm) ? (obra.criadaEm as string) : '';

  const resolver = (proprio?: string | null): { dataHora: string; dataKey: string } => {
    const escolhido = extrairDataKey(proprio) ? (proprio as string) : referencia;
    return {
      dataHora: escolhido,
      dataKey: extrairDataKey(escolhido) || DATA_DESCONHECIDA_KEY,
    };
  };

  // A) Serviços concluídos e evidências das etapas
  (obra.etapas || []).forEach((etapa) => {
    (etapa.tarefas || []).forEach((tarefa) => {
      const temFotos = Boolean(tarefa.fotos && tarefa.fotos.length > 0);
      const temNotas = Boolean(tarefa.anotacoes && tarefa.anotacoes.length > 0);

      if (isTarefaConcluida(tarefa)) {
        entries.push({
          id: `entry_task_done_${tarefa.id}`,
          ...resolver(tarefa.concluidaEm),
          tipo: 'servico_concluido',
          categoria: 'etapa',
          titulo: tarefa.nome,
          subtitulo: `Etapa: ${etapa.nome}`,
          fotos: tarefa.fotos,
          anotacoes: tarefa.anotacoes,
          etapaId: etapa.id,
          etapaNome: etapa.nome,
          tarefaId: tarefa.id,
        });
      } else if (temFotos || temNotas) {
        entries.push({
          id: `entry_task_evid_${tarefa.id}`,
          ...resolver(undefined),
          tipo: 'evidencia_tarefa',
          categoria: 'evidencia',
          titulo: `Registro de Campo: ${tarefa.nome}`,
          subtitulo: `Etapa: ${etapa.nome} (Em andamento)`,
          fotos: tarefa.fotos,
          anotacoes: tarefa.anotacoes,
          etapaId: etapa.id,
          etapaNome: etapa.nome,
          tarefaId: tarefa.id,
        });
      }
    });

    if (etapa.concluidaEm) {
      entries.push({
        id: `entry_etapa_done_${etapa.id}`,
        ...resolver(etapa.concluidaEm),
        tipo: 'etapa_concluida',
        categoria: 'etapa',
        titulo: `Etapa Finalizada: ${etapa.nome}`,
        subtitulo: `${(etapa.tarefas || []).length} serviços concluídos`,
        etapaId: etapa.id,
        etapaNome: etapa.nome,
      });
    }
  });

  // B) Decisões e aprovações bilaterais
  (obra.decisoes || []).forEach((decisao) => {
    const impacto = impactoDaDecisao(decisao);
    const perfil = decisao.criadaPor === 'construtor' ? 'Construtor' : 'Cliente';

    const base = {
      descricao: decisao.descricao,
      autorNome: decisao.criadorNome,
      autorPerfil: decisao.criadaPor,
      fotos: decisao.fotos,
      decisaoId: decisao.id,
    };
    const categoriaComValor = impacto.temImpactoFinanceiro ? 'financeiro' : 'decisao';

    if (decisao.status === 'aprovada') {
      entries.push({
        ...base,
        id: `entry_decisao_app_${decisao.id}`,
        ...resolver(decisao.assinaturaContraparte?.assinadoEm || decisao.criadaEm),
        tipo: 'decisao_aprovada',
        categoria: categoriaComValor,
        titulo: decisao.titulo,
        subtitulo: `Aprovada por Ambos • Criada por ${decisao.criadorNome} (${perfil})`,
        impacto,
      });
    } else if (decisao.status === 'recusada') {
      entries.push({
        ...base,
        id: `entry_decisao_rec_${decisao.id}`,
        ...resolver(decisao.criadaEm),
        tipo: 'decisao_recusada',
        categoria: 'decisao',
        titulo: `Decisão Recusada: ${decisao.titulo}`,
        subtitulo: 'Solicitado ajuste pela contraparte',
      });
    } else {
      entries.push({
        ...base,
        id: `entry_decisao_pen_${decisao.id}`,
        ...resolver(decisao.criadaEm),
        tipo: 'decisao_criada',
        categoria: categoriaComValor,
        titulo: `Proposta de Decisão: ${decisao.titulo}`,
        subtitulo: `Registrada por ${decisao.criadorNome} (${perfil}) • Aguardando Assinatura`,
        impacto,
      });
    }
  });

  // C) Anotações e fotos gerais do diário
  (obra.anexosGerais || []).forEach((anexo) => {
    entries.push({
      id: `entry_anexo_geral_${anexo.id}`,
      ...resolver(anexo.data),
      tipo: 'anexo_geral',
      categoria: 'evidencia',
      titulo: anexo.titulo || (anexo.tipo === 'foto' ? 'Foto Geral da Obra' : 'Nota de Diário'),
      subtitulo: 'Registro Geral de Canteiro',
      descricao: anexo.tipo === 'anotacao' ? anexo.conteudo : undefined,
      fotos: anexo.tipo === 'foto' ? [anexo.conteudo] : undefined,
    });
  });

  // D) Itens de vistoria final concluídos
  (obra.punchList || []).forEach((item) => {
    if (item.concluido && item.concluidoEm) {
      entries.push({
        id: `entry_punch_${item.id}`,
        ...resolver(item.concluidoEm),
        tipo: 'vistoria_concluida',
        categoria: 'etapa',
        titulo: `Vistoria Final: ${item.item}`,
        subtitulo: `Ambiente: ${item.ambiente || 'Geral'} • Validado`,
      });
    }
  });

  return entries;
}

/** Aplica filtro de período e busca textual. `now` define "hoje". */
export function filtrarLancamentos(entries: DiarioEntry[], filtro: FiltroDiario, now: Date): DiarioEntry[] {
  const busca = (filtro.busca || '').trim().toLowerCase();
  const periodo = filtro.periodo || 'todos';
  const filtraPorData = periodo !== 'todos';

  const hojeKey = dataKeyLocal(now);
  const d7Key = dataKeyDeslocada(now, -7);
  const d30Key = dataKeyDeslocada(now, -30);

  return entries.filter((entry) => {
    if (filtraPorData) {
      // Sem data conhecida não pode ser afirmado como pertencente a nenhum período.
      if (entry.dataKey === DATA_DESCONHECIDA_KEY) return false;
      if (periodo === 'hoje' && entry.dataKey !== hojeKey) return false;
      if (periodo === '7dias' && entry.dataKey < d7Key) return false;
      if (periodo === '30dias' && entry.dataKey < d30Key) return false;
      if (periodo === 'intervalo') {
        if (filtro.dataInicio && entry.dataKey < filtro.dataInicio) return false;
        if (filtro.dataFim && entry.dataKey > filtro.dataFim) return false;
      }
    }

    if (busca) {
      const encontrou =
        entry.titulo.toLowerCase().includes(busca) ||
        (entry.subtitulo || '').toLowerCase().includes(busca) ||
        (entry.descricao || '').toLowerCase().includes(busca) ||
        (entry.autorNome || '').toLowerCase().includes(busca) ||
        (entry.anotacoes || []).some((a) => a.toLowerCase().includes(busca));
      if (!encontrou) return false;
    }

    return true;
  });
}

function instante(entry: DiarioEntry): number {
  const t = entry.dataHora ? new Date(entry.dataHora).getTime() : NaN;
  return isNaN(t) ? -Infinity : t;
}

/** Agrupa por dia (mais recente primeiro; dentro do dia, horário decrescente) com o saldo diário. */
export function agruparPorDia(entries: DiarioEntry[], now: Date): GrupoDiario[] {
  const grupos = new Map<string, DiarioEntry[]>();
  entries.forEach((entry) => {
    const lista = grupos.get(entry.dataKey);
    if (lista) lista.push(entry);
    else grupos.set(entry.dataKey, [entry]);
  });

  return Array.from(grupos.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((diaKey) => {
      const doDia = [...(grupos.get(diaKey) as DiarioEntry[])].sort((a, b) => {
        const ta = instante(a);
        const tb = instante(b);
        if (ta === tb) return 0;
        return tb > ta ? 1 : -1;
      });
      const saldoDia = doDia.reduce(
        (acc, item) => (item.tipo === 'decisao_aprovada' && item.impacto ? acc + item.impacto.saldo : acc),
        0
      );
      return { diaKey, headerTexto: rotuloDia(diaKey, now), headerCurto: rotuloDiaCurto(diaKey, now), entries: doDia, saldoDia };
    });
}

/** Pipeline completo: lançamentos -> filtro -> grupos por dia. */
export function montarExtrato(obra: Obra, filtro: FiltroDiario, now: Date): GrupoDiario[] {
  return agruparPorDia(filtrarLancamentos(montarLancamentos(obra), filtro, now), now);
}
