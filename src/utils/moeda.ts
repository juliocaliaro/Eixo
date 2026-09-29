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

/**
 * Aplica máscara monetária brasileira (pt-BR) em tempo real durante a digitação.
 * - Proíbe letras e caracteres não numéricos.
 * - Desloca centavos da direita para a esquerda (ex: "1" -> "0,01", "1500" -> "15,00", "18500000" -> "185.000,00").
 * - Permite apagar completamente o campo com Backspace (retorna string vazia "").
 * - Aceita tanto números brutos (number) quanto strings digitadas/coladas.
 */
export function mascararMoedaInput(valor: string | number | undefined | null): string {
  if (valor === undefined || valor === null || valor === '') {
    return '';
  }

  if (typeof valor === 'number') {
    if (isNaN(valor) || valor <= 0) return '';
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Remove qualquer caractere que não seja dígito numérico (proíbe letras e símbolos)
  const digitos = valor.replace(/\D/g, '');

  if (!digitos || /^0+$/.test(digitos)) {
    return '';
  }

  const centavos = parseInt(digitos, 10);
  const valorDecimal = centavos / 100;

  return valorDecimal.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Intercepta o evento onKeyDown para proibir a digitação de letras e caracteres não numéricos em inputs monetários.
 * Permite apenas dígitos (0-9), teclas de controle (Backspace, Tab, Delete, setas, Enter, Escape) e atalhos de clipboard.
 */
export function proibirNaoNumericosMoeda(e: React.KeyboardEvent<HTMLInputElement>): void {
  // Teclas de controle e navegação permitidas
  const teclasPermitidas = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ];

  if (teclasPermitidas.includes(e.key)) {
    return;
  }

  // Atalhos de teclado (Ctrl/Cmd + C, V, A, X, Z)
  if (e.ctrlKey || e.metaKey) {
    return;
  }

  // Permite dígitos de 0 a 9
  if (/^[0-9]$/.test(e.key)) {
    return;
  }

  // Bloqueia qualquer outro caractere (letras, símbolos, espaço, etc.)
  e.preventDefault();
}
