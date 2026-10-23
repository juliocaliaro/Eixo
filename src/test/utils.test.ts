import { describe, it, expect } from 'vitest';
import { getEtapaIcon } from '../utils/etapaIcons';
import { getTipoProjetoConfig, TIPOS_PROJETO_LISTA } from '../utils/projetoConfig';
import { TipoProjeto } from '../types/obra';
import { PRESET_TIPOS_OBRA } from '../data/presetObras';
import { HouseLine, SealCheck } from '@phosphor-icons/react';

describe('4. Utilitários de Ícones e Disciplinas Técnicas', () => {
  it('deve associar corretamente a cor temática para Projetos e Legalização', () => {
    const iconConfig = getEtapaIcon('Projetos e Legalização');
    expect(iconConfig.color).toBe('#0284c7');
    expect(iconConfig.bg).toBe('#e0f2fe');
  });

  it('deve associar corretamente a cor temática e ícone para Fundação', () => {
    const iconConfig = getEtapaIcon('Fundação e Contenção');
    expect(iconConfig.color).toBe('var(--cinnamon-wood-700)');
    expect(iconConfig.bg).toBe('var(--cinnamon-wood-100)');
  });

  it('deve associar corretamente a cor temática para Acabamentos e Pintura', () => {
    const iconConfig = getEtapaIcon('Acabamentos e Pintura');
    expect(iconConfig.color).toBe('#0284c7');
    expect(iconConfig.bg).toBe('#e0f2fe');
  });

  it('deve associar ícone e cores temáticas corretas para Cobertura e Telhado', () => {
    const iconConfig = getEtapaIcon('Cobertura e Telhado');
    expect(iconConfig.Icon).toBe(HouseLine);
    expect(iconConfig.color).toBe('#b45309');
    expect(iconConfig.bg).toBe('#ffedd5');
  });

  it('deve associar ícone e cores temáticas corretas para Finalização e Entrega', () => {
    const iconConfig = getEtapaIcon('Finalização e Entrega');
    expect(iconConfig.Icon).toBe(SealCheck);
    expect(iconConfig.color).toBe('#16a34a');
    expect(iconConfig.bg).toBe('#dcfce7');
  });

  it('deve retornar configuração válida para todos os tipos oficiais de projeto em PDF', () => {
    const tipos: TipoProjeto[] = [
      'arquitetonico',
      'estrutural',
      'eletrico',
      'hidraulico',
      'climatizacao',
      'demolicao',
      'gesso',
      'luminotecnico',
      'marcenaria',
      'outro',
    ];

    tipos.forEach((t) => {
      const config = getTipoProjetoConfig(t);
      expect(config).toBeDefined();
      expect(config.label).toBeDefined();
      expect(config.Icon).toBeDefined();
    });

    expect(TIPOS_PROJETO_LISTA.length).toBe(10);
  });
});

describe('Preset Oficial de Construção', () => {
  const presetConstrucao = PRESET_TIPOS_OBRA.find((p) => p.id === 'O01' && p.nome === 'Construção');

  it('deve existir no preset de tipos de obra', () => {
    expect(presetConstrucao).toBeDefined();
    expect(presetConstrucao?.nome).toBe('Construção');
  });

  it('deve conter exatamente 12 etapas técnicas', () => {
    expect(presetConstrucao?.etapas.length).toBe(12);
  });

  it('deve conter exatamente 6 tarefas em cada uma das 12 etapas (totalizando 72 tarefas)', () => {
    expect(presetConstrucao).toBeDefined();
    if (!presetConstrucao) return;

    let totalTarefas = 0;
    presetConstrucao.etapas.forEach((etapa, index) => {
      expect(
        etapa.tarefas.length,
        `Etapa ${index + 1} (${etapa.nome}) deve ter 6 tarefas`
      ).toBe(6);
      totalTarefas += etapa.tarefas.length;
    });

    expect(totalTarefas).toBe(72);
  });

  it('deve conter os IDs de etapas oficiais de E01_C até E12_C', () => {
    const idsEsperados = [
      'E01_C', 'E02_C', 'E03_C', 'E04_C', 'E05_C', 'E06_C',
      'E07_C', 'E08_C', 'E09_C', 'E10_C', 'E11_C', 'E12_C'
    ];
    const idsAtuais = presetConstrucao?.etapas.map((e) => e.id);
    expect(idsAtuais).toEqual(idsEsperados);
  });

  it('deve ter ícones mapeados tematicamente para todas as 12 etapas', () => {
    presetConstrucao?.etapas.forEach((etapa) => {
      const iconConfig = getEtapaIcon(etapa.nome, etapa.id);
      expect(iconConfig).toBeDefined();
      expect(iconConfig.Icon).toBeDefined();
      // Não deve ser o fallback genérico
      expect(iconConfig.bg).not.toBe('var(--dark-coffee-50)');
    });
  });
});
