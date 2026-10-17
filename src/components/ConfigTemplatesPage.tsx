import React, { useState, useRef } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePopoverDismiss } from '../hooks/usePopoverDismiss';
import {
  Plus,
  Trash,
  PencilSimple,
  Check,
  X,
  ArrowCounterClockwise,
  CaretDown,
  ArrowUp,
  ArrowDown,
  ListChecks,
  ArrowsDownUp,
} from '@phosphor-icons/react';
import { PresetTipoObra, PresetEtapa, PresetTarefa } from '../types/obra';
import { getEtapaIcon } from '../utils/etapaIcons';
import { ModalConfirm } from './ModalConfirm';
import { PageHeader } from './PageHeader';
import { OverflowMenu, OverflowItem } from './OverflowMenu';
import { EmptyState } from './EmptyState';
import { PRESET_TIPOS_OBRA } from '../data/presetObras';
import '../styles/registros-modelos.css';

interface ConfigTemplatesPageProps {
  templates: PresetTipoObra[];
  onUpdateTemplates: (updated: PresetTipoObra[]) => void;
  onBack: () => void;
  showToast: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export const ConfigTemplatesPage: React.FC<ConfigTemplatesPageProps> = ({
  templates,
  onUpdateTemplates,
  onBack,
  showToast,
}) => {
  const isMobile = useIsMobile();
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    templates.length > 0 ? templates[0].id : ''
  );

  // Etapas abertas (aberta por padrão no desktop; fechada no mobile para reduzir a rolagem)
  const [openAccordions, setOpenAccordions] = useState<{ [etapaId: string]: boolean }>({});

  // Seletor de modelo (mobile)
  const [isSeletorOpen, setIsSeletorOpen] = useState(false);
  const seletorRef = useRef<HTMLDivElement>(null);
  usePopoverDismiss(seletorRef, isSeletorOpen, () => setIsSeletorOpen(false), ['mousedown', 'touchstart']);

