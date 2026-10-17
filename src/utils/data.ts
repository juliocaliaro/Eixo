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

export function formatarDataBR(dataStr?: string): string {
  if (!dataStr) return 'Não informada';
  try {
    const [ano, mes, dia] = dataStr.split('-');
    if (ano && mes && dia) {
      return `${dia}/${mes}/${ano}`;
    }
    return dataStr;
  } catch {
    return dataStr;
  }
}
