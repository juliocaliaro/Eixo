import React, { useState, useEffect } from 'react';
import { prefersReducedMotion } from '../utils/motion';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  CaretDown,
  Plus,
  Trash,
  PencilSimple,
  CheckCircle,
  Camera,
  NotePencil,
  ListChecks,
  DotsSixVertical,
  Eye,
  Check,
  HouseLine,
  SquaresFour,
  DotsThreeVertical,
  ArrowLineDown,
} from '@phosphor-icons/react';
import { Obra, Tarefa } from '../types/obra';
import { ModalEditItem } from './ModalEditItem';
import { ModalEditTask } from './ModalEditTask';
import { ModalMoveTask } from './ModalMoveTask';
import { ModalConfirm } from './ModalConfirm';
import { ModalTaskDetails } from './ModalTaskDetails';
import { ModalCreateTask } from './ModalCreateTask';
import { getEtapaIcon } from '../utils/etapaIcons';
import { progressoDeEtapa } from '../utils/obraMetrics';
import { isTarefaConcluida } from '../utils/cronogramaStatus';
import { formatarDataHoraBR, formatarDataIsoBR } from '../utils/data';
import { OverflowMenu } from './OverflowMenu';
import { EmptyState } from './EmptyState';

interface TimelineEtapasProps {
  obra: Obra;
  onOpenWizard: (insertIndex?: number | null) => void;
  onToggleTask: (etapaId: string, tarefaId: string) => void;
  onDeleteEtapa: (etapaId: string) => void;
  onEditEtapaNome: (etapaId: string, novoNome: string) => void;
  onReorderEtapas: (draggedIndex: number, targetIndex: number) => void;
  onDeleteTask: (etapaId: string, tarefaId: string) => void;
  onEditTaskNome: (etapaId: string, tarefaId: string, novoNome: string) => void;
  onEditTask?: (etapaId: string, tarefaId: string, novoNome: string, novoAmbiente?: string) => void;
  onReorderTasks: (etapaId: string, draggedIndex: number, targetIndex: number) => void;
  onAddTaskToEtapa: (etapaId: string, taskNome: string, insertAtIndex?: number, ambiente?: string) => void;
  onCreateAgrupamento?: (etapaId: string, nomeAgrupamento: string) => void;
  onRenameAgrupamento?: (etapaId: string, nomeAntigo: string, novoNome: string) => void;
  onDeleteAgrupamento?: (etapaId: string, nomeAgrupamento: string) => void;
  onMoveTaskAgrupamento?: (etapaId: string, tarefaId: string, novoAmbiente?: string) => void;
  onUpdateTaskMedia?: (etapaId: string, tarefaId: string, fotos: string[], anotacoes: string[]) => void;
  isReadOnly?: boolean;
  targetTaskNavigation?: { etapaId: string; tarefaId: string; timestamp: number } | null;
}

