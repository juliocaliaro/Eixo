/**
 * Transições de estado PURAS da obra (sem React, sem toasts, sem I/O).
 * Cada função recebe a obra atual e devolve uma nova obra (imutável).
 * Timestamps vêm do parâmetro `now` (padrão: agora) para serem testáveis.
 *
 * INVARIANTE DE PRAZO (AGENTS.md seção 4): o impacto de prazo de uma decisão
 * (`impactoPrazoDias`) é aplicado em `obra.dataPrevista` exatamente quando a
 * decisão é registrada (status pendente) e revertido exatamente quando ela
 * sai de `pendente` para `recusada`. A aprovação mantém o prazo. O estado da
 * decisão é a única fonte de idempotência: recusar/assinar uma decisão que
 * não está pendente é no-op, e uma decisão registrada já `recusada` não
 * aplica prazo. Datas ausentes/inválidas nunca são alteradas.
 */
import {
  AnexoItem,
  Decisao,
  Etapa,
  Obra,
  PerfilUsuario,
  PunchListItem,
  ProjetoPDF,
  Tarefa,
  TipoProjeto,
} from '../types/obra';
import { generateUUID } from './uuid';
import { somarDiasData } from './data';
import { impactoPrazoDaDecisao } from './obraMetrics';

type Now = Date | string;
const iso = (now?: Now): string =>
  now === undefined ? new Date().toISOString() : typeof now === 'string' ? now : now.toISOString();

const limpar = (v?: string): string | undefined => (v && v.trim() ? v.trim() : undefined);

function mapEtapa(obra: Obra, etapaId: string, fn: (e: Etapa) => Etapa): Obra {
  return { ...obra, etapas: obra.etapas.map((e) => (e.id === etapaId ? fn(e) : e)) };
}

function comAmbiente(ambientes: string[] | undefined, amb?: string): string[] {
  const lista = ambientes ? [...ambientes] : [];
  if (amb && !lista.includes(amb)) lista.push(amb);
  return lista;
}

function mover<T>(lista: T[], de: number, para: number): T[] {
  const r = [...lista];
  const [item] = r.splice(de, 1);
  r.splice(para, 0, item);
  return r;
}

// ---------------------------------------------------------------------------
// Prazo
// ---------------------------------------------------------------------------

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

/** Soma dias à data prevista; no-op se a data é ausente/inválida ou dias = 0. */
export function ajustarPrazo(obra: Obra, dias: number): Obra {
  if (!dias || !DATA_VALIDA.test(obra.dataPrevista || '')) return obra;
  const nova = somarDiasData(obra.dataPrevista, dias);
  return nova === obra.dataPrevista ? obra : { ...obra, dataPrevista: nova };
}

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------

export function adicionarEtapa(
  obra: Obra,
  dados: { nome: string; tarefas: { nome: string }[]; tipoOrigem?: string },
  insertIndex?: number | null
): Obra {
  const nova: Etapa = {
    id: generateUUID(),
    nome: dados.nome,
    tipoOrigem: dados.tipoOrigem,
    tarefas: dados.tarefas.map((t) => ({ id: generateUUID(), nome: t.nome, concluida: false })),
  };
  const etapas = [...obra.etapas];
  if (insertIndex !== null && insertIndex !== undefined && insertIndex >= 0) etapas.splice(insertIndex, 0, nova);
  else etapas.push(nova);
  return { ...obra, etapas };
}

export function removerEtapa(obra: Obra, etapaId: string): Obra {
  return { ...obra, etapas: obra.etapas.filter((e) => e.id !== etapaId) };
}

export function renomearEtapa(obra: Obra, etapaId: string, nome: string): Obra {
  return mapEtapa(obra, etapaId, (e) => ({ ...e, nome }));
}

export function reordenarEtapas(obra: Obra, de: number, para: number): Obra {
  if (de === para) return obra;
  return { ...obra, etapas: mover(obra.etapas, de, para) };
}

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------

