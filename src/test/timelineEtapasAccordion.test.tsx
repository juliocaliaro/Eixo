import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TimelineEtapas } from '../components/TimelineEtapas';
import { Obra } from '../types/obra';
import fs from 'fs';
import path from 'path';

describe('TimelineEtapas - Regra de Etapas Fechadas por Padrão', () => {
  const mockObra: Obra = {
    id: 'obra-teste',
    nome: 'Obra de Teste',
    cliente: 'Cliente Teste',
    endereco: 'Rua dos Testes, 100',
    dataPrevista: '2026-12-31',
    criadaEm: '2026-01-01',
    etapas: [
      {
        id: 'etapa-1',
        nome: 'Revestimentos e Acabamentos',
        concluida: false,
        ambientes: ['Cozinha', 'Sala'],
        tarefas: [
          {
            id: 't-cozinha-1',
            nome: 'Instalar bancada de granito',
            concluida: false,
            ambiente: 'Cozinha',
          },
          {
            id: 't-geral-1',
            nome: 'Proteção geral de pisos',
            concluida: false,
          },
        ],
      },
      {
        id: 'etapa-2',
        nome: 'Pintura e Esquadrias',
        concluida: false,
        ambientes: ['Quarto'],
        tarefas: [
          {
            id: 't-quarto-1',
            nome: 'Pintura de paredes',
            concluida: false,
            ambiente: 'Quarto',
          },
        ],
      },
    ],
  };

  const defaultProps = {
    obra: mockObra,
    onOpenWizard: vi.fn(),
    onToggleTask: vi.fn(),
    onDeleteEtapa: vi.fn(),
    onEditEtapaNome: vi.fn(),
    onReorderEtapas: vi.fn(),
    onDeleteTask: vi.fn(),
    onEditTaskNome: vi.fn(),
    onReorderTasks: vi.fn(),
    onAddTaskToEtapa: vi.fn(),
  };

  it('no carregamento inicial no desktop (e mobile), todas as etapas nascem fechadas e nenhuma tarefa interna é visível', () => {
    const html = renderToStaticMarkup(<TimelineEtapas {...defaultProps} />);

    // Os títulos das etapas estão presentes no cabeçalho
    expect(html).toContain('Revestimentos e Acabamentos');
    expect(html).toContain('Pintura e Esquadrias');

    // Como as etapas nascem fechadas por padrão (openEtapaId === null),
    // nenhuma tarefa interna das etapas é visível no primeiro carregamento
    expect(html).not.toContain('Instalar bancada de granito');
    expect(html).not.toContain('Proteção geral de pisos');
    expect(html).not.toContain('Pintura de paredes');

    // Nenhum container de tarefas internas ou agrupamentos é renderizado com a etapa fechada
    expect(html).not.toContain('task-row');
  });

  it('o código-fonte de TimelineEtapas implementa openEtapaId inicial null e isOpen estritamente openEtapaId === etapa.id', () => {
    const filePath = path.resolve(__dirname, '../components/TimelineEtapas.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Não deve haver nenhum resquício de openAccordions ou setOpenAccordions
    expect(content).not.toContain('openAccordions');
    expect(content).not.toContain('setOpenAccordions');

    // Valida estado openEtapaId iniciando com null (todas etapas nascem fechadas)
    expect(content).toContain('const [openEtapaId, setOpenEtapaId] = useState<string | null>(null);');

    // Valida que isOpen depende estritamente de openEtapaId === etapa.id
    expect(content).toContain('const isOpen = openEtapaId === etapa.id;');

    // Valida toggleAccordion alternando etapaId ou fechando se clicar na mesma (null)
    expect(content).toMatch(/const toggleAccordion = \(etapaId: string\) => \{\s*setOpenEtapaId\(\(prev\) => \(prev === etapaId \? null : etapaId\)\);\s*\};/);

    // Valida que targetTaskNavigation abre a etapa de destino via setOpenEtapaId(etapaId)
    expect(content).toContain('setOpenEtapaId(etapaId);');

    // Valida que na criação de novo agrupamento a etapa é aberta
    expect(content).toMatch(/setOpenEtapaId\(etapa\.id\);\s*setCreatingGroupEtapaId\(etapa\.id\);/);
  });

  it('o código-fonte de TimelineEtapas implementa openAgrupamentos inicial vazio ({}) e isAgrupamentoOpen estritamente Boolean(openAgrupamentos[fullKey])', () => {
    const filePath = path.resolve(__dirname, '../components/TimelineEtapas.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Valida que openAgrupamentos inicia como objeto vazio {} (todos agrupamentos nascem fechados)
    expect(content).toContain('const [openAgrupamentos, setOpenAgrupamentos] = useState<{ [key: string]: boolean }>({});');

    // Valida que isAgrupamentoOpen retorna estritamente Boolean(openAgrupamentos[fullKey])
    expect(content).toMatch(/const isAgrupamentoOpen = \(etapaId: string, groupKey: string\) => \{\s*const fullKey = `\$\{etapaId\}__\$\{groupKey\}`;\s*return Boolean\(openAgrupamentos\[fullKey\]\);\s*\};/);

    // Valida toggleAgrupamento invertendo o estado booleano
    expect(content).toMatch(/const toggleAgrupamento = \(etapaId: string, groupKey: string\) => \{\s*const fullKey = `\$\{etapaId\}__\$\{groupKey\}`;\s*setOpenAgrupamentos\(\(prev\) => \(\{\s*\.\.\.prev,\s*\[fullKey\]: !Boolean\(prev\[fullKey\]\),\s*\}\)\);\s*\};/);

    // Valida reset de etapas e agrupamentos ao trocar obra.id
    expect(content).toMatch(/useEffect\(\(\) => \{\s*setOpenEtapaId\(null\);\s*setOpenAgrupamentos\(\{\}\);\s*\}, \[obra\.id\]\);/);

    // Valida que ao salvar novo agrupamento ele é aberto automaticamente
    expect(content).toContain('[`${creatingGroupEtapaId}__${novoNome}`]: true');
  });

  it('valida que a lógica de isAgrupamentoOpen avalia qualquer agrupamento não registrado em openAgrupamentos como estritamente fechado (false)', () => {
    // Simula a função pura isAgrupamentoOpen extraída do componente
    const openAgrupamentos: { [key: string]: boolean } = {};
    const isAgrupamentoOpen = (etapaId: string, groupKey: string) => {
      const fullKey = `${etapaId}__${groupKey}`;
      return Boolean(openAgrupamentos[fullKey]);
    };

    // No estado inicial vazio, tanto serviços gerais quanto qualquer ambiente retornam false (fechado)
    expect(isAgrupamentoOpen('etapa-1', '__SEM_GRUPO__')).toBe(false);
    expect(isAgrupamentoOpen('etapa-1', 'Cozinha')).toBe(false);
    expect(isAgrupamentoOpen('etapa-1', 'Sala')).toBe(false);
    expect(isAgrupamentoOpen('etapa-2', 'Quarto')).toBe(false);

    // Apenas quando explicitamente marcado como true no dicionário é que retorna true
    openAgrupamentos['etapa-1__Cozinha'] = true;
    expect(isAgrupamentoOpen('etapa-1', 'Cozinha')).toBe(true);
    expect(isAgrupamentoOpen('etapa-1', 'Sala')).toBe(false);
  });
});