export const TimelineEtapas: React.FC<TimelineEtapasProps> = ({
  obra,
  onOpenWizard,
  onToggleTask,
  onDeleteEtapa,
  onEditEtapaNome,
  onReorderEtapas,
  onDeleteTask,
  onEditTaskNome,
  onEditTask,
  onReorderTasks,
  onAddTaskToEtapa,
  onCreateAgrupamento,
  onRenameAgrupamento,
  onDeleteAgrupamento,
  onMoveTaskAgrupamento,
  onUpdateTaskMedia,
  isReadOnly = false,
  targetTaskNavigation,
}) => {
  const isMobile = useIsMobile();

  // Vazio = padrão responsivo: no mobile as etapas iniciam recolhidas; no desktop, abertas.
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({});

  const [editingEtapa, setEditingEtapa] = useState<{ id: string; nome: string } | null>(null);
  const [addingTaskEtapa, setAddingTaskEtapa] = useState<{
    etapaId: string;
    etapaNome: string;
    defaultAmbiente?: string;
    ambientes: string[];
  } | null>(null);

  const [editingTask, setEditingTask] = useState<{
    etapaId: string;
    id: string;
    nome: string;
    ambiente?: string;
  } | null>(null);

  // Estados de Agrupamento por Ambiente
  const [openAgrupamentos, setOpenAgrupamentos] = useState<{ [key: string]: boolean }>({});
  const [movingTaskTarget, setMovingTaskTarget] = useState<{
    etapaId: string;
    tarefa: Tarefa;
  } | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<{ etapaId: string; ambiente?: string } | null>(null);
  const [creatingGroupEtapaId, setCreatingGroupEtapaId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ etapaId: string; oldName: string; currentName: string } | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<{ etapaId: string; nome: string; count: number } | null>(null);

  // Estado para Modal de Detalhes da Tarefa (Fotos e Anotações)
  const [viewingTaskDetails, setViewingTaskDetails] = useState<{
    tarefa: Tarefa;
    etapaNome: string;
    etapaId: string;
  } | null>(null);

  const handleUpdateTaskMediaInternal = (
    targetEtapaId: string,
    targetTaskId: string,
    fotos: string[],
    anotacoes: string[]
  ) => {
    if (onUpdateTaskMedia) {
      onUpdateTaskMedia(targetEtapaId, targetTaskId, fotos, anotacoes);
    }
    setViewingTaskDetails((prev) => {
      if (!prev || prev.tarefa.id !== targetTaskId) return prev;
      return {
        ...prev,
        tarefa: {
          ...prev.tarefa,
          fotos,
          anotacoes,
        },
      };
    });
  };

  // Efeito para navegar e dar foco em uma tarefa específica (ex: vinda da aba Anexos)
  useEffect(() => {
    if (!targetTaskNavigation) return;
    const { etapaId, tarefaId } = targetTaskNavigation;

    // 1. Garante que o accordion da etapa está aberto
    setOpenAccordions((prev) => ({
      ...prev,
      [etapaId]: true,
    }));

    // 2. Localiza etapa e tarefa para abrir o modal de detalhes
    const etapa = obra.etapas.find((e) => e.id === etapaId);
    const tarefa = etapa?.tarefas.find((t) => t.id === tarefaId);

    // 3. Scroll suave, destaque visual da linha e abertura do modal
    const timer = setTimeout(() => {
      const el = document.getElementById(`task-row-${tarefaId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('task-highlight-pulse');
        setTimeout(() => {
          el.classList.remove('task-highlight-pulse');
        }, 2600);
      }

      if (tarefa && etapa) {
        setViewingTaskDetails({
          tarefa,
          etapaNome: etapa.nome,
          etapaId: etapa.id,
        });
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [targetTaskNavigation]);

  // Estados de confirmação (substitutos de alert/confirm)
  const [deleteEtapaTarget, setDeleteEtapaTarget] = useState<{ id: string; nome: string } | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<{ etapaId: string; id: string; nome: string } | null>(null);

  // Estados de Drag & Drop para Etapas
  const [draggedEtapaIndex, setDraggedEtapaIndex] = useState<number | null>(null);
  const [dragOverEtapaIndex, setDragOverEtapaIndex] = useState<number | null>(null);

  // Estados de Drag & Drop para Tarefas
  const [draggedTask, setDraggedTask] = useState<{ etapaId: string; index: number } | null>(null);
  const [dragOverTask, setDragOverTask] = useState<{ etapaId: string; index: number } | null>(null);

  const formatarDataHora = formatarDataHoraBR;

  const toggleAccordion = (etapaId: string) => {
    setOpenAccordions((prev) => {
      const current = prev[etapaId] ?? (!isMobile);
      return {
        ...prev,
        [etapaId]: !current,
      };
    });
  };

  // Drag handlers de Etapa
  const handleEtapaDragStart = (e: React.DragEvent, index: number) => {
    setDraggedEtapaIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleEtapaDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedEtapaIndex === null || draggedEtapaIndex === index) return;
    setDragOverEtapaIndex(index);
  };

  const handleEtapaDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedEtapaIndex !== null && draggedEtapaIndex !== targetIndex) {
      onReorderEtapas(draggedEtapaIndex, targetIndex);
    }
    setDraggedEtapaIndex(null);
    setDragOverEtapaIndex(null);
  };

  // Accordion de Agrupamento por Ambiente (padrao: aberto)
  const isAgrupamentoOpen = (etapaId: string, groupKey: string) => {
    const fullKey = `${etapaId}__${groupKey}`;
    return openAgrupamentos[fullKey] !== false;
  };

  const toggleAgrupamento = (etapaId: string, groupKey: string) => {
    const fullKey = `${etapaId}__${groupKey}`;
    setOpenAgrupamentos((prev) => ({
      ...prev,
      [fullKey]: prev[fullKey] === false ? true : false,
    }));
  };

  // Limpeza global de drag
  const handleTaskDragEnd = () => {
    setDraggedTask(null);
    setDragOverTask(null);
    setDragOverGroup(null);
    setDraggedEtapaIndex(null);
    setDragOverEtapaIndex(null);
  };

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggedTask(null);
      setDragOverTask(null);
      setDragOverGroup(null);
      setDraggedEtapaIndex(null);
      setDragOverEtapaIndex(null);
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('mouseup', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('mouseup', handleGlobalDragEnd);
    };
  }, []);

  // Drag handlers de Tarefa
  const handleTaskDragStart = (e: React.DragEvent, etapaId: string, index: number) => {
    e.stopPropagation();
    setDraggedTask({ etapaId, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTaskDragOver = (e: React.DragEvent, etapaId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTask || draggedTask.etapaId !== etapaId || draggedTask.index === index) return;
    setDragOverTask({ etapaId, index });
  };

  const handleTaskDrop = (e: React.DragEvent, etapaId: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTask && draggedTask.etapaId === etapaId) {
      const currentEtapa = obra.etapas.find((ep) => ep.id === etapaId);
      if (currentEtapa) {
        const draggedTarefa = currentEtapa.tarefas[draggedTask.index];
        const targetTarefa = currentEtapa.tarefas[targetIndex];

        if (draggedTarefa && targetTarefa && draggedTarefa.ambiente !== targetTarefa.ambiente) {
          if (onMoveTaskAgrupamento) {
            onMoveTaskAgrupamento(etapaId, draggedTarefa.id, targetTarefa.ambiente);
          }
        }
        if (draggedTask.index !== targetIndex) {
          onReorderTasks(etapaId, draggedTask.index, targetIndex);
        }
      }
    }
    handleTaskDragEnd();
  };

  const handleGroupDrop = (e: React.DragEvent, etapaId: string, ambienteNome?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTask && draggedTask.etapaId === etapaId) {
      const currentEtapa = obra.etapas.find((ep) => ep.id === etapaId);
      const draggedTarefa = currentEtapa?.tarefas[draggedTask.index];
      if (draggedTarefa && draggedTarefa.ambiente !== ambienteNome) {
        if (onMoveTaskAgrupamento) {
          onMoveTaskAgrupamento(etapaId, draggedTarefa.id, ambienteNome);
        }
      }
    }
    handleTaskDragEnd();
  };

  const cabecalhoAba = (
    <div className="tab-head">
      <h2 className="tab-title">{isMobile ? 'Cronograma' : 'Cronograma Físico'}</h2>
      {!isReadOnly && (
        <button onClick={() => onOpenWizard(null)} className="btn-primary tab-cta">
          <Plus size={16} weight="bold" />
          <span>Nova etapa</span>
        </button>
      )}
    </div>
  );

  // A ação "Nova etapa" já está no cabeçalho da aba: o estado vazio não repete o botão
  if (obra.etapas.length === 0) {
    return (
      <div className="timeline-section">
        {cabecalhoAba}
        <EmptyState icon={ListChecks} title={isReadOnly ? 'Ainda não há etapas nesta obra.' : 'Nenhuma etapa criada.'} />
      </div>
    );
  }

  return (
    <div className="timeline-section">
      {cabecalhoAba}

      {/* Linha do Tempo Vertical Contínua */}
      <div className="vertical-timeline-container">
        {/* Trilho Vertical (Linha da Linha do Tempo) */}
        <div className="timeline-spine-line" />

        <div className="timeline-items-flow">
          {obra.etapas.map((etapa, etapaIndex) => {
            const isOpen = openAccordions[etapa.id] ?? (!isMobile);
            const totalTarefas = etapa.tarefas.length;

            const { concluidas, percentual: percEtapa, concluida: todasConcluidas } = progressoDeEtapa(etapa);
            const etapaIconCfg = getEtapaIcon(etapa.nome, etapa.id);
            const EtapaIcon = etapaIconCfg.Icon;
            const isDragging = draggedEtapaIndex === etapaIndex;
            const isDragOver = dragOverEtapaIndex === etapaIndex;

            return (
              <div
                key={etapa.id}
                className={`timeline-entry-row ${isDragOver ? 'drag-target-highlight' : ''}`}
                onDragOver={(e) => !isReadOnly && handleEtapaDragOver(e, etapaIndex)}
                onDrop={(e) => !isReadOnly && handleEtapaDrop(e, etapaIndex)}
                style={{ opacity: isDragging ? 0.4 : 1 }}
              >
                {/* Nó da Timeline na Linha Vertical */}
                <div className={`timeline-spine-node ${todasConcluidas ? 'completed' : ''}`}>
                  {todasConcluidas ? (
                    <CheckCircle size={18} weight="bold" />
                  ) : (
                    <span>{etapaIndex + 1}</span>
                  )}
                </div>

                {/* Conteúdo da Etapa */}
                <div className="timeline-entry-content">
                  <div className={`timeline-item ${todasConcluidas ? 'all-done' : ''}`}>
                    {/* Header da Etapa */}
                    <div
                      className="timeline-item-header"
                      role="button"
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onClick={() => toggleAccordion(etapa.id)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleAccordion(etapa.id);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        {/* Drag Handle da Etapa */}
                        {!isReadOnly && (
                          <div
                            draggable
                            onDragStart={(e) => handleEtapaDragStart(e, etapaIndex)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="drag-handle-grip etapa-header-handle"
                            title="Arrastar para reordenar etapa"
                          >
                            <DotsSixVertical size={18} weight="bold" />
                          </div>
                        )}

                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-sm)',
                            background: etapaIconCfg.bg,
                            color: etapaIconCfg.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <EtapaIcon size={17} weight="bold" />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="timeline-title etapa-title-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {etapa.nome}
                            </span>
                            {etapa.tipoOrigem && (
                              <span className="timeline-badge">{etapa.tipoOrigem}</span>
                            )}
                          </div>
                          <div className="etapa-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {todasConcluidas ? (
                              <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Check size={14} weight="bold" />
                                <span>Concluída {etapa.concluidaEm ? `em ${isMobile ? formatarDataIsoBR(etapa.concluidaEm) : formatarDataHora(etapa.concluidaEm)}` : '100%'}</span>
                              </span>
                            ) : (
                              <span>{concluidas} de {totalTarefas} serviços ({percEtapa}%)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações da Etapa */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {!isReadOnly && (
                          <div
                            className="etapa-header-actions"
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setEditingEtapa({ id: etapa.id, nome: etapa.nome })}
                              className="btn-icon"
                              title="Editar nome"
                            >
                              <PencilSimple size={14} weight="bold" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteEtapaTarget({ id: etapa.id, nome: etapa.nome })}
                              className="btn-icon"
                              style={{ color: 'var(--coral-glow-600)' }}
                              title="Excluir etapa"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        )}

                        {!isReadOnly && (
                          <div className="etapa-menu-mobile">
                            <OverflowMenu
                              label={`Opções da etapa ${etapa.nome}`}
                              items={[
                                {
                                  key: 'editar',
                                  label: 'Editar nome da etapa',
                                  icon: <PencilSimple size={18} weight="bold" />,
                                  onSelect: () => setEditingEtapa({ id: etapa.id, nome: etapa.nome }),
                                },
                                {
                                  key: 'novo-agrupamento',
                                  label: 'Novo agrupamento por ambiente',
                                  icon: <SquaresFour size={18} weight="bold" />,
                                  onSelect: () => {
                                    setOpenAccordions((prev) => ({ ...prev, [etapa.id]: true }));
                                    setCreatingGroupEtapaId(etapa.id);
                                  },
                                },
                                {
                                  key: 'inserir-depois',
                                  label: 'Inserir etapa depois desta',
                                  icon: <ArrowLineDown size={18} weight="bold" />,
                                  hidden: etapaIndex >= obra.etapas.length - 1,
                                  onSelect: () => onOpenWizard(etapaIndex + 1),
                                },
                                {
                                  key: 'excluir',
                                  label: 'Excluir etapa',
                                  icon: <Trash size={18} weight="bold" />,
                                  danger: true,
                                  onSelect: () => setDeleteEtapaTarget({ id: etapa.id, nome: etapa.nome }),
                                },
                              ]}
                            />
                          </div>
                        )}

                        <div
                          className={`accordion-caret-box ${isOpen ? 'is-open' : ''}`}
                          style={{
                            color: 'var(--text-muted)',
                            marginLeft: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            cursor: 'pointer',
                          }}
                        >
                          <CaretDown size={17} weight="bold" className="accordion-caret-icon" />
                        </div>
                      </div>
                    </div>

                    {/* Bloco de Tarefas / Checklist */}
                    {isOpen && (() => {
                      const etapaAmbientes = Array.from(new Set([
                        ...(etapa.ambientes || []),
                        ...etapa.tarefas.map((t) => t.ambiente).filter((a): a is string => Boolean(a && a.trim()))
                      ]));
                      const hasAgrupamentos = etapaAmbientes.length > 0;

                      // Função para renderizar a linha individual da tarefa
                      const renderTaskRow = (tarefa: Tarefa, globalTaskIndex: number) => {
                        const temAnexos = (tarefa.fotos && tarefa.fotos.length > 0) || (tarefa.anotacoes && tarefa.anotacoes.length > 0);
                        const isTaskOver = dragOverTask?.etapaId === etapa.id && dragOverTask?.index === globalTaskIndex;
                        const isTaskDragging = draggedTask?.etapaId === etapa.id && draggedTask?.index === globalTaskIndex;
                        const openDetails = () => setViewingTaskDetails({ tarefa, etapaNome: etapa.nome, etapaId: etapa.id });

                        return (
                          <div
                            key={tarefa.id}
                            id={`task-row-${tarefa.id}`}
                            className={`task-row ${tarefa.concluida ? 'is-done' : ''} ${isTaskOver ? 'drag-target-highlight' : ''}`}
                            onClick={isMobile ? openDetails : undefined}
                            onDragOver={(e) => handleTaskDragOver(e, etapa.id, globalTaskIndex)}
                            onDrop={(e) => handleTaskDrop(e, etapa.id, globalTaskIndex)}
                            onDragEnd={handleTaskDragEnd}
                            style={{
                              opacity: isTaskDragging ? 0.35 : 1,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                              {/* Drag Handle da Tarefa (apenas Construtor) */}
                              {!isReadOnly && (
                                <div
                                  draggable
                                  onDragStart={(e) => handleTaskDragStart(e, etapa.id, globalTaskIndex)}
                                  onDragEnd={handleTaskDragEnd}
                                  className="drag-handle-grip"
                                  style={{ padding: 2 }}
                                  title="Arrastar para reordenar serviço ou soltar sobre um agrupamento"
                                >
                                  <DotsSixVertical size={15} />
                                </div>
                              )}

                              <input
                                type="checkbox"
                                className="task-checkbox"
                                checked={tarefa.concluida}
                                disabled={isReadOnly}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => {
                                  if (isReadOnly) return;
                                  onToggleTask(etapa.id, tarefa.id);
                                  if (!tarefa.concluida && !prefersReducedMotion()) {
                                    import('canvas-confetti')
                                      .then((confettiModule) => {
                                        const fire = confettiModule.default || confettiModule;
                                        fire({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
                                      })
                                      .catch(() => {});
                                  }
                                }}
                                title={isReadOnly ? 'Status gerenciado pelo construtor (somente leitura)' : tarefa.concluida ? 'Desmarcar' : 'Concluir'}
                                style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
                              />

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span className={`task-label ${tarefa.concluida ? 'strikethrough' : ''}`}>
                                  {tarefa.nome}
                                </span>

                                {temAnexos && (
                                  <div className="task-media-pills-row">
                                    {tarefa.fotos && tarefa.fotos.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingTaskDetails({ tarefa, etapaNome: etapa.nome, etapaId: etapa.id });
                                        }}
                                        className="task-media-pill foto"
                                        title="Ver fotos do serviço"
                                      >
                                        <div className="task-thumb-mini-group">
                                          {tarefa.fotos.slice(0, 3).map((f, i) => (
                                            <img key={i} src={f} alt="" className="task-thumb-mini" />
                                          ))}
                                        </div>
                                        <Camera size={12} weight="bold" />
                                        <span>{tarefa.fotos.length} foto{tarefa.fotos.length > 1 ? 's' : ''}</span>
                                      </button>
                                    )}
                                    {tarefa.anotacoes && tarefa.anotacoes.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingTaskDetails({ tarefa, etapaNome: etapa.nome, etapaId: etapa.id });
                                        }}
                                        className="task-media-pill nota"
                                        title={`Ver observação: "${tarefa.anotacoes[0].slice(0, 45)}..."`}
                                      >
                                        <NotePencil size={12} weight="bold" />
                                        <span>{tarefa.anotacoes.length} nota{tarefa.anotacoes.length > 1 ? 's' : ''}</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Ações da Tarefa no Desktop (arrastar substitui mover) */}
                            <div className="desktop-task-actions" style={{ alignItems: 'center', gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => setViewingTaskDetails({ tarefa, etapaNome: etapa.nome, etapaId: etapa.id })}
                                className="btn-icon"
                                style={{
                                  width: 26,
                                  height: 26,
                                  color: temAnexos ? 'var(--primary-accent)' : 'var(--text-muted)',
                                  background: temAnexos ? 'var(--coral-glow-50)' : undefined,
                                }}
                                title={temAnexos ? "Ver fotos e anotações deste serviço" : "Ver detalhes do serviço"}
                              >
                                <Eye size={13} weight={temAnexos ? "bold" : "regular"} />
                              </button>

                              {!isReadOnly && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingTask({
                                        etapaId: etapa.id,
                                        id: tarefa.id,
                                        nome: tarefa.nome,
                                        ambiente: tarefa.ambiente,
                                      })
                                    }
                                    className="btn-icon"
                                    style={{ width: 26, height: 26 }}
                                    title="Editar"
                                  >
                                    <PencilSimple size={12} weight="bold" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDeleteTaskTarget({ etapaId: etapa.id, id: tarefa.id, nome: tarefa.nome })}
                                    className="btn-icon"
                                    style={{ width: 26, height: 26, color: 'var(--coral-glow-600)' }}
                                    title="Excluir"
                                  >
                                    <Trash size={12} />
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Ações da Tarefa no Mobile: só para o construtor (a linha toda abre os detalhes) */}
                            {!isReadOnly && (
                              <div className="mobile-task-actions">
                                <OverflowMenu
                                  label={`Opções do serviço ${tarefa.nome}`}
                                  items={[
                                    {
                                      key: 'mover',
                                      label: 'Mover de ambiente',
                                      icon: <HouseLine size={18} weight="bold" />,
                                      hidden: !hasAgrupamentos,
                                      onSelect: () => setMovingTaskTarget({ etapaId: etapa.id, tarefa }),
                                    },
                                    {
                                      key: 'editar',
                                      label: 'Editar serviço',
                                      icon: <PencilSimple size={18} weight="bold" />,
                                      onSelect: () =>
                                        setEditingTask({ etapaId: etapa.id, id: tarefa.id, nome: tarefa.nome, ambiente: tarefa.ambiente }),
                                    },
                                    {
                                      key: 'excluir',
                                      label: 'Excluir serviço',
                                      icon: <Trash size={18} weight="bold" />,
                                      danger: true,
                                      onSelect: () => setDeleteTaskTarget({ etapaId: etapa.id, id: tarefa.id, nome: tarefa.nome }),
                                    },
                                  ]}
                                />
                              </div>
                            )}
                          </div>
                        );
                      };

                      return (
                        <div className="tasks-block">
                          {/* Barra discreta de Agrupamentos por Ambiente */}
                          {(!isReadOnly || hasAgrupamentos) && (
                            <div className="agrupamento-toolbar">
                              <div className="agrupamento-toolbar-title">
                                <SquaresFour size={14} weight="bold" style={{ color: 'var(--primary-accent)' }} />
                                <span>Agrupamentos por Ambiente</span>
                                {hasAgrupamentos && (
                                  <span className="agrupamento-badge-count">{etapaAmbientes.length}</span>
                                )}
                              </div>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => setCreatingGroupEtapaId(etapa.id)}
                                  className="btn-ghost"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '3px 8px',
                                    height: 26,
                                    gap: 4,
                                    color: 'var(--primary-accent)',
                                    fontWeight: 600,
                                  }}
                                  title="Criar novo agrupamento nesta etapa (Ex: Cozinha, Sala, Quarto, Banheiro...)"
                                >
                                  <Plus size={12} weight="bold" />
                                  <span>Novo Agrupamento</span>
                                </button>
                              )}
                            </div>
                          )}

                          {etapa.tarefas.length === 0 ? (
                            <EmptyState icon={ListChecks} className="empty-state--nested" title="Nenhum serviço nesta etapa." hint={isReadOnly ? undefined : 'Digite no campo abaixo para incluir.'} />
                          ) : !hasAgrupamentos ? (
                            /* Modo sem agrupamentos: visual idêntico ao original */
                            <div>
                              {etapa.tarefas.map((tarefa, taskIndex) => renderTaskRow(tarefa, taskIndex))}
                            </div>
                          ) : (
                            /* Modo com agrupamentos: renderiza agrupado por ambiente */
                            <div>
                              {/* 1. Serviços Gerais / Sem Agrupamento */}
                              {(() => {
                                const semGrupo = etapa.tarefas
                                  .map((t, idx) => ({ tarefa: t, originalIndex: idx }))
                                  .filter(({ tarefa }) => !tarefa.ambiente || !etapaAmbientes.includes(tarefa.ambiente));

                                if (semGrupo.length === 0 && !hasAgrupamentos) return null;
                                const concluidasCount = semGrupo.filter(({ tarefa }) => isTarefaConcluida(tarefa)).length;
                                const isGeralOver = dragOverGroup?.etapaId === etapa.id && dragOverGroup?.ambiente === '__SEM_GRUPO__';
                                const isGeralOpen = isAgrupamentoOpen(etapa.id, '__SEM_GRUPO__');

                                return (
                                  <div
                                    key="sem-agrupamento"
                                    className={`agrupamento-section ${isGeralOver ? 'agrupamento-drop-active' : ''}`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (draggedTask && draggedTask.etapaId === etapa.id) {
                                        setDragOverGroup({ etapaId: etapa.id, ambiente: '__SEM_GRUPO__' });
                                      }
                                    }}
                                    onDragLeave={(e) => {
                                      e.preventDefault();
                                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        setDragOverGroup(null);
                                      }
                                    }}
                                    onDrop={(e) => handleGroupDrop(e, etapa.id, undefined)}
                                    style={{ marginBottom: 14 }}
                                  >
                                    <div
                                      className={`agrupamento-header geral ${isGeralOver ? 'drag-over-highlight' : ''}`}
                                      onClick={() => toggleAgrupamento(etapa.id, '__SEM_GRUPO__')}
                                      style={{ cursor: 'pointer', userSelect: 'none' }}
                                      title="Clique para minimizar ou expandir este agrupamento"
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div
                                          className={`accordion-caret-box ${isGeralOpen ? 'is-open' : ''}`}
                                          style={{
                                            color: 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 18,
                                            height: 18,
                                          }}
                                        >
                                          <CaretDown size={14} weight="bold" className="accordion-caret-icon" />
                                        </div>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                          Serviços Gerais / Sem Agrupamento
                                        </span>
                                        <span className="agrupamento-badge-count">
                                          {concluidasCount}/{semGrupo.length} concluídos
                                        </span>
                                      </div>
                                    </div>

                                    {isGeralOpen && (
                                      <div>
                                        {semGrupo.length === 0 ? (
                                          <div
                                            className={`agrupamento-empty-box ${isGeralOver ? 'is-dropping' : ''}`}
                                            style={{
                                              padding: '12px 14px',
                                              fontSize: '0.80rem',
                                              color: isGeralOver ? 'var(--primary-accent)' : 'var(--text-muted)',
                                              fontStyle: 'italic',
                                              background: isGeralOver ? 'var(--dark-coffee-50)' : '#fafaf9',
                                              borderRadius: 'var(--radius-xs)',
                                              border: isGeralOver ? '2px dashed var(--primary-accent)' : '1px dashed var(--border-hairline)',
                                              marginBottom: 4,
                                              textAlign: 'center',
                                              transition: 'all 0.15s ease',
                                            }}
                                          >
                                            {isGeralOver ? 'Solte aqui para remover o agrupamento' : 'Nenhum serviço geral. Arraste serviços para cá se desejar remover o grupo.'}
                                          </div>
                                        ) : (
                                          semGrupo.map(({ tarefa, originalIndex }) => renderTaskRow(tarefa, originalIndex))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* 2. Cada Agrupamento de Ambiente */}
                              {etapaAmbientes.map((ambienteNome) => {
                                const grupoTarefas = etapa.tarefas
                                  .map((t, idx) => ({ tarefa: t, originalIndex: idx }))
                                  .filter(({ tarefa }) => tarefa.ambiente === ambienteNome);

                                const concluidasCount = grupoTarefas.filter(({ tarefa }) => isTarefaConcluida(tarefa)).length;
                                const isGroupOver = dragOverGroup?.etapaId === etapa.id && dragOverGroup?.ambiente === ambienteNome;
                                const isGroupOpen = isAgrupamentoOpen(etapa.id, ambienteNome);

                                return (
                                  <div
                                    key={ambienteNome}
                                    className={`agrupamento-section ${isGroupOver ? 'agrupamento-drop-active' : ''}`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (draggedTask && draggedTask.etapaId === etapa.id) {
                                        setDragOverGroup({ etapaId: etapa.id, ambiente: ambienteNome });
                                      }
                                    }}
                                    onDragLeave={(e) => {
                                      e.preventDefault();
                                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        setDragOverGroup(null);
                                      }
                                    }}
                                    onDrop={(e) => handleGroupDrop(e, etapa.id, ambienteNome)}
                                    style={{ marginBottom: 14 }}
                                  >
                                    <div
                                      className={`agrupamento-header ${isGroupOver ? 'drag-over-highlight' : ''}`}
                                      onClick={() => toggleAgrupamento(etapa.id, ambienteNome)}
                                      style={{ cursor: 'pointer', userSelect: 'none' }}
                                      title="Clique para minimizar ou expandir este agrupamento"
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div
                                          className={`accordion-caret-box ${isGroupOpen ? 'is-open' : ''}`}
                                          style={{
                                            color: 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 18,
                                            height: 18,
                                          }}
                                        >
                                          <CaretDown size={14} weight="bold" className="accordion-caret-icon" />
                                        </div>
                                        <HouseLine size={15} weight="bold" style={{ color: 'var(--primary-accent)' }} />
                                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--dark-coffee-900)' }}>
                                          {ambienteNome}
                                        </span>
                                        <span className="agrupamento-badge-count">
                                          {concluidasCount}/{grupoTarefas.length} concluídos
                                        </span>
                                      </div>

                                      {!isReadOnly && (
                                        <div
                                          className="grupo-actions-desktop"
                                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingGroup({
                                                etapaId: etapa.id,
                                                oldName: ambienteNome,
                                                currentName: ambienteNome,
                                              })
                                            }
                                            className="agrupamento-action-btn"
                                            title="Renomear agrupamento"
                                          >
                                            <PencilSimple size={13} weight="bold" />
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              setDeleteGroupTarget({
                                                etapaId: etapa.id,
                                                nome: ambienteNome,
                                                count: grupoTarefas.length,
                                              })
                                            }
                                            className="agrupamento-action-btn danger"
                                            title="Excluir agrupamento (os serviços serão preservados)"
                                          >
                                            <Trash size={13} />
                                          </button>
                                        </div>
                                      )}
                                      {!isReadOnly && (
                                        <div className="grupo-actions-mobile">
                                          <OverflowMenu
                                            label={`Opções do agrupamento ${ambienteNome}`}
                                            items={[
                                              {
                                                key: 'renomear',
                                                label: 'Renomear agrupamento',
                                                icon: <PencilSimple size={18} weight="bold" />,
                                                onSelect: () =>
                                                  setEditingGroup({ etapaId: etapa.id, oldName: ambienteNome, currentName: ambienteNome }),
                                              },
                                              {
                                                key: 'excluir',
                                                label: 'Excluir agrupamento',
                                                icon: <Trash size={18} weight="bold" />,
                                                danger: true,
                                                onSelect: () =>
                                                  setDeleteGroupTarget({ etapaId: etapa.id, nome: ambienteNome, count: grupoTarefas.length }),
                                              },
                                            ]}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {isGroupOpen && (
                                      <div>
                                        {grupoTarefas.length === 0 ? (
                                          <div
                                            className={`agrupamento-empty-box ${isGroupOver ? 'is-dropping' : ''}`}
                                            style={{
                                              padding: '12px 14px',
                                              fontSize: '0.80rem',
                                              color: isGroupOver ? 'var(--primary-accent)' : 'var(--text-muted)',
                                              fontStyle: 'italic',
                                              background: isGroupOver ? 'var(--dark-coffee-50)' : '#fafaf9',
                                              borderRadius: 'var(--radius-xs)',
                                              border: isGroupOver ? '2px dashed var(--primary-accent)' : '1px dashed var(--border-hairline)',
                                              marginBottom: 4,
                                              textAlign: 'center',
                                              transition: 'all 0.15s ease',
                                            }}
                                          >
                                            {isGroupOver ? `Solte aqui para mover para "${ambienteNome}"` : 'Nenhum serviço neste agrupamento. Adicione abaixo ou arraste serviços para cá.'}
                                          </div>
                                        ) : (
                                          grupoTarefas.map(({ tarefa, originalIndex }) => renderTaskRow(tarefa, originalIndex))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Rodapé da Etapa: Botão Pop-up Novo Serviço */}
                          {!isReadOnly && (
                            <div className="etapa-footer-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  setAddingTaskEtapa({
                                    etapaId: etapa.id,
                                    etapaNome: etapa.nome,
                                    ambientes: etapaAmbientes,
                                  })
                                }
                                className="btn-primary etapa-add-task-btn"
                                title="Adicionar novo serviço nesta etapa"
                              >
                                <Plus size={16} weight="bold" />
                                <span>Novo Serviço</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Botão Intermediário Sutil (apenas Construtor) */}
                  {!isReadOnly && etapaIndex < obra.etapas.length - 1 && (
                    <div className="insert-divider">
                      <button
                        type="button"
                        onClick={() => onOpenWizard(etapaIndex + 1)}
                        className="insert-divider-btn"
                        title="Inserir etapa aqui"
                        aria-label="Inserir etapa aqui"
                      >
                        <Plus size={13} weight="bold" />
                        <span className="btn-text">Inserir etapa aqui</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Criação de Serviço (com opções de agrupamentos existentes) */}
      {addingTaskEtapa && (
        <ModalCreateTask
          isOpen={true}
          etapaNome={addingTaskEtapa.etapaNome}
          ambientesDisponiveis={addingTaskEtapa.ambientes}
          defaultAmbiente={addingTaskEtapa.defaultAmbiente}
          onClose={() => setAddingTaskEtapa(null)}
          onSave={(nome, ambiente) => {
            onAddTaskToEtapa(addingTaskEtapa.etapaId, nome, undefined, ambiente);
            setAddingTaskEtapa(null);
          }}
        />
      )}

      {/* Modais de Agrupamento por Ambiente */}
      {creatingGroupEtapaId && (
        <ModalEditItem
          isOpen={true}
          title="Novo Agrupamento por Ambiente"
          initialValue=""
          placeholder="Ex: Cozinha, Quarto, Banheiro, Cobertura..."
          onClose={() => setCreatingGroupEtapaId(null)}
          onSave={(novoNome) => {
            if (onCreateAgrupamento) {
              onCreateAgrupamento(creatingGroupEtapaId, novoNome);
            }
            setCreatingGroupEtapaId(null);
          }}
        />
      )}

      {editingGroup && (
        <ModalEditItem
          isOpen={true}
          title="Renomear Agrupamento"
          initialValue={editingGroup.currentName}
          onClose={() => setEditingGroup(null)}
          onSave={(novoNome) => {
            if (onRenameAgrupamento) {
              onRenameAgrupamento(editingGroup.etapaId, editingGroup.oldName, novoNome);
            }
            setEditingGroup(null);
          }}
        />
      )}

      {deleteGroupTarget && (
        <ModalConfirm
          isOpen={true}
          title="Remover Agrupamento"
          message={`Tem certeza que deseja remover o agrupamento "${deleteGroupTarget.nome}"? ${deleteGroupTarget.count > 0 ? `Os ${deleteGroupTarget.count} serviços associados serão mantidos nesta etapa e movidos para "Sem agrupamento".` : 'Nenhum serviço será excluído.'}`}
          confirmText="Sim, remover"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            if (onDeleteAgrupamento) {
              onDeleteAgrupamento(deleteGroupTarget.etapaId, deleteGroupTarget.nome);
            }
            setDeleteGroupTarget(null);
          }}
          onCancel={() => setDeleteGroupTarget(null)}
        />
      )}

      {/* Modal de Mover Serviço para Agrupamento (Ideal para Mobile & Desktop) */}
      {movingTaskTarget && (() => {
        const targetEtapa = obra.etapas.find((e) => e.id === movingTaskTarget.etapaId);
        const etapaAmbientes = Array.from(new Set([
          ...(targetEtapa?.ambientes || []),
          ...((targetEtapa?.tarefas || []).map((t) => t.ambiente).filter((a): a is string => Boolean(a && a.trim())))
        ]));

        return (
          <ModalMoveTask
            isOpen={true}
            tarefaNome={movingTaskTarget.tarefa.nome}
            ambienteAtual={movingTaskTarget.tarefa.ambiente}
            ambientesDisponiveis={etapaAmbientes}
            onClose={() => setMovingTaskTarget(null)}
            onSelectAmbiente={(novoAmbiente) => {
              if (onMoveTaskAgrupamento) {
                onMoveTaskAgrupamento(movingTaskTarget.etapaId, movingTaskTarget.tarefa.id, novoAmbiente);
              }
              setMovingTaskTarget(null);
            }}
            onCreateNovoAmbiente={(novoNome) => {
              if (onMoveTaskAgrupamento) {
                onMoveTaskAgrupamento(movingTaskTarget.etapaId, movingTaskTarget.tarefa.id, novoNome);
              }
              setMovingTaskTarget(null);
            }}
          />
        );
      })()}

      {/* Modais de Edição */}
      {editingEtapa && (
        <ModalEditItem
          isOpen={true}
          title="Editar Nome da Etapa"
          initialValue={editingEtapa.nome}
          onClose={() => setEditingEtapa(null)}
          onSave={(novoNome) => {
            onEditEtapaNome(editingEtapa.id, novoNome);
            setEditingEtapa(null);
          }}
        />
      )}

      {editingTask && (() => {
        const targetEtapa = obra.etapas.find((e) => e.id === editingTask.etapaId);
        const etapaAmbientes = Array.from(new Set([
          ...(targetEtapa?.ambientes || []),
          ...((targetEtapa?.tarefas || []).map((t) => t.ambiente).filter((a): a is string => Boolean(a && a.trim())))
        ]));

        return (
          <ModalEditTask
            isOpen={true}
            initialNome={editingTask.nome}
            initialAmbiente={editingTask.ambiente}
            ambientesDisponiveis={etapaAmbientes}
            onClose={() => setEditingTask(null)}
            onSave={(novoNome, novoAmbiente) => {
              if (onEditTask) {
                onEditTask(editingTask.etapaId, editingTask.id, novoNome, novoAmbiente);
              } else {
                if (novoNome !== editingTask.nome) {
                  onEditTaskNome(editingTask.etapaId, editingTask.id, novoNome);
                }
                if (novoAmbiente !== editingTask.ambiente && onMoveTaskAgrupamento) {
                  onMoveTaskAgrupamento(editingTask.etapaId, editingTask.id, novoAmbiente);
                }
              }
              setEditingTask(null);
            }}
          />
        );
      })()}

      {/* Modal Customizado de Exclusão de Etapa */}
      {deleteEtapaTarget && (
        <ModalConfirm
          isOpen={true}
          title="Excluir Etapa"
          message={`Tem certeza que deseja excluir a etapa "${deleteEtapaTarget.nome}" e todos os seus serviços?`}
          confirmText="Sim, excluir"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            onDeleteEtapa(deleteEtapaTarget.id);
            setDeleteEtapaTarget(null);
          }}
          onCancel={() => setDeleteEtapaTarget(null)}
        />
      )}

      {/* Modal Customizado de Exclusão de Tarefa */}
      {deleteTaskTarget && (
        <ModalConfirm
          isOpen={true}
          title="Excluir Serviço"
          message={`Deseja remover o serviço "${deleteTaskTarget.nome}" desta etapa?`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            onDeleteTask(deleteTaskTarget.etapaId, deleteTaskTarget.id);
            setDeleteTaskTarget(null);
          }}
          onCancel={() => setDeleteTaskTarget(null)}
        />
      )}

      {/* Modal de Detalhes da Tarefa (Fotos e Anotações) */}
      <ModalTaskDetails
        isOpen={Boolean(viewingTaskDetails)}
        onClose={() => setViewingTaskDetails(null)}
        tarefa={viewingTaskDetails?.tarefa || null}
        etapaNome={viewingTaskDetails?.etapaNome || ''}
        etapaId={viewingTaskDetails?.etapaId || ''}
        onUpdateTaskMedia={isReadOnly ? undefined : handleUpdateTaskMediaInternal}
        isReadOnly={isReadOnly}
      />
    </div>
  );
};
