/**
 * Domínio de Locações (puro, sem React).
 * Todas as datas são strings 'YYYY-MM-DD' interpretadas no calendário LOCAL do usuário
 * (nunca via toISOString, que é UTC e vira "amanhã" à noite no Brasil).
 */
import { RegistroLocacao, TipoPeriodoLocacao } from '../types/obra';
import { somarDiasData } from './data';

export type LocacaoTipoStatus = 'devolvido' | 'ativo' | 'vencido' | 'hoje' | 'urgente' | 'em_dia';

export interface LocacaoStatus {
  tipo: LocacaoTipoStatus;
  /** Dias até o vencimento (negativo = vencido). 0 quando devolvido ou sem data. */
  dias: number;
  renovado: boolean;
}

export type FiltroStatusLocacao = 'todos' | 'ativos' | 'vencidos' | 'devolvidos';

export interface LocacaoKpis {
  total: number;
  ativos: number;
  vencidos: number;
  devolvidos: number;
}

export const DIAS_URGENTE = 3;

export const DIAS_POR_PERIODO: Record<TipoPeriodoLocacao, number> = {
  diaria: 1,
  semanal: 7,
  quinzenal: 15,
  mensal: 30,
};

/** Data de hoje (YYYY-MM-DD) no calendário local. */
export function hojeLocal(agora: Date = new Date()): string {
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Converte 'YYYY-MM-DD' (ou ISO com 'T') em número de dia contínuo; null se inválida. */
function diaSerial(data: string): number | null {
  const [a, m, d] = data.split('T')[0].split('-').map(Number);
  if (!a || !m || !d || isNaN(a) || isNaN(m) || isNaN(d)) return null;
  // Date.UTC apenas como contador de dias: sem influência de fuso/horário de verão
  return Math.round(Date.UTC(a, m - 1, d) / 86400000);
}

/** Diferença em dias inteiros (venc - hoje) entre duas datas YYYY-MM-DD. */
export function diasAte(hoje: string, vencimento: string): number | null {
  const h = diaSerial(hoje);
  const v = diaSerial(vencimento);
  if (h === null || v === null) return null;
  return v - h;
}

export function statusLocacao(
  locacao: Pick<RegistroLocacao, 'dataVencimento' | 'status' | 'renovado'>,
  hoje: string
): LocacaoStatus {
  const renovado = Boolean(locacao.renovado);
  if (locacao.status === 'devolvido') return { tipo: 'devolvido', dias: 0, renovado };

  const dias = locacao.dataVencimento ? diasAte(hoje, locacao.dataVencimento) : null;
  if (dias === null) return { tipo: 'ativo', dias: 0, renovado };

  if (dias < 0) return { tipo: 'vencido', dias, renovado };
  if (dias === 0) return { tipo: 'hoje', dias, renovado };
  if (dias <= DIAS_URGENTE) return { tipo: 'urgente', dias, renovado };
  return { tipo: 'em_dia', dias, renovado };
}

/** Calcula o status uma única vez por locação. */
export function mapaStatusLocacoes(
  locacoes: Pick<RegistroLocacao, 'id' | 'dataVencimento' | 'status' | 'renovado'>[],
  hoje: string
): Map<string, LocacaoStatus> {
  const mapa = new Map<string, LocacaoStatus>();
  locacoes.forEach((l) => mapa.set(l.id, statusLocacao(l, hoje)));
  return mapa;
}

export function ehVencidoOuHoje(status: LocacaoStatus): boolean {
  return status.tipo === 'vencido' || status.tipo === 'hoje';
}

export function contarKpis(statuses: Iterable<LocacaoStatus>): LocacaoKpis {
  const kpis: LocacaoKpis = { total: 0, ativos: 0, vencidos: 0, devolvidos: 0 };
  for (const s of statuses) {
    kpis.total++;
    if (s.tipo === 'devolvido') {
      kpis.devolvidos++;
    } else {
      kpis.ativos++;
      if (ehVencidoOuHoje(s)) kpis.vencidos++;
    }
  }
  return kpis;
}

export interface FiltroLocacoes {
  obraId: string; // 'todas' ou id
  status: FiltroStatusLocacao;
  termo: string;
}

export function filtrarLocacoes<T extends { locacao: RegistroLocacao; obra: { id: string; nome: string } }>(
  itens: T[],
  filtro: FiltroLocacoes,
  statusPorId: Map<string, LocacaoStatus>
): T[] {
  const query = filtro.termo.toLowerCase().trim();
  return itens.filter(({ locacao, obra }) => {
    if (filtro.obraId !== 'todas' && obra.id !== filtro.obraId) return false;

    const s = statusPorId.get(locacao.id);
    const devolvido = locacao.status === 'devolvido';
    if (filtro.status === 'ativos' && devolvido) return false;
    if (filtro.status === 'devolvidos' && !devolvido) return false;
    if (filtro.status === 'vencidos' && (devolvido || !s || !ehVencidoOuHoje(s))) return false;

    if (query) {
      const match =
        locacao.itemLocado.toLowerCase().includes(query) ||
        obra.nome.toLowerCase().includes(query) ||
        (locacao.fornecedor || '').toLowerCase().includes(query);
      if (!match) return false;
    }
    return true;
  });
}

/** Vencimento calculado a partir do período escolhido, contando de `hoje`. */
export function calcularVencimentoPeriodo(periodo: TipoPeriodoLocacao, hoje: string): string {
  return somarDiasData(hoje, DIAS_POR_PERIODO[periodo] ?? 0);
}

/** Sugestão de nova data ao renovar: +30 dias a partir do vencimento atual (ou de hoje). */
export function sugerirNovoVencimento(locacao: Pick<RegistroLocacao, 'dataVencimento'>, hoje: string): string {
  const base = locacao.dataVencimento ? locacao.dataVencimento.split('T')[0] : hoje;
  return somarDiasData(base, 30);
}

// ---- Transições de estado (puras) ----

export function renovarLocacao(
  locacao: RegistroLocacao,
  args: { novoVencimento: string; agora?: string }
): RegistroLocacao {
  return {
    ...locacao,
    dataVencimento: args.novoVencimento.trim(),
    vencimentoOriginal: locacao.vencimentoOriginal || locacao.dataVencimento,
    renovado: true,
    renovadoEm: args.agora ?? new Date().toISOString(),
    status: 'ativo', // reativa caso estivesse devolvido
  };
}

export function desfazerRenovacao(locacao: RegistroLocacao): RegistroLocacao {
  return {
    ...locacao,
    renovado: false,
    renovadoEm: undefined,
    dataVencimento: locacao.vencimentoOriginal || locacao.dataVencimento,
  };
}

export function alternarDevolucao(locacao: RegistroLocacao): RegistroLocacao {
  return { ...locacao, status: locacao.status === 'devolvido' ? 'ativo' : 'devolvido' };
}

/** Aplica uma transição a uma locação específica dentro da lista. */
export function atualizarLocacaoNaLista(
  locacoes: RegistroLocacao[],
  id: string,
  fn: (l: RegistroLocacao) => RegistroLocacao
): RegistroLocacao[] {
  return locacoes.map((l) => (l.id === id ? fn(l) : l));
}

export interface ParteResumoLocacao {
  chave: 'vencidos' | 'ativos' | 'devolvidos';
  texto: string;
  /** Destaca a parte que pede atenção (vencidos). */
  alerta?: boolean;
}

/**
 * Resumo em texto dos indicadores (substitui os 4 cartões de KPI):
 * "2 vencidos · 4 ativos · 1 devolvido". Vencidos e devolvidos só aparecem quando > 0;
 * "ativos" inclui os vencidos (mesma contagem do filtro "Ativos").
 */
export function resumoKpisTexto(kpis: LocacaoKpis): ParteResumoLocacao[] {
  const partes: ParteResumoLocacao[] = [];
  if (kpis.vencidos > 0) {
    partes.push({
      chave: 'vencidos',
      texto: `${kpis.vencidos} ${kpis.vencidos === 1 ? 'vencido' : 'vencidos'}`,
      alerta: true,
    });
  }
  partes.push({ chave: 'ativos', texto: `${kpis.ativos} ${kpis.ativos === 1 ? 'ativo' : 'ativos'}` });
  if (kpis.devolvidos > 0) {
    partes.push({
      chave: 'devolvidos',
      texto: `${kpis.devolvidos} ${kpis.devolvidos === 1 ? 'devolvido' : 'devolvidos'}`,
    });
  }
  return partes;
}
