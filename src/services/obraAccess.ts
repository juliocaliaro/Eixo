import { Obra, PerfilUsuario } from '../types/obra';

/**
 * Regra de acesso as obras (modulo puro, unica fonte da verdade no frontend).
 * A mesma regra e aplicada pela RLS no banco (supabase/migrations); aqui ela serve
 * como defesa em profundidade no repositorio, na listagem e nos testes.
 */

export interface AccessIdentity {
  userId?: string | null;
  email?: string | null;
  /** Papel da CONTA autenticada (nao o perfil de visualizacao alternavel na interface). */
  role: PerfilUsuario;
}

export const normalizeEmail = (value?: string | null): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const normalizeEmailList = (list?: unknown): string[] => {
  if (Array.isArray(list)) {
    return list.map((e) => normalizeEmail(typeof e === 'string' ? e : '')).filter(Boolean);
  }
  if (typeof list === 'string') {
    const n = normalizeEmail(list);
    return n ? [n] : [];
  }
  return [];
};

type ObraAccessFields = Pick<Obra, 'clienteId' | 'clienteEmail' | 'emailsClientes' | 'construtorId'>;

/**
 * Cliente enxerga a obra apenas quando e o cliente vinculado (id), o e-mail principal
 * ou consta na lista de e-mails autorizados. Sem identidade verificavel, nunca ha acesso.
 */
export const obraPertenceAoCliente = (obra: ObraAccessFields, identity: AccessIdentity): boolean => {
  if (identity.userId && obra.clienteId && obra.clienteId === identity.userId) return true;
  const email = normalizeEmail(identity.email);
  if (!email) return false;
  if (normalizeEmail(obra.clienteEmail) === email) return true;
  return normalizeEmailList(obra.emailsClientes).includes(email);
};

export const obraPertenceAoConstrutor = (obra: ObraAccessFields, identity: AccessIdentity): boolean =>
  Boolean(identity.userId) && obra.construtorId === identity.userId;

/** Filtra uma lista de obras para a identidade dada. Nunca devolve lista nao filtrada para cliente. */
export const filtrarObrasVisiveis = <T extends ObraAccessFields>(obras: T[], identity: AccessIdentity): T[] =>
  identity.role === 'cliente'
    ? obras.filter((o) => obraPertenceAoCliente(o, identity))
    : obras.filter((o) => obraPertenceAoConstrutor(o, identity));
