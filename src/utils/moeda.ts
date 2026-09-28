/**
 * Utilitários para tratamento e formatação de valores monetários (BRL / pt-BR).
 */

/**
 * Converte com segurança entradas monetárias em pt-BR ou numéricas para number.
 * Trata casos como:
 * - "1.500,50" -> 1500.50
 * - "1500,50" -> 1500.50
 * - "1.500" -> 1500
 * - "1500.50" -> 1500.50
 * - "R$ 10.000,00" -> 10000
 */
export function parseMoedaBR(valor: string | number | undefined | null): number | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor === 'number') {
    return isNaN(valor) ? undefined : valor;
  }

  const limpo = valor.trim().replace(/\s/g, '').replace(/R\$/g, '');
  if (!limpo) return undefined;

  let resultado: number;

  // Caso contenha vírgula (padrão brasileiro decimal): remove pontos de milhar e troca vírgula por ponto
  if (limpo.includes(',')) {
    resultado = parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
  } else if ((limpo.match(/\./g) || []).length > 1) {
    // Múltiplos pontos (ex: "1.000.000") -> remove pontos de milhar
    resultado = parseFloat(limpo.replace(/\./g, ''));
  } else if (/^\d{1,3}\.\d{3}$/.test(limpo)) {
    // Ponto isolado como milhar exato sem decimais (ex: "1.000" ou "50.000")
    resultado = parseFloat(limpo.replace('.', ''));
  } else {
    // Valor numérico padrão com ponto decimal ou inteiro puro
    resultado = parseFloat(limpo);
  }

  return isNaN(resultado) ? undefined : resultado;
}

/**
 * Formata um valor numérico para string monetária em Real brasileiro (R$).
 */
export function formatarMoeda(valor?: number | null, maxDecimais: number = 2): string {
  if (valor === undefined || valor === null || isNaN(valor)) {
    return 'R$ 0,00';
  }
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: maxDecimais === 0 ? 0 : 2,
    maximumFractionDigits: maxDecimais,
  });
}
