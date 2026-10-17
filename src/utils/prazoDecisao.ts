import { somarDiasData } from './data';

/** Mantem apenas digitos (dias inteiros). */
export const apenasDigitos = (v: string): string => (v || '').replace(/\D/g, '').slice(0, 4);

export interface CamposPrazo {
  acrescimo: string;
  reducao: string;
}

/** Exclusao mutua: ao preencher um campo (valor > 0), o outro e limpo. */
export function atualizarPrazo(campo: 'acrescimo' | 'reducao', valor: string, atual: CamposPrazo): CamposPrazo {
  const limpo = apenasDigitos(valor);
  const preenchido = Number(limpo) > 0;
  if (campo === 'acrescimo') return { acrescimo: limpo, reducao: preenchido ? '' : atual.reducao };
  return { reducao: limpo, acrescimo: preenchido ? '' : atual.acrescimo };
}

/** Dias assinados (+N / -N) ou undefined quando nao ha alteracao. */
export function diasAssinados({ acrescimo, reducao }: CamposPrazo): number | undefined {
  const a = Number(acrescimo) || 0;
  const r = Number(reducao) || 0;
  if (a > 0) return a;
  if (r > 0) return -r;
  return undefined;
}

/** Nova data prevista (YYYY-MM-DD) ou undefined quando nao ha alteracao ou a obra nao tem data. */
export function novaDataPrevista(dataPrevista: string | undefined, dias: number | undefined): string | undefined {
  if (!dias || !dataPrevista) return undefined;
  return somarDiasData(dataPrevista, dias);
}
