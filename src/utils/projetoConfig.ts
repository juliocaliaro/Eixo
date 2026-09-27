import React from 'react';
import {
  Blueprint,
  Wind,
  Hammer,
  Lightning,
  HouseLine,
  SquaresFour,
  Drop,
  Lightbulb,
  Ruler,
  FilePdf,
  IconProps
} from '@phosphor-icons/react';
import { TipoProjeto } from '../types/obra';

export interface TipoProjetoConfig {
  id: TipoProjeto;
  label: string;
  descricaoCurta: string;
  Icon: React.ComponentType<IconProps>;
  color: string;
  bg: string;
  border: string;
}

/**
 * Lista oficial de classificações de projetos ordenada alfabeticamente:
 * 1. Arquitetônico
 * 2. Climatização
 * 3. Demolição
 * 4. Elétrico
 * 5. Estrutural
 * 6. Gesso / Drywall
 * 7. Hidráulico
 * 8. Luminotécnico
 * 9. Marcenaria
 * 10. Outro Projeto
 */
export const TIPOS_PROJETO_LISTA: TipoProjetoConfig[] = [
  {
    id: 'arquitetonico',
    label: 'Arquitetônico',
    descricaoCurta: 'Planta baixa, cortes, fachadas e implantação',
    Icon: Blueprint,
    color: 'var(--primary-accent)',
    bg: 'var(--coral-glow-50)',
    border: 'var(--coral-glow-300)',
  },
  {
    id: 'climatizacao',
    label: 'Climatização',
    descricaoCurta: 'Tubulação frigorífica, drenos e evaporadoras',
    Icon: Wind,
    color: '#0f766e',
    bg: '#ccfbf1',
    border: '#99f6e4',
  },
  {
    id: 'demolicao',
    label: 'Demolição',
    descricaoCurta: 'Paredes a demolir/construir e mapa de alvenaria',
    Icon: Hammer,
    color: '#b91c1c',
    bg: '#fee2e2',
    border: '#fecaca',
  },
  {
    id: 'eletrico',
    label: 'Elétrico',
    descricaoCurta: 'Quadros de distribuição, tomadas, circuitos e infraestrutura',
    Icon: Lightning,
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
  },
  {
    id: 'estrutural',
    label: 'Estrutural',
    descricaoCurta: 'Sapatas, vigas, pilares, armações de aço e lajes',
    Icon: HouseLine,
    color: 'var(--cinnamon-wood-700)',
    bg: 'var(--cinnamon-wood-100)',
    border: 'var(--cinnamon-wood-300)',
  },
  {
    id: 'gesso',
    label: 'Gesso / Drywall',
    descricaoCurta: 'Forros rebaixados, cortineiros, sancas e paredes drywall',
    Icon: SquaresFour,
    color: 'var(--mauve-bark-700)',
    bg: 'var(--mauve-bark-100)',
    border: 'var(--mauve-bark-300)',
  },
  {
    id: 'hidraulico',
    label: 'Hidráulico',
    descricaoCurta: 'Água fria, água quente, esgoto sanitário, pluvial e gás',
    Icon: Drop,
    color: '#0284c7',
    bg: '#e0f2fe',
    border: '#bae6fd',
  },
  {
    id: 'luminotecnico',
    label: 'Luminotécnico',
    descricaoCurta: 'Pontos de iluminação, spots, fitas de LED, circuitos e pendentes',
    Icon: Lightbulb,
    color: '#ca8a04',
    bg: '#fef9c3',
    border: '#fef08a',
  },
  {
    id: 'marcenaria',
    label: 'Marcenaria',
    descricaoCurta: 'Detalhamento de móveis planejados, painéis e marcenaria fixa',
    Icon: Ruler,
    color: '#4338ca',
    bg: '#e0e7ff',
    border: '#c7d2fe',
  },
  {
    id: 'outro',
    label: 'Outro Projeto',
    descricaoCurta: 'Projetos especiais, acústica, paisagismo, automação ou memorial',
    Icon: FilePdf,
    color: 'var(--dark-coffee-800)',
    bg: 'var(--dark-coffee-100)',
    border: 'var(--dark-coffee-200)',
  },
];

export function getTipoProjetoConfig(tipo: TipoProjeto, tipoCustomizado?: string): TipoProjetoConfig {
  const found = TIPOS_PROJETO_LISTA.find((t) => t.id === tipo);
  if (!found) {
    return {
      id: 'outro',
      label: tipoCustomizado || 'Outro Projeto',
      descricaoCurta: 'Projeto técnico em PDF',
      Icon: FilePdf,
      color: 'var(--dark-coffee-800)',
      bg: 'var(--dark-coffee-100)',
      border: 'var(--dark-coffee-200)',
    };
  }

  if (tipo === 'outro' && tipoCustomizado) {
    return {
      ...found,
      label: tipoCustomizado,
    };
  }

  return found;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
