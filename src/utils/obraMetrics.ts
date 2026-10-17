/**
 * Métricas puras da obra (sem React): único dono de
 *  - progresso físico (tarefas/etapas concluídas);
 *  - normalização do impacto financeiro das decisões (aditivo / supressivo);
 *  - totais financeiros (aprovadas e pendentes);
 *  - mensagem de cobrança via WhatsApp.
 *
 * DECISÃO SEMÂNTICA (AGENTS.md seções 4 e 13):
 *  1. Cada decisão tem no máximo UM sentido financeiro: aditivo XOR supressivo.
 *     Dados legados com os dois campos preenchidos são reduzidos ao saldo líquido
 *     (o lado dominante sobra, o outro zera), preservando o saldo do contrato.
 *  2. Valor zero nunca é "impacto": `valorAditivo: 0` (padrão devolvido pelo banco)
 *     equivale a ausente e permite o fallback legado.
 *  3. Fallback legado: sem `valorAditivo`/`valorSupressivo` positivos, o campo
 *     `impactoFinanceiro` com sinal define o sentido (>0 aditivo, <0 supressivo).
 *  4. Totais só consideram `status === 'aprovada'`; pendentes são totalizados à parte;
 *     recusadas nunca entram.
 *  5. Valores são sempre magnitudes positivas; o sinal está no campo
 *     (`aditivo`/`supressivo`) e em `saldo = aditivo - supressivo`.
 *  6. investimentoAtualizado = orcamentoInicial + aditivos aprovados - supressivos aprovados.
 */
import { Decisao, Etapa, Obra } from '../types/obra';
import { getTarefaStatus, contarTarefasConcluidas } from './cronogramaStatus';
import { formatarMoeda } from './moeda';

// ---------------------------------------------------------------------------
// Progresso
// ---------------------------------------------------------------------------

/** Percentual inteiro (0-100); 0 quando não há itens. */
export function percentualConcluido(concluidos: number, total: number): number {
  return total > 0 ? Math.round((concluidos / total) * 100) : 0;
}

export interface ProgressoObra {
  totalTarefas: number;
  concluidas: number;
  emAndamento: number;
  pendentes: number;
  percentual: number;
  /** true somente quando há tarefas e todas estão concluídas. */
  concluida: boolean;
}

export function progressoDeEtapa(etapa?: Pick<Etapa, 'tarefas'> | null): ProgressoObra {
  const tarefas = etapa?.tarefas || [];
  const totalTarefas = tarefas.length;
  const concluidas = contarTarefasConcluidas(tarefas);
  const emAndamento = tarefas.filter((t) => getTarefaStatus(t) === 'em_andamento').length;
  return {
    totalTarefas,
    concluidas,
    emAndamento,
    pendentes: Math.max(0, totalTarefas - concluidas - emAndamento),
    percentual: percentualConcluido(concluidas, totalTarefas),
    concluida: totalTarefas > 0 && concluidas === totalTarefas,
  };
}

export function progressoDaObra(obra?: Pick<Obra, 'etapas'> | null): ProgressoObra {
  return progressoDeEtapa({ tarefas: (obra?.etapas || []).flatMap((e) => e.tarefas || []) });
}

/** Rótulo do relatório da obra: parcial enquanto < 100%, final quando tudo está concluído. */
export function rotuloRelatorio(obra?: Pick<Obra, 'etapas'> | null): 'Relatório parcial' | 'Relatório final' {
  return progressoDaObra(obra).concluida ? 'Relatório final' : 'Relatório parcial';
}

// ---------------------------------------------------------------------------
// Impacto financeiro das decisões
// ---------------------------------------------------------------------------

type CamposFinanceiros = Pick<Decisao, 'valorAditivo' | 'valorSupressivo' | 'impactoFinanceiro'>;

export interface ImpactoDecisao {
  /** Acréscimo contratual (magnitude >= 0). */
  aditivo: number;
  /** Redução contratual (magnitude >= 0). */
  supressivo: number;
  /** aditivo - supressivo. */
  saldo: number;
  temAditivo: boolean;
  temSupressivo: boolean;
  temImpactoFinanceiro: boolean;
}

function positivo(n: unknown): number {
  return typeof n === 'number' && isFinite(n) && n > 0 ? n : 0;
}

