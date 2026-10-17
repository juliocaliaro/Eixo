import { describe, it, expect } from 'vitest';
import { somarDiasData, formatarDataBR } from '../utils/data';

describe('Ajuste de Prazo da Obra via Decisões/Propostas', () => {
  describe('somarDiasData', () => {
    it('deve adicionar dias corretamente dentro do mesmo mês', () => {
      expect(somarDiasData('2026-10-10', 5)).toBe('2026-10-15');
    });

    it('deve subtrair dias corretamente dentro do mesmo mês', () => {
      expect(somarDiasData('2026-10-15', -5)).toBe('2026-10-10');
    });

    it('deve transitar de mês corretamente ao adicionar dias', () => {
      expect(somarDiasData('2026-10-25', 10)).toBe('2026-11-04');
    });

    it('deve transitar de mês corretamente ao subtrair dias', () => {
      expect(somarDiasData('2026-11-04', -10)).toBe('2026-10-25');
    });

    it('deve transitar de ano corretamente', () => {
      expect(somarDiasData('2026-12-25', 10)).toBe('2027-01-04');
      expect(somarDiasData('2027-01-04', -10)).toBe('2026-12-25');
    });

    it('deve lidar corretamente com anos bissextos', () => {
      // 2024 é bissexto (fevereiro tem 29 dias)
      expect(somarDiasData('2024-02-28', 1)).toBe('2024-02-29');
      expect(somarDiasData('2024-02-29', 1)).toBe('2024-03-01');
      expect(somarDiasData('2024-03-01', -1)).toBe('2024-02-29');

      // 2026 não é bissexto (fevereiro tem 28 dias)
      expect(somarDiasData('2026-02-28', 1)).toBe('2026-03-01');
    });
  });

  describe('formatarDataBR', () => {
    it('deve converter YYYY-MM-DD para DD/MM/AAAA', () => {
      expect(formatarDataBR('2026-10-17')).toBe('17/10/2026');
    });

    it('deve retornar "Não informada" para strings vazias ou nulas', () => {
      expect(formatarDataBR('')).toBe('Não informada');
      expect(formatarDataBR(undefined)).toBe('Não informada');
    });
  });
});
