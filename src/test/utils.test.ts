import { describe, it, expect } from 'vitest';
import { getEtapaIcon } from '../utils/etapaIcons';
import { getTipoProjetoConfig, TIPOS_PROJETO_LISTA } from '../utils/projetoConfig';
import { TipoProjeto } from '../types/obra';

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