export function impactoDaDecisao(decisao: CamposFinanceiros): ImpactoDecisao {
  const va = positivo(decisao.valorAditivo);
  const vs = positivo(decisao.valorSupressivo);

  let saldo: number;
  if (va > 0 || vs > 0) {
    saldo = va - vs;
  } else {
    const legado = decisao.impactoFinanceiro;
    saldo = typeof legado === 'number' && isFinite(legado) ? legado : 0;
  }

  const aditivo = saldo > 0 ? saldo : 0;
  const supressivo = saldo < 0 ? -saldo : 0;
  return {
    aditivo,
    supressivo,
    saldo,
    temAditivo: aditivo > 0,
    temSupressivo: supressivo > 0,
    temImpactoFinanceiro: aditivo > 0 || supressivo > 0,
  };
}

/** Dias de alteração de prazo (positivo = acréscimo, negativo = antecipação, 0 = nenhum). */
export function impactoPrazoDaDecisao(decisao: Pick<Decisao, 'impactoPrazoDias'>): number {
  const dias = decisao.impactoPrazoDias;
  return typeof dias === 'number' && isFinite(dias) ? dias : 0;
}

export interface TotaisDecisoes {
  aditivos: number;
  supressivos: number;
  saldo: number;
}

export interface TotaisFinanceiros {
  orcamentoBase: number;
  aprovadas: TotaisDecisoes;
  pendentes: TotaisDecisoes;
  investimentoAtualizado: number;
}

function somarDecisoes(decisoes: Decisao[]): TotaisDecisoes {
  let aditivos = 0;
  let supressivos = 0;
  for (const d of decisoes) {
    const impacto = impactoDaDecisao(d);
    aditivos += impacto.aditivo;
    supressivos += impacto.supressivo;
  }
  return { aditivos, supressivos, saldo: aditivos - supressivos };
}

export function totaisFinanceiros(
  fonte: Pick<Obra, 'decisoes' | 'orcamentoInicial'> | Decisao[],
  orcamentoInicial?: number
): TotaisFinanceiros {
  const decisoes = Array.isArray(fonte) ? fonte : fonte.decisoes || [];
  const orcamentoBase = (Array.isArray(fonte) ? orcamentoInicial : fonte.orcamentoInicial) || 0;
  const aprovadas = somarDecisoes(decisoes.filter((d) => d.status === 'aprovada'));
  const pendentes = somarDecisoes(decisoes.filter((d) => d.status === 'pendente'));
  return {
    orcamentoBase,
    aprovadas,
    pendentes,
    investimentoAtualizado: orcamentoBase + aprovadas.aditivos - aprovadas.supressivos,
  };
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

/** URL da aba de decisões da obra, para o perfil que precisa assinar (a contraparte do criador). */
export function montarUrlDecisao(base: string, obraId: string, criadaPor: Decisao['criadaPor']): string {
  const perfilDestino = criadaPor === 'construtor' ? 'cliente' : 'construtor';
  return `${base}?obra=${obraId}&perfil=${perfilDestino}&tab=decisoes`;
}

/** Texto da mensagem de cobrança de assinatura de uma decisão pendente. */
export function montarMensagemWhatsApp(params: {
  obraNome: string;
  decisao: Decisao;
  urlObra?: string;
}): string {
  const { obraNome, decisao, urlObra } = params;
  let msg = `*Eixo - Decisão de Obra Pendente*\n\n`;
  msg += `Olá! Há uma decisão aguardando validação e assinatura digital na obra *${obraNome}*:\n\n`;
  msg += `📌 *${decisao.titulo}*\n`;
  if (decisao.descricao) {
    const resumo = decisao.descricao.length > 140 ? decisao.descricao.substring(0, 137) + '...' : decisao.descricao;
    msg += `📝 _"${resumo}"_\n`;
  }

  const impacto = impactoDaDecisao(decisao);
  if (impacto.temAditivo) {
    msg += `💰 Impacto Financeiro: *+${formatarMoeda(impacto.aditivo)} (Aditivo)*\n`;
  } else if (impacto.temSupressivo) {
    msg += `💰 Impacto Financeiro: *-${formatarMoeda(impacto.supressivo)} (Supressivo / Redução)*\n`;
  }

  const dias = impactoPrazoDaDecisao(decisao);
  if (dias > 0) {
    msg += `⏱️ Impacto no Prazo: *+${dias} dias*\n`;
  }
  if (urlObra) {
    msg += `\nPara analisar os detalhes e assinar formalmente, acesse:\n👉 ${urlObra}`;
  }
  return msg;
}

export function linkWhatsApp(mensagem: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
}