  // Edição inline de nome de modelo / etapa / serviço
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tempTemplateNome, setTempTemplateNome] = useState('');
  const [editingEtapaId, setEditingEtapaId] = useState<string | null>(null);
  const [tempEtapaNome, setTempEtapaNome] = useState('');
  const [editingTarefaKey, setEditingTarefaKey] = useState<string | null>(null); // `${etapaId}__${tarefaId}`
  const [tempTarefaNome, setTempTarefaNome] = useState('');

  // Modos de reordenação (setas grandes só enquanto o modo está ativo)
  const [reordenandoEtapas, setReordenandoEtapas] = useState(false);
  const [reordenandoTarefasDe, setReordenandoTarefasDe] = useState<string | null>(null);

  // Novo serviço em digitação (uma etapa por vez)
  const [addingTarefaEtapaId, setAddingTarefaEtapaId] = useState<string | null>(null);
  const [novaTarefaTexto, setNovaTarefaTexto] = useState('');

  // Modais de confirmação e criação
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [novoModeloNome, setNovoModeloNome] = useState('');
  const [novoModeloClonarDe, setNovoModeloClonarDe] = useState<string>('blank');

  const [isAddEtapaOpen, setIsAddEtapaOpen] = useState(false);
  const [novaEtapaNome, setNovaEtapaNome] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'template' | 'etapa';
    templateId?: string;
    etapaId?: string;
    name: string;
  } | null>(null);

  useEscapeKey(() => setIsAddTemplateOpen(false), isAddTemplateOpen);
  useEscapeKey(() => setIsAddEtapaOpen(false), isAddEtapaOpen);

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];

  const isAccordionOpen = (etapaId: string) => {
    const v = openAccordions[etapaId];
    return v === undefined ? !isMobile : v;
  };
  const toggleAccordion = (etapaId: string) =>
    setOpenAccordions((prev) => ({ ...prev, [etapaId]: !isAccordionOpen(etapaId) }));

  const atualizarAtivo = (fn: (t: PresetTipoObra) => PresetTipoObra) => {
    if (!activeTemplate) return;
    onUpdateTemplates(templates.map((t) => (t.id === activeTemplate.id ? fn(t) : t)));
  };

  // --- Handlers de Modelo (Template) ---
  const handleStartEditTemplate = (t: PresetTipoObra) => {
    setEditingTemplateId(t.id);
    setTempTemplateNome(t.nome);
  };

  const handleSaveEditTemplate = () => {
    if (!editingTemplateId) return;
    if (!tempTemplateNome.trim()) {
      showToast('Nome obrigatório', 'O nome do modelo não pode ser vazio.', 'warning');
      return;
    }
    onUpdateTemplates(
      templates.map((t) => (t.id === editingTemplateId ? { ...t, nome: tempTemplateNome.trim() } : t))
    );
    setEditingTemplateId(null);
    showToast('Modelo atualizado', 'O nome do modelo foi alterado.');
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoModeloNome.trim()) {
      showToast('Nome obrigatório', 'Digite o nome do novo modelo.', 'warning');
      return;
    }

    let etapasIniciais: PresetEtapa[] = [];
    if (novoModeloClonarDe !== 'blank') {
      const templateOrigem = templates.find((t) => t.id === novoModeloClonarDe);
      if (templateOrigem) {
        etapasIniciais = templateOrigem.etapas.map((et, eIdx) => ({
          id: `etapa_custom_${Date.now()}_${eIdx}`,
          nome: et.nome,
          tarefas: et.tarefas.map((ta, tIdx) => ({
            id: `tarefa_custom_${Date.now()}_${eIdx}_${tIdx}`,
            nome: ta.nome,
          })),
        }));
      }
    }

    const novoId = `modelo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const novoTemplate: PresetTipoObra = {
      id: novoId,
      nome: novoModeloNome.trim(),
      etapas: etapasIniciais,
    };

    onUpdateTemplates([...templates, novoTemplate]);
    setActiveTemplateId(novoId);
    setIsAddTemplateOpen(false);
    setNovoModeloNome('');
    setNovoModeloClonarDe('blank');
    showToast('Modelo criado', `O modelo "${novoTemplate.nome}" já está disponível.`);
  };

  const handleDeleteTemplate = (id: string) => {
    if (templates.length <= 1) {
      showToast('Operação não permitida', 'Você precisa manter pelo menos um modelo.', 'warning');
      return;
    }
    const updated = templates.filter((t) => t.id !== id);
    onUpdateTemplates(updated);
    if (activeTemplateId === id) {
      setActiveTemplateId(updated[0].id);
    }
    showToast('Modelo removido', 'O modelo foi excluído.');
  };

  // --- Handlers de Etapa ---
  const handleCreateEtapa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaEtapaNome.trim() || !activeTemplate) return;

    const novaEtapa: PresetEtapa = {
      id: `etapa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nome: novaEtapaNome.trim(),
      tarefas: [],
    };

    atualizarAtivo((t) => ({ ...t, etapas: [...t.etapas, novaEtapa] }));
    setIsAddEtapaOpen(false);
    setNovaEtapaNome('');
    showToast('Etapa adicionada', `"${novaEtapa.nome}" foi incluída no modelo.`);
  };

  const handleStartEditEtapa = (etapa: PresetEtapa) => {
    setEditingEtapaId(etapa.id);
    setTempEtapaNome(etapa.nome);
  };

  const handleSaveEditEtapa = (etapaId: string) => {
    if (!tempEtapaNome.trim()) return;
    atualizarAtivo((t) => ({
      ...t,
      etapas: t.etapas.map((e) => (e.id === etapaId ? { ...e, nome: tempEtapaNome.trim() } : e)),
    }));
    setEditingEtapaId(null);
    showToast('Etapa renomeada', 'O nome da etapa foi atualizado.');
  };

  const handleDeleteEtapa = (etapaId: string) => {
    atualizarAtivo((t) => ({ ...t, etapas: t.etapas.filter((e) => e.id !== etapaId) }));
    showToast('Etapa removida', 'A etapa e seus serviços foram excluídos do modelo.');
  };

  const handleMoveEtapa = (index: number, direction: 'up' | 'down') => {
    if (!activeTemplate) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeTemplate.etapas.length) return;

    const novasEtapas = [...activeTemplate.etapas];
    const [removido] = novasEtapas.splice(index, 1);
    novasEtapas.splice(targetIndex, 0, removido);
    atualizarAtivo((t) => ({ ...t, etapas: novasEtapas }));
  };

  // --- Handlers de Serviços ---
  const handleAddTarefa = (etapaId: string) => {
    const texto = novaTarefaTexto.trim();
    if (!texto) return;

    const novaTarefa: PresetTarefa = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nome: texto,
    };

    atualizarAtivo((t) => ({
      ...t,
      etapas: t.etapas.map((e) => (e.id === etapaId ? { ...e, tarefas: [...e.tarefas, novaTarefa] } : e)),
    }));
    setNovaTarefaTexto('');
  };

  const handleStartEditTarefa = (etapaId: string, tarefa: PresetTarefa) => {
    setEditingTarefaKey(`${etapaId}__${tarefa.id}`);
    setTempTarefaNome(tarefa.nome);
  };

  const handleSaveEditTarefa = (etapaId: string, tarefaId: string) => {
    if (!tempTarefaNome.trim()) return;
    atualizarAtivo((t) => ({
      ...t,
      etapas: t.etapas.map((e) =>
        e.id === etapaId
          ? { ...e, tarefas: e.tarefas.map((ta) => (ta.id === tarefaId ? { ...ta, nome: tempTarefaNome.trim() } : ta)) }
          : e
      ),
    }));
    setEditingTarefaKey(null);
  };

  const handleDeleteTarefa = (etapaId: string, tarefaId: string) => {
    atualizarAtivo((t) => ({
      ...t,
      etapas: t.etapas.map((e) => (e.id === etapaId ? { ...e, tarefas: e.tarefas.filter((ta) => ta.id !== tarefaId) } : e)),
    }));
    showToast('Serviço removido', 'O serviço foi excluído da etapa.');
  };

  const handleMoveTarefa = (etapaId: string, index: number, direction: 'up' | 'down') => {
    if (!activeTemplate) return;
    const etapa = activeTemplate.etapas.find((e) => e.id === etapaId);
    if (!etapa) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= etapa.tarefas.length) return;

    const novasTarefas = [...etapa.tarefas];
    const [removido] = novasTarefas.splice(index, 1);
    novasTarefas.splice(targetIndex, 0, removido);
    atualizarAtivo((t) => ({
      ...t,
      etapas: t.etapas.map((e) => (e.id === etapaId ? { ...e, tarefas: novasTarefas } : e)),
    }));
  };

  // --- Reset de Fábrica ---
  const handleResetToDefaults = () => {
    onUpdateTemplates(PRESET_TIPOS_OBRA);
    if (PRESET_TIPOS_OBRA.length > 0) {
      setActiveTemplateId(PRESET_TIPOS_OBRA[0].id);
    }
    setIsResetConfirmOpen(false);
    showToast('Modelos restaurados', 'Construção e Reforma voltaram ao padrão de fábrica.', 'info');
  };

  if (!activeTemplate) {
    return (
      <div className="page rg-page">
        <PageHeader backLabel="Voltar" onBack={onBack} title="Modelos de obra" />
        <EmptyState icon={ListChecks} title="Nenhum modelo criado." />
      </div>
    );
  }

  const totalServicosModelo = activeTemplate.etapas.reduce((acc, e) => acc + e.tarefas.length, 0);

  const menuDoModelo: OverflowItem[] = [
    {
      key: 'renomear',
      label: 'Renomear modelo',
      icon: <PencilSimple size={18} aria-hidden="true" />,
      onSelect: () => handleStartEditTemplate(activeTemplate),
    },
    {
      key: 'reordenar',
      label: 'Reordenar etapas',
      icon: <ArrowsDownUp size={18} aria-hidden="true" />,
      disabled: activeTemplate.etapas.length < 2,
      onSelect: () => {
        setReordenandoTarefasDe(null);
        setReordenandoEtapas(true);
      },
    },
    {
      key: 'restaurar',
      label: 'Restaurar padrões',
      icon: <ArrowCounterClockwise size={18} aria-hidden="true" />,
      onSelect: () => setIsResetConfirmOpen(true),
    },
  ];
  if (templates.length > 1) {
    menuDoModelo.push({
      key: 'excluir',
      label: 'Excluir modelo',
      icon: <Trash size={18} aria-hidden="true" />,
      danger: true,
      onSelect: () => setDeleteTarget({ type: 'template', templateId: activeTemplate.id, name: activeTemplate.nome }),
    });
  }

  const setoresMover = (onUp: () => void, onDown: () => void, first: boolean, last: boolean, nome: string) => (
    <div className="rg-move" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="btn-icon" onClick={onUp} disabled={first} aria-label={`Mover ${nome} para cima`}>
        <ArrowUp size={18} weight="bold" aria-hidden="true" />
      </button>
      <button type="button" className="btn-icon" onClick={onDown} disabled={last} aria-label={`Mover ${nome} para baixo`}>
        <ArrowDown size={18} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div className="page rg-page">
      <PageHeader
        backLabel="Voltar"
        onBack={onBack}
        title={<><span className="rg-title-long">Modelos de obra</span><span className="rg-title-short">Modelos</span></>}
        actions={
          <button type="button" className="btn-primary rg-cta" onClick={() => setIsAddTemplateOpen(true)} aria-label="Novo modelo">
            <Plus size={18} weight="bold" aria-hidden="true" />
            <span>
              Novo<span className="rg-hide-xs"> modelo</span>
            </span>
          </button>
        }
      />

      <p className="rg-help">Etapas e serviços padrão usados ao planejar uma obra.</p>

      <div className="toolbar rg-toolbar">
        <div className="toolbar-lead rg-model-switch" ref={seletorRef}>
          {isMobile ? (
            <>
              <button
                type="button"
                className="rg-select-btn"
                aria-haspopup="listbox"
                aria-expanded={isSeletorOpen}
                onClick={() => setIsSeletorOpen((v) => !v)}
                disabled={templates.length < 2}
              >
                <span className="rg-option-text">{activeTemplate.nome}</span>
                {templates.length > 1 && <CaretDown size={16} weight="bold" aria-hidden="true" />}
              </button>
              {isSeletorOpen && (
                <div className="toolbar-popover rg-popover rg-popover--left" role="listbox">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      role="option"
                      className="option"
                      aria-selected={tpl.id === activeTemplate.id}
                      aria-checked={tpl.id === activeTemplate.id}
                      onClick={() => {
                        setActiveTemplateId(tpl.id);
                        setIsSeletorOpen(false);
                        setReordenandoEtapas(false);
                        setReordenandoTarefasDe(null);
                      }}
                    >
                      <span className="rg-option-text">{tpl.nome}</span>
                      <span className="rg-option-meta">{plural(tpl.etapas.length, 'etapa', 'etapas')}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rg-model-chips" role="tablist" aria-label="Modelos">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  role="tab"
                  aria-selected={tpl.id === activeTemplate.id}
                  className="rg-model-chip"
                  onClick={() => {
                    setActiveTemplateId(tpl.id);
                    setReordenandoEtapas(false);
                    setReordenandoTarefasDe(null);
                  }}
                >
                  {tpl.nome}
                </button>
              ))}
            </div>
          )}
        </div>
        <OverflowMenu items={menuDoModelo} label={`Ações do modelo ${activeTemplate.nome}`} />
      </div>

      {editingTemplateId === activeTemplate.id && (
        <div className="rg-inline-edit">
          <input
            type="text"
            className="form-input"
            value={tempTemplateNome}
            onChange={(e) => setTempTemplateNome(e.target.value)}
            aria-label="Nome do modelo"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEditTemplate();
              if (e.key === 'Escape') {
                e.stopPropagation();
                setEditingTemplateId(null);
              }
            }}
          />
          <button type="button" onClick={handleSaveEditTemplate} className="btn-icon" aria-label="Salvar nome">
            <Check size={18} weight="bold" color="var(--primary-accent)" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setEditingTemplateId(null)} className="btn-icon" aria-label="Cancelar">
            <X size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="section rg-model-body">
        <p className="rg-meta">
          {plural(activeTemplate.etapas.length, 'etapa', 'etapas')} · {plural(totalServicosModelo, 'serviço', 'serviços')}
        </p>

        {reordenandoEtapas && (
          <div className="rg-reorder-bar" role="status">
            <span>Reordenando etapas</span>
            <button type="button" className="btn-quiet" onClick={() => setReordenandoEtapas(false)}>
              Concluir
            </button>
          </div>
        )}

        {activeTemplate.etapas.length === 0 ? (
          <EmptyState icon={ListChecks} className="empty-state--nested" title="Nenhuma etapa neste modelo." />
        ) : (
          <div className="rg-etapas">
            {activeTemplate.etapas.map((etapa, etapaIndex) => {
              const iconCfg = getEtapaIcon(etapa.nome, etapa.id);
              const IconComponent = iconCfg.Icon;
              const isOpen = !reordenandoEtapas && isAccordionOpen(etapa.id);
              const editando = editingEtapaId === etapa.id;
              const reordenandoServicos = reordenandoTarefasDe === etapa.id;

              const menuEtapa: OverflowItem[] = [
                {
                  key: 'renomear',
                  label: 'Renomear',
                  icon: <PencilSimple size={18} aria-hidden="true" />,
                  onSelect: () => handleStartEditEtapa(etapa),
                },
                {
                  key: 'reordenar',
                  label: 'Reordenar serviços',
                  icon: <ArrowsDownUp size={18} aria-hidden="true" />,
                  disabled: etapa.tarefas.length < 2,
                  onSelect: () => {
                    setOpenAccordions((prev) => ({ ...prev, [etapa.id]: true }));
                    setReordenandoTarefasDe(etapa.id);
                  },
                },
                {
                  key: 'excluir',
                  label: 'Excluir etapa',
                  icon: <Trash size={18} aria-hidden="true" />,
                  danger: true,
                  onSelect: () => setDeleteTarget({ type: 'etapa', etapaId: etapa.id, name: etapa.nome }),
                },
              ];

              return (
                <div key={etapa.id} className="rg-etapa">
                  <div
                    role={reordenandoEtapas || editando ? undefined : 'button'}
                    tabIndex={reordenandoEtapas || editando ? undefined : 0}
                    aria-expanded={reordenandoEtapas || editando ? undefined : isOpen}
                    className={`rg-etapa-head${reordenandoEtapas || editando ? '' : ' rg-etapa-head--toggle'}`}
                    onClick={() => {
                      if (!reordenandoEtapas && !editando) toggleAccordion(etapa.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleAccordion(etapa.id);
                      }
                    }}
                  >
                    <span className="rg-etapa-icon" style={{ background: iconCfg.bg, color: iconCfg.color }}>
                      <IconComponent size={18} weight="fill" aria-hidden="true" />
                    </span>

                    <div className="rg-etapa-main">
                      {editando ? (
                        <div className="rg-inline-edit" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            className="form-input"
                            value={tempEtapaNome}
                            onChange={(e) => setTempEtapaNome(e.target.value)}
                            aria-label="Nome da etapa"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditEtapa(etapa.id);
                              if (e.key === 'Escape') {
                                e.stopPropagation();
                                setEditingEtapaId(null);
                              }
                            }}
                          />
                          <button type="button" onClick={() => handleSaveEditEtapa(etapa.id)} className="btn-icon" aria-label="Salvar nome">
                            <Check size={18} weight="bold" color="var(--primary-accent)" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => setEditingEtapaId(null)} className="btn-icon" aria-label="Cancelar">
                            <X size={18} weight="bold" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="rg-etapa-title">
                            {etapaIndex + 1}. {etapa.nome}
                          </div>
                          <div className="list-row-sub">{plural(etapa.tarefas.length, 'serviço', 'serviços')}</div>
                        </>
                      )}
                    </div>

                    {!editando &&
                      (reordenandoEtapas ? (
                        setoresMover(
                          () => handleMoveEtapa(etapaIndex, 'up'),
                          () => handleMoveEtapa(etapaIndex, 'down'),
                          etapaIndex === 0,
                          etapaIndex === activeTemplate.etapas.length - 1,
                          etapa.nome
                        )
                      ) : (
                        <>
                          <OverflowMenu items={menuEtapa} label={`Ações da etapa ${etapa.nome}`} />
                          <CaretDown size={18} weight="bold" className={`rg-caret${isOpen ? ' is-open' : ''}`} aria-hidden="true" />
                        </>
                      ))}
                  </div>

                  {isOpen && (
                    <div className="rg-svc-list">
                      {reordenandoServicos && (
                        <div className="rg-reorder-bar" role="status">
                          <span>Reordenando serviços</span>
                          <button type="button" className="btn-quiet" onClick={() => setReordenandoTarefasDe(null)}>
                            Concluir
                          </button>
                        </div>
                      )}

                      {etapa.tarefas.length === 0 && addingTarefaEtapaId !== etapa.id && (
                        <EmptyState icon={ListChecks} className="empty-state--nested" title="Nenhum serviço nesta etapa." />
                      )}

                      {etapa.tarefas.map((tarefa, tIndex) => {
                        const isEditing = editingTarefaKey === `${etapa.id}__${tarefa.id}`;
                        return (
                          <div key={tarefa.id} className="rg-svc">
                            {isEditing ? (
                              <div className="rg-inline-edit">
                                <input
                                  type="text"
                                  className="form-input"
                                  value={tempTarefaNome}
                                  onChange={(e) => setTempTarefaNome(e.target.value)}
                                  aria-label="Nome do serviço"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditTarefa(etapa.id, tarefa.id);
                                    if (e.key === 'Escape') {
                                      e.stopPropagation();
                                      setEditingTarefaKey(null);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditTarefa(etapa.id, tarefa.id)}
                                  className="btn-icon"
                                  aria-label="Salvar serviço"
                                >
                                  <Check size={18} weight="bold" color="var(--primary-accent)" aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => setEditingTarefaKey(null)} className="btn-icon" aria-label="Cancelar">
                                  <X size={18} weight="bold" aria-hidden="true" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="rg-svc-name">{tarefa.nome}</span>
                                {reordenandoServicos ? (
                                  setoresMover(
                                    () => handleMoveTarefa(etapa.id, tIndex, 'up'),
                                    () => handleMoveTarefa(etapa.id, tIndex, 'down'),
                                    tIndex === 0,
                                    tIndex === etapa.tarefas.length - 1,
                                    tarefa.nome
                                  )
                                ) : (
                                  <OverflowMenu
                                    label={`Ações do serviço ${tarefa.nome}`}
                                    items={[
                                      {
                                        key: 'editar',
                                        label: 'Editar',
                                        icon: <PencilSimple size={18} aria-hidden="true" />,
                                        onSelect: () => handleStartEditTarefa(etapa.id, tarefa),
                                      },
                                      {
                                        key: 'excluir',
                                        label: 'Excluir',
                                        icon: <Trash size={18} aria-hidden="true" />,
                                        danger: true,
                                        onSelect: () => handleDeleteTarefa(etapa.id, tarefa.id),
                                      },
                                    ]}
                                  />
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}

                      {!reordenandoServicos &&
                        (addingTarefaEtapaId === etapa.id ? (
                          <div className="rg-inline-edit">
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Nome do serviço"
                              value={novaTarefaTexto}
                              onChange={(e) => setNovaTarefaTexto(e.target.value)}
                              aria-label="Novo serviço"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddTarefa(etapa.id);
                                }
                                if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  setAddingTarefaEtapaId(null);
                                  setNovaTarefaTexto('');
                                }
                              }}
                            />
                            <button type="button" onClick={() => handleAddTarefa(etapa.id)} className="btn-icon" aria-label="Adicionar serviço">
                              <Check size={18} weight="bold" color="var(--primary-accent)" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingTarefaEtapaId(null);
                                setNovaTarefaTexto('');
                              }}
                              className="btn-icon"
                              aria-label="Cancelar"
                            >
                              <X size={18} weight="bold" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-quiet rg-add-link"
                            onClick={() => {
                              setAddingTarefaEtapaId(etapa.id);
                              setNovaTarefaTexto('');
                            }}
                          >
                            <Plus size={16} weight="bold" aria-hidden="true" />
                            <span>Adicionar serviço</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!reordenandoEtapas && (
          <button type="button" className="btn-quiet rg-add-link" onClick={() => setIsAddEtapaOpen(true)}>
            <Plus size={16} weight="bold" aria-hidden="true" />
            <span>Adicionar etapa</span>
          </button>
        )}
      </section>

      {/* Modal: Novo modelo */}
      {isAddTemplateOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddTemplateOpen(false)}>
          <div className="modal-card rg-sheet" role="dialog" aria-modal="true" aria-labelledby="novo-modelo-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" id="novo-modelo-title">
                Novo modelo
              </h2>
              <button type="button" onClick={() => setIsAddTemplateOpen(false)} className="btn-icon" aria-label="Fechar">
                <X size={18} weight="bold" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate}>
              <div className="modal-body rg-sheet-body">
                <div className="rg-field">
                  <label className="form-label" htmlFor="novo-modelo-nome">
                    Nome
                  </label>
                  <input
                    id="novo-modelo-nome"
                    type="text"
                    className="form-input"
                    placeholder="Ex.: Reforma comercial"
                    value={novoModeloNome}
                    onChange={(e) => setNovoModeloNome(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="rg-field">
                  <label className="form-label" htmlFor="novo-modelo-base">
                    Começar com
                  </label>
                  <select
                    id="novo-modelo-base"
                    className="form-input"
                    value={novoModeloClonarDe}
                    onChange={(e) => setNovoModeloClonarDe(e.target.value)}
                  >
                    <option value="blank">Modelo em branco</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        Cópia de {tpl.nome} ({plural(tpl.etapas.length, 'etapa', 'etapas')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddTemplateOpen(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Criar modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova etapa */}
      {isAddEtapaOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddEtapaOpen(false)}>
          <div className="modal-card rg-sheet" role="dialog" aria-modal="true" aria-labelledby="nova-etapa-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" id="nova-etapa-title">
                Nova etapa
              </h2>
              <button type="button" onClick={() => setIsAddEtapaOpen(false)} className="btn-icon" aria-label="Fechar">
                <X size={18} weight="bold" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateEtapa}>
              <div className="modal-body rg-sheet-body">
                <div className="rg-field">
                  <label className="form-label" htmlFor="nova-etapa-nome">
                    Nome da etapa
                  </label>
                  <input
                    id="nova-etapa-nome"
                    type="text"
                    className="form-input"
                    placeholder="Ex.: Marcenaria e vidraçaria"
                    value={novaEtapaNome}
                    onChange={(e) => setNovaEtapaNome(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddEtapaOpen(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Incluir etapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ModalConfirm
          isOpen={true}
          title={deleteTarget.type === 'template' ? 'Excluir modelo' : 'Excluir etapa'}
          message={`Tem certeza que deseja excluir "${deleteTarget.name}"? Todos os serviços vinculados serão removidos.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            if (deleteTarget.type === 'template' && deleteTarget.templateId) {
              handleDeleteTemplate(deleteTarget.templateId);
            } else if (deleteTarget.type === 'etapa' && deleteTarget.etapaId) {
              handleDeleteEtapa(deleteTarget.etapaId);
            }
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {isResetConfirmOpen && (
        <ModalConfirm
          isOpen={true}
          title="Restaurar modelos de fábrica"
          message="Tem certeza que deseja restaurar as etapas e serviços para os modelos originais (Construção e Reforma)? Todas as customizações feitas nos modelos serão redefinidas."
          confirmText="Restaurar padrões"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={handleResetToDefaults}
          onCancel={() => setIsResetConfirmOpen(false)}
        />
      )}
    </div>
  );
};
