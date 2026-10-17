import { normalizeEmail } from '../services/obraAccess';

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

export const emailValido = (value: string): boolean => EMAIL_RE.test(normalizeEmail(value));

export interface ResultadoEmails {
  validos: string[];
  invalidos: string[];
}

/** Separa texto livre (virgula, ponto e virgula, espaco ou quebra de linha) em e-mails normalizados, sem duplicatas. */
export function interpretarEmails(texto: string): ResultadoEmails {
  const validos: string[] = [];
  const invalidos: string[] = [];
  for (const parte of (texto || '').split(/[\s,;]+/)) {
    const email = normalizeEmail(parte);
    if (!email) continue;
    if (!emailValido(email)) {
      if (!invalidos.includes(email)) invalidos.push(email);
    } else if (!validos.includes(email)) {
      validos.push(email);
    }
  }
  return { validos, invalidos };
}

/** Junta e-mails a uma lista existente, sem duplicar. */
export function mesclarEmails(atual: string[], novos: string[]): string[] {
  const out = [...atual];
  for (const e of novos) if (!out.includes(e)) out.push(e);
  return out;
}

/** E-mails de acesso do cliente de uma obra (principal + lista), normalizados e unicos. */
export function emailsDaObra(obra: { clienteEmail?: string; emailsClientes?: string[] }): string[] {
  return mesclarEmails(
    obra.clienteEmail ? [normalizeEmail(obra.clienteEmail)].filter(Boolean) : [],
    (obra.emailsClientes || []).map((e) => normalizeEmail(e)).filter(Boolean),
  );
}

export interface ListaAcesso {
  emailsClientes: string[];
  clienteEmail: string | undefined;
}

/** Monta o par persistido: `clienteEmail` e sempre o primeiro da lista (ou vazio quando nao ha ninguem). */
export function montarListaAcesso(emails: string[]): ListaAcesso {
  return { emailsClientes: emails, clienteEmail: emails[0] };
}

export interface ResultadoAdicao extends ListaAcesso {
  adicionados: string[];
  jaExistiam: string[];
  invalidos: string[];
}

/** Adiciona e-mails digitados/colados a lista de acesso da obra. */
export function adicionarAoAcesso(obra: { clienteEmail?: string; emailsClientes?: string[] }, texto: string): ResultadoAdicao {
  const atual = emailsDaObra(obra);
  const { validos, invalidos } = interpretarEmails(texto);
  const adicionados = validos.filter((e) => !atual.includes(e));
  const jaExistiam = validos.filter((e) => atual.includes(e));
  return { ...montarListaAcesso(mesclarEmails(atual, adicionados)), adicionados, jaExistiam, invalidos };
}

/** Remove um e-mail da lista de acesso da obra. */
export function removerDoAcesso(obra: { clienteEmail?: string; emailsClientes?: string[] }, email: string): ListaAcesso {
  const alvo = normalizeEmail(email);
  return montarListaAcesso(emailsDaObra(obra).filter((e) => e !== alvo));
}
