import { describe, it, expect } from 'vitest';
import { somarDiasData, formatarDataBR } from '../utils/data';
import { Obra, Decisao } from '../types/obra';

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

  describe('Fluxo de acréscimo e redução de prazo na Obra', () => {
    const obraInicial: Obra = {
      id: 'obra-1',
      nome: 'Residência Teste',
      cliente: 'Carlos',
      endereco: 'Rua das Flores, 123',
      dataPrevista: '2026-12-15',
      criadaEm: '2026-01-01T00:00:00.000Z',
      etapas: [],
      decisoes: [],
    };

    it('deve prorrogar o prazo final da obra quando a proposta tem acréscimo de prazo (+15 dias)', () => {
      const decisao: Decisao = {
        id: 'dec-1',
        titulo: 'Atraso na entrega de granito',
        descricao: 'Necessidade de 15 dias a mais para importação',
        impactoPrazoDias: 15,
        criadaPor: 'construtor',
        criadorNome: 'Engenheiro',
        criadaEm: '2026-10-17T00:00:00.000Z',
        status: 'pendente',
        assinaturaCriador: {
          autor: 'construtor',
          nomeSignatario: 'Engenheiro',
          assinadoEm: '2026-10-17T00:00:00.000Z',
        },
      };

      const novaData = somarDiasData(obraInicial.dataPrevista, decisao.impactoPrazoDias!);
      expect(novaData).toBe('2026-12-30');
    });

    it('deve antecipar o prazo final da obra quando a proposta tem redução de prazo (-10 dias)', () => {
      const decisao: Decisao = {
        id: 'dec-2',
        titulo: 'Turno extra aos sábados',
        descricao: 'Equipe ampliada para antecipar entrega',
        impactoPrazoDias: -10,
        criadaPor: 'construtor',
        criadorNome: 'Engenheiro',
        criadaEm: '2026-10-17T00:00:00.000Z',
        status: 'pendente',
        assinaturaCriador: {
          autor: 'construtor',
          nomeSignatario: 'Engenheiro',
          assinadoEm: '2026-10-17T00:00:00.000Z',
        },
      };

      const novaData = somarDiasData(obraInicial.dataPrevista, decisao.impactoPrazoDias!);
      expect(novaData).toBe('2026-12-05');
    });

    it('deve reverter o prazo original caso a proposta seja recusada', () => {
      const decisao: Decisao = {
        id: 'dec-3',
        titulo: 'Prorrogação solicitada',
        descricao: 'Prorrogação de 20 dias',
        impactoPrazoDias: 20,
        criadaPor: 'construtor',
        criadorNome: 'Engenheiro',
        criadaEm: '2026-10-17T00:00:00.000Z',
        status: 'pendente',
        assinaturaCriador: {
          autor: 'construtor',
          nomeSignatario: 'Engenheiro',
          assinadoEm: '2026-10-17T00:00:00.000Z',
        },
      };

      // 1. Proposta é criada -> prazo salta de 15/12 para 04/01
      const dataAposCriacao = somarDiasData(obraInicial.dataPrevista, decisao.impactoPrazoDias!);
      expect(dataAposCriacao).toBe('2027-01-04');

      // 2. Cliente recusa a proposta -> prazo reverte -20 dias
      const dataAposRecusa = somarDiasData(dataAposCriacao, -decisao.impactoPrazoDias!);
      expect(dataAposRecusa).toBe('2026-12-15');
    });
  });
});