export interface ResultadoToggle {
  obra: Obra;
  /** Tarefa que acabou de ser concluída (null ao desmarcar ou se não achou). */
  tarefaConcluida: Tarefa | null;
  /** Etapa (estado anterior ao toggle) que contém a tarefa concluída. */
  etapaDaTarefa: Etapa | null;
  /** A etapa passou de incompleta para 100% neste toggle. */
  etapaConcluida: boolean;
  /** A obra inteira está 100% (só verdadeiro quando uma tarefa foi concluída agora). */
  obraConcluida: boolean;
}

export function alternarTarefa(obra: Obra, etapaId: string, tarefaId: string, now?: Now): ResultadoToggle {
  const ts = iso(now);
  let tarefaConcluida: Tarefa | null = null;
  let etapaDaTarefa: Etapa | null = null;
  let etapaConcluida = false;

  const etapas = obra.etapas.map((e) => {
    if (e.id !== etapaId) return e;
    etapaDaTarefa = e;
    const tarefas = e.tarefas.map((t) => {
      if (t.id !== tarefaId) return t;
      const concluida = !t.concluida;
      const atualizada: Tarefa = { ...t, concluida, concluidaEm: concluida ? ts : undefined };
      if (concluida) tarefaConcluida = atualizada;
      return atualizada;
    });
    const todas = tarefas.length > 0 && tarefas.every((t) => t.concluida);
    etapaConcluida = todas && !e.concluida;
    return { ...e, tarefas, concluida: todas, concluidaEm: todas ? e.concluidaEm || ts : undefined };
  });

  const todasTarefas = etapas.flatMap((e) => e.tarefas);
  const obraConcluida =
    tarefaConcluida !== null && todasTarefas.length > 0 && todasTarefas.every((t) => t.concluida);
  return { obra: { ...obra, etapas }, tarefaConcluida, etapaDaTarefa, etapaConcluida, obraConcluida };
}

export function removerTarefa(obra: Obra, etapaId: string, tarefaId: string): Obra {
  return mapEtapa(obra, etapaId, (e) => ({ ...e, tarefas: e.tarefas.filter((t) => t.id !== tarefaId) }));
}

export function renomearTarefa(obra: Obra, etapaId: string, tarefaId: string, nome: string): Obra {
  return mapEtapa(obra, etapaId, (e) => ({
    ...e,
    tarefas: e.tarefas.map((t) => (t.id === tarefaId ? { ...t, nome } : t)),
  }));
}

/** Edita nome (ignora vazio) e ambiente da tarefa. */
export function editarTarefa(obra: Obra, etapaId: string, tarefaId: string, nome: string, ambiente?: string): Obra {
  const amb = limpar(ambiente);
  const nomeTrim = nome.trim();
  return mapEtapa(obra, etapaId, (e) => ({
    ...e,
    ambientes: comAmbiente(e.ambientes, amb),
    tarefas: e.tarefas.map((t) => (t.id === tarefaId ? { ...t, nome: nomeTrim || t.nome, ambiente: amb } : t)),
  }));
}

export function reordenarTarefas(obra: Obra, etapaId: string, de: number, para: number): Obra {
  if (de === para) return obra;
  return mapEtapa(obra, etapaId, (e) => ({ ...e, tarefas: mover(e.tarefas, de, para) }));
}

export function adicionarTarefa(
  obra: Obra,
  etapaId: string,
  nome: string,
  insertAtIndex?: number,
  ambiente?: string
): Obra {
  const amb = limpar(ambiente);
  const nova: Tarefa = { id: generateUUID(), nome, concluida: false, ambiente: amb };
  return mapEtapa(obra, etapaId, (e) => {
    const tarefas = [...e.tarefas];
    if (insertAtIndex !== undefined && insertAtIndex >= 0) tarefas.splice(insertAtIndex, 0, nova);
    else tarefas.push(nova);
    return { ...e, ambientes: comAmbiente(e.ambientes, amb), tarefas };
  });
}

