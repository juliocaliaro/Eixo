/**
 * Utilitários de manipulação de datas para o Eixo.
 * Opera de forma pura em strings 'YYYY-MM-DD', evitando desvios de fuso horário UTC/local.
 */

export function somarDiasData(dataStr: string, dias: number): string {
  if (!dataStr) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const parts = dataStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dataStr;
  }

  const [ano, mes, dia] = parts;
  // Criar data no horário local com mês zero-indexed
  const date = new Date(ano, mes - 1, dia);
  date.setDate(date.getDate() + dias);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formata 'YYYY-MM-DD' (ou um timestamp ISO) como 'DD/MM/AAAA'.
 * `fallback` é o texto exibido quando a data está ausente.
 */
export function formatarDataBR(dataStr?: string, fallback: string = 'Não informada'): string {
  if (!dataStr) return fallback;
  if (dataStr.includes('T')) {
    return formatarDataIsoBR(dataStr);
  }
  const [ano, mes, dia] = dataStr.split('-');
  if (ano && mes && dia) {
    return `${dia}/${mes}/${ano}`;
  }
  return dataStr;
}

/**
 * Formata um timestamp ISO como 'DD/MM/AAAA' no fuso local.
 * Retorna '' quando ausente e o texto original quando inválido.
 */
export function formatarDataIsoBR(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export interface OpcoesDataHora {
  /** Inclui o ano (padrão: true). */
  ano?: boolean;
  /** Separador entre data e hora (padrão: ' às '). */
  separador?: string;
}

/**
 * Formata um timestamp ISO como 'DD/MM/AAAA às HH:mm' no fuso local.
 * Retorna '' quando ausente e o texto original quando inválido.
 */
export function formatarDataHoraBR(isoStr?: string, opcoes: OpcoesDataHora = {}): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const { ano = true, separador = ' às ' } = opcoes;
  const data = d.toLocaleDateString('pt-BR', ano
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : { day: '2-digit', month: '2-digit' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data}${separador}${hora}`;
}
