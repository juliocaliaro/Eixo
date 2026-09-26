import React from 'react';
import {
  Lightning,
  Drop,
  Hammer,
  Blueprint,
  HouseLine,
  Compass,
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

export const TIPOS_PROJETO_LISTA: TipoProjetoConfig[] = [
  {
    id: 'eletrico',
    label: 'Elétrico & Iluminação',
    descricaoCurta: 'Quadros, tomadas, circuitos, iluminação e dados',
    Icon: Lightning,
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a',
  },
  {
    id: 'hidraulico',
    label: 'Hidráulico & Sanitário',
    descricaoCurta: 'Água fria, água quente, esgoto, pluvial e gás',
    Icon: Drop,
    color: '#0284c7',
    bg: '#e0f2fe',
    border: '#bae6fd',
  },
  {
    id: 'demolicao',
    label: 'Demolição & Layout',
    descricaoCurta: 'Paredes a demolir/construir e mapa de alvenaria',
    Icon: Hammer,
    color: '#b91c1c',
    bg: '#fee2e2',
    border: '#fecaca',
  },
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
    id: 'estrutural',
    label: 'Estrutural & Fundação',
    descricaoCurta: 'Sapatas, vigas, pilares, armações e lajes',
    Icon: HouseLine,
    color: 'var(--cinnamon-wood-700)',
    bg: 'var(--cinnamon-wood-100)',
    border: 'var(--cinnamon-wood-300)',
  },
  {
    id: 'climatizacao',
    label: 'Climatização & HVAC',
    descricaoCurta: 'Tubulação frigorífica, drenos e evaporadoras',
    Icon: Compass,
    color: '#0f766e',
    bg: '#ccfbf1',
    border: '#99f6e4',
  },
  {
    id: 'marcenaria',
    label: 'Marcenaria & Detalhes',
    descricaoCurta: 'Móveis planejados, esquadrias e acabamentos',
    Icon: Ruler,
    color: '#4338ca',
    bg: '#e0e7ff',
    border: '#c7d2fe',
  },
  {
    id: 'outro',
    label: 'Outro Projeto',
    descricaoCurta: 'Projetos especiais, acústica, paisagismo ou memorial',
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
      label: tipoCustomizado || 'Outro',
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