export function moverTarefaParaAgrupamento(obra: Obra, etapaId: string, tarefaId: string, ambiente?: string): Obra {
  const amb = limpar(ambiente);
  return mapEtapa(obra, etapaId, (e) => ({
    ...e,
    ambientes: comAmbiente(e.ambientes, amb),
    tarefas: e.tarefas.map((t) => (t.id === tarefaId ? { ...t, ambiente: amb } : t)),
  }));
}

// ---------------------------------------------------------------------------
// Agrupamentos (ambientes)
// ---------------------------------------------------------------------------

/** No-op (mesma referência) se o nome é vazio. */
export function criarAgrupamento(obra: Obra, etapaId: string, nome: string): Obra {
  const n = nome.trim();
  if (!n) return obra;
  return mapEtapa(obra, etapaId, (e) => ({ ...e, ambientes: comAmbiente(e.ambientes, n) }));
}

/** No-op se o novo nome é vazio ou igual ao antigo. */
export function renomearAgrupamento(obra: Obra, etapaId: string, antigo: string, novo: string): Obra {
  const n = novo.trim();
  if (!n || n === antigo) return obra;
  return mapEtapa(obra, etapaId, (e) => {
    const mapeados = (e.ambientes || []).map((a) => (a === antigo ? n : a));
    if (!mapeados.includes(n)) mapeados.push(n);
    return {
      ...e,
      ambientes: Array.from(new Set(mapeados.filter((a) => a !== antigo))),
      tarefas: e.tarefas.map((t) => (t.ambiente === antigo ? { ...t, ambiente: n } : t)),
    };
  });
}

export function removerAgrupamento(obra: Obra, etapaId: string, nome: string): Obra {
  return mapEtapa(obra, etapaId, (e) => ({
    ...e,
    ambientes: (e.ambientes || []).filter((a) => a !== nome),
    tarefas: e.tarefas.map((t) => (t.ambiente === nome ? { ...t, ambiente: undefined } : t)),
  }));
}

// ---------------------------------------------------------------------------
// Mídia, anexos, projetos, vistoria
// ---------------------------------------------------------------------------

export function adicionarMidiaNaTarefa(
  obra: Obra,
  etapaId: string,
  tarefaId: string,
  dados: { fotoBase64?: string; fotosBase64?: string[]; anotacao?: string }
): Obra {
  const novas =
    dados.fotosBase64 && dados.fotosBase64.length > 0 ? dados.fotosBase64 : dados.fotoBase64 ? [dados.fotoBase64] : [];
  return mapEtapa(obra, etapaId, (e) => ({
    ...e,
    tarefas: e.tarefas.map((t) => {
      if (t.id !== tarefaId) return t;
      const anotacoes = t.anotacoes ? [...t.anotacoes] : [];
      if (dados.anotacao) anotacoes.push(dados.anotacao);
      return { ...t, fotos: [...(t.fotos || []), ...novas], anotacoes };
    }),
  }));
}

export function definirMidiaDaTarefa(
  obra: Obra,
  etapaId: string,
  tarefaId: string,
  fotos: string[],
  anotacoes: string[]
): Obra {
  return mapEtapa(obra, etapaId, (e) => ({
    ...e,
    tarefas: e.tarefas.map((t) => (t.id === tarefaId ? { ...t, fotos, anotacoes } : t)),
  }));
}

export function adicionarAnexoGeral(obra: Obra, anexo: Omit<AnexoItem, 'id' | 'data'>, now?: Now): Obra {
  const item: AnexoItem = { ...anexo, id: `anexo_geral_${generateUUID()}`, data: iso(now) };
  return { ...obra, anexosGerais: [...(obra.anexosGerais || []), item] };
}

