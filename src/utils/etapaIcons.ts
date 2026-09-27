import React from 'react';
import {
  FileText,
  HardHat,
  Shovel,
  Columns,
  Wall,
  HouseLine,
  Lightning,
  Wrench,
  GridFour,
  PaintRoller,
  Plant,
  Sparkle,
  SealCheck,
  ShieldCheck,
  Hammer,
  Key,
  IconProps
} from '@phosphor-icons/react';

export interface EtapaIconConfig {
  Icon: React.ComponentType<IconProps>;
  color: string;
  bg: string;
}

/**
 * Retorna o ícone e paleta temática correspondente à etapa da obra.
 * Mapeia palavras-chave técnicas para ícones ilustrativos e expressivos.
 */
export function getEtapaIcon(nome: string, _etapaId?: string): EtapaIconConfig {
  const n = (nome || '').toLowerCase().trim();

  // 1. Projetos e Legalização
  if (n.includes('projeto') || n.includes('legalização') || n.includes('alvará') || n.includes('topografia')) {
    return {
      Icon: FileText,
      color: '#0284c7',
      bg: '#e0f2fe',
    };
  }

  // 2. Terreno e Canteiro
  if (n.includes('terreno') || n.includes('canteiro') || n.includes('tapume') || n.includes('gabarito')) {
    return {
      Icon: HardHat,
      color: '#d97706',
      bg: '#fef3c7',
    };
  }

  // 3. Isolamento e Preparação (Reforma)
  if (n.includes('isolamento') || n.includes('preparação') || n.includes('proteção')) {
    return {
      Icon: ShieldCheck,
      color: 'var(--dark-coffee-800)',
      bg: 'var(--dark-coffee-100)',
    };
  }

  // 4. Demolição (Reforma)
  if (n.includes('demolição') || n.includes('descarte') || n.includes('entulho') || n.includes('demolir')) {
    return {
      Icon: Hammer,
      color: '#dc2626',
      bg: '#fee2e2',
    };
  }

  // 5. Fundação e Contenção (Construção)
  if (n.includes('fundação') || n.includes('contenção') || n.includes('arrimo') || n.includes('sapata') || n.includes('baldrame')) {
    return {
      Icon: Shovel,
      color: 'var(--cinnamon-wood-700)',
      bg: 'var(--cinnamon-wood-100)',
    };
  }

  // 6. Estrutura (Construção)
  if (n.includes('estrutura') || n.includes('pilar') || n.includes('viga') || n.includes('laje') || n.includes('concreto')) {
    return {
      Icon: Columns,
      color: 'var(--dark-coffee-800)',
      bg: 'var(--dark-coffee-100)',
    };
  }

  // 7. Alvenaria e Vedação / Construção
  if (n.includes('alvenaria') || n.includes('vedação') || n.includes('parede') || n.includes('construção')) {
    return {
      Icon: Wall,
      color: 'var(--mauve-bark-700)',
      bg: 'var(--mauve-bark-100)',
    };
  }

  // 8. Cobertura e Aquecimento
  if (n.includes('cobertura') || n.includes('telhad') || n.includes('aquecimento') || n.includes('boiler') || n.includes('telha') || n.includes('calha')) {
    return {
      Icon: HouseLine,
      color: '#b45309',
      bg: '#ffedd5',
    };
  }

  // 9. Infraestrutura e Instalações (Elétrica, Hidráulica, Ar condicionado)
  if (n.includes('infraestrutura') || n.includes('instalaç') || n.includes('elétrica') || n.includes('hidráulica') || n.includes('fotovoltaica') || n.includes('esgoto')) {
    return {
      Icon: Lightning,
      color: '#d97706',
      bg: '#fef3c7',
    };
  }

  // 10. Revestimentos Brutos
  if (n.includes('bruto') || n.includes('chapisco') || n.includes('emboço') || n.includes('reboco') || n.includes('contrapiso')) {
    return {
      Icon: Wrench,
      color: 'var(--cinnamon-wood-800)',
      bg: 'var(--cinnamon-wood-100)',
    };
  }

  // 11. Revestimentos e Gesso
  if (n.includes('revestimento') || n.includes('gesso') || n.includes('porcelanato') || n.includes('piso') || n.includes('bancada')) {
    return {
      Icon: GridFour,
      color: 'var(--primary-accent)',
      bg: 'var(--coral-glow-100)',
    };
  }

  // 12. Acabamentos e Pintura
  if (n.includes('acabamento') || n.includes('pintura') || n.includes('lixamento') || n.includes('massa')) {
    return {
      Icon: PaintRoller,
      color: '#0284c7',
      bg: '#e0f2fe',
    };
  }

  // 13. Área Externa e Paisagismo
  if (n.includes('externa') || n.includes('paisagismo') || n.includes('piscina') || n.includes('plantio') || n.includes('jardim')) {
    return {
      Icon: Plant,
      color: '#059669',
      bg: '#d1fae5',
    };
  }

  // 14. Finalização
  if (n.includes('finalização') || n.includes('limpeza')) {
    return {
      Icon: Sparkle,
      color: '#7c3aed',
      bg: '#ede9fe',
    };
  }

  // 15. Testes, Desmobilização e Entrega
  if (n.includes('teste') || n.includes('desmobilização') || n.includes('entrega') || n.includes('chave') || n.includes('habite-se') || n.includes('vistoria')) {
    return {
      Icon: SealCheck,
      color: '#16a34a',
      bg: '#dcfce7',
    };
  }

  // Fallback para etapas customizadas
  return {
    Icon: Sparkle,
    color: 'var(--primary-accent)',
    bg: 'var(--dark-coffee-50)',
  };
}
