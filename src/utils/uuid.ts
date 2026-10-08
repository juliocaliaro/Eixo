/**
 * Utilitário central de UUIDs e Sanitização de IDs para Persistência Cloud (Supabase / PostgreSQL)
 * Garante que todas as entidades possuam identificadores válidos no formato UUID v4.
 */

import { Obra, Etapa, Tarefa, Decisao, ProjetoPDF, RegistroNota, PunchListItem, RegistroLocacao } from '../types/obra';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Verifica se uma string é um UUID válido no padrão RFC 4122
 */
export function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Gera um UUID v4 padrão universal
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback seguro usando crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Fallback pseudo-aleatório
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Garante que o identificador seja um UUID válido. Se já for, preserva; se não for, gera um novo.
 */
export function ensureUUID(id?: string | null): string {
  if (isValidUUID(id)) return id!.trim();
  return generateUUID();
}

/**
 * Converte qualquer obra existente (mesmo com IDs legados como "obra_123" ou "etapa_demo_1")
 * para a estrutura 100% compatível com UUIDs do PostgreSQL, mantendo integridade referencial.
 */
export function sanitizeObraUUIDs(obra: Obra, userId?: string): Obra {
  const idMap = new Map<string, string>();

  const getOrAssignUUID = (oldId: string): string => {
    if (isValidUUID(oldId)) return oldId;
    if (!idMap.has(oldId)) {
      idMap.set(oldId, generateUUID());
    }
    return idMap.get(oldId)!;
  };

  const newObraId = getOrAssignUUID(obra.id);

  // Etapas e tarefas
  const etapasSanitizadas: Etapa[] = (obra.etapas || []).map((etapa) => {
    const newEtapaId = getOrAssignUUID(etapa.id);
    const tarefasSanitizadas: Tarefa[] = (etapa.tarefas || []).map((tarefa) => {
      const newTarefaId = getOrAssignUUID(tarefa.id);
      return {
        ...tarefa,
        id: newTarefaId,
      };
    });

    return {
      ...etapa,
      id: newEtapaId,
      tarefas: tarefasSanitizadas,
    };
  });

  // Decisões
  const decisoesSanitizadas: Decisao[] = (obra.decisoes || []).map((decisao) => {
    return {
      ...decisao,
      id: getOrAssignUUID(decisao.id),
    };
  });

  // Projetos PDF
  const projetosSanitizados: ProjetoPDF[] = (obra.projetos || []).map((proj) => {
    return {
      ...proj,
      id: getOrAssignUUID(proj.id),
    };
  });

  // Notas / Recibos
  const notasSanitizadas: RegistroNota[] = (obra.notas || []).map((nota) => {
    return {
      ...nota,
      id: getOrAssignUUID(nota.id),
      obraId: newObraId,
    };
  });

  // Punch List
  const punchSanitizado: PunchListItem[] = (obra.punchList || []).map((item) => {
    return {
      ...item,
      id: getOrAssignUUID(item.id),
    };
  });

  // Locações
  const locacoesSanitizadas: RegistroLocacao[] = (obra.locacoes || []).map((loc) => {
    return {
      ...loc,
      id: getOrAssignUUID(loc.id),
      obraId: newObraId,
    };
  });

  return {
    ...obra,
    id: newObraId,
    construtorId: userId || obra.construtorId,
    etapas: etapasSanitizadas,
    decisoes: decisoesSanitizadas,
    projetos: projetosSanitizados,
    notas: notasSanitizadas,
    punchList: punchSanitizado,
    locacoes: locacoesSanitizadas,
  };
}