export function removerAnexoGeral(obra: Obra, anexoId: string): Obra {
  return { ...obra, anexosGerais: (obra.anexosGerais || []).filter((a) => a.id !== anexoId) };
}

export interface DadosProjeto {
  titulo: string;
  tipo: TipoProjeto;
  tipoCustomizado?: string;
  arquivoNome: string;
  tamanhoBytes: number;
  url: string;
  versao?: string;
  descricao?: string;
}

export function adicionarProjeto(
  obra: Obra,
  dados: DadosProjeto,
  perfil: PerfilUsuario,
  nomeAutor: string,
  now?: Now
): Obra {
  const projeto: ProjetoPDF = {
    id: generateUUID(),
    ...dados,
    dataUpload: iso(now),
    enviadoPor: perfil,
    enviadoPorNome: nomeAutor,
  };
  return { ...obra, projetos: [projeto, ...(obra.projetos || [])] };
}

export function removerProjeto(obra: Obra, projetoId: string): Obra {
  return { ...obra, projetos: (obra.projetos || []).filter((p) => p.id !== projetoId) };
}

export function definirPunchList(obra: Obra, itens: PunchListItem[]): Obra {
  return { ...obra, punchList: itens };
}

// ---------------------------------------------------------------------------
// Decisões (dono do invariante de prazo)
// ---------------------------------------------------------------------------

/**
 * Registra a decisão (no topo da lista) e aplica o impacto de prazo uma única
 * vez. Id já existente não altera nada; decisão já recusada não aplica prazo.
 */
export function proporDecisao(obra: Obra, decisao: Decisao): Obra {
  if ((obra.decisoes || []).some((d) => d.id === decisao.id)) return obra;
  const comDecisao: Obra = { ...obra, decisoes: [decisao, ...(obra.decisoes || [])] };
  return decisao.status === 'recusada' ? comDecisao : ajustarPrazo(comDecisao, impactoPrazoDaDecisao(decisao));
}

/** Somente a contraparte (perfil != criadaPor) assina, e só decisão pendente; senão no-op. */
export function assinarDecisao(
  obra: Obra,
  decisaoId: string,
  perfil: PerfilUsuario,
  nomeSignatario: string,
  now?: Now
): Obra {
  const alvo = (obra.decisoes || []).find((d) => d.id === decisaoId);
  if (!alvo || alvo.status !== 'pendente' || alvo.criadaPor === perfil) return obra;
  const assinadoEm = iso(now);
  return {
    ...obra,
    decisoes: (obra.decisoes || []).map((d) =>
      d.id === decisaoId
        ? { ...d, status: 'aprovada' as const, assinaturaContraparte: { autor: perfil, nomeSignatario, assinadoEm } }
        : d
    ),
  };
}

/** Somente a contraparte recusa decisão pendente; reverte o prazo uma única vez. */
export function recusarDecisao(obra: Obra, decisaoId: string, perfil: PerfilUsuario): Obra {
  const alvo = (obra.decisoes || []).find((d) => d.id === decisaoId);
  if (!alvo || alvo.status !== 'pendente' || alvo.criadaPor === perfil) return obra;
  const atualizada: Obra = {
    ...obra,
    decisoes: (obra.decisoes || []).map((d) => (d.id === decisaoId ? { ...d, status: 'recusada' as const } : d)),
  };
  return ajustarPrazo(atualizada, -impactoPrazoDaDecisao(alvo));
}

/** Exclui a decisão; se ainda pendente, reverte o prazo. Aprovada/recusada: só remove. */
export function removerDecisao(obra: Obra, decisaoId: string): Obra {
  const alvo = (obra.decisoes || []).find((d) => d.id === decisaoId);
  if (!alvo) return obra;
  const sem: Obra = { ...obra, decisoes: (obra.decisoes || []).filter((d) => d.id !== decisaoId) };
  return alvo.status === 'pendente' ? ajustarPrazo(sem, -impactoPrazoDaDecisao(alvo)) : sem;
}
