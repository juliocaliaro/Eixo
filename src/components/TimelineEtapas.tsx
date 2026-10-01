import React, { useState, useEffect } from 'react';
import {
  CaretDown,
  CaretUp,
  Plus,
  Trash,
  PencilSimple,
  CheckCircle,
  Camera,
  NotePencil,
  Kanban,
  DotsSixVertical,
  Eye,
  Check
} from '@phosphor-icons/react';
import { Obra, Etapa, Tarefa } from '../types/obra';
import { ModalEditItem } from './ModalEditItem';
import { ModalConfirm } from './ModalConfirm';
import { ModalTaskDetails } from './ModalTaskDetails';
import { getEtapaIcon } from '../utils/etapaIcons';

interface TimelineEtapasProps {
  obra: Obra;
  onOpenWizard: (insertIndex?: number | null) => void;
  onToggleTask: (etapaId: string, tarefaId: string) => void;
  onDeleteEtapa: (etapaId: string) => void;
  onEditEtapaNome: (etapaId: string, novoNome: string) => void;
  onReorderEtapas: (draggedIndex: number, targetIndex: number) => void;
  onDeleteTask: (etapaId: string, tarefaId: string) => void;
  onEditTaskNome: (etapaId: string, tarefaId: string, novoNome: string) => void;
  onReorderTasks: (etapaId: string, draggedIndex: number, targetIndex: number) => void;
  onAddTaskToEtapa: (etapaId: string, taskNome: string, insertAtIndex?: number) => void;
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
  onReorderTasks,
  onAddTaskToEtapa,
  onUpdateTaskMedia,
  isReadOnly = false,
  targetTaskNavigation,
}) => {
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>(() => {
    const initial: { [key: string]: boolean } = {};
    obra.etapas.forEach((e) => {
      initial[e.id] = true;
    });
    return initial;
  });

  const [newTaskInput, setNewTaskInput] = useState<{ [etapaId: string]: string }>({});
  const [editingEtapa, setEditingEtapa] = useState<{ id: string; nome: string } | null>(null);
  const [editingTask, setEditingTask] = useState<{ etapaId: string; id: string; nome: string } | null>(null);

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

  const formatarDataHora = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      const hora = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dia}/${mes}/${ano} às ${hora}:${min}`;
    } catch {
      return '';
    }
  };

  const toggleAccordion = (etapaId: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [etapaId]: !prev[etapaId],
    }));
  };

  const handleQuickAddTask = (etapaId: string) => {
    const text = newTaskInput[etapaId]?.trim();
    if (!text) return;
    onAddTaskToEtapa(etapaId, text);
    setNewTaskInput((prev) => ({ ...prev, [etapaId]: '' }));
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
    if (draggedTask && draggedTask.etapaId === etapaId && draggedTask.index !== targetIndex) {
      onReorderTasks(etapaId, draggedTask.index, targetIndex);
    }
    setDraggedTask(null);
    setDragOverTask(null);
  };

  if (obra.etapas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 20px', border: '1px dashed var(--border-hairline)', borderRadius: 'var(--radius-lg)', background: '#ffffff' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--dark-coffee-100)', color: 'var(--primary-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Kanban size={28} weight="duotone" />
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
          Nenhuma etapa no cronograma
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 18px auto' }}>
          {isReadOnly
            ? 'Aguardando o construtor cadastrar as etapas deste cronograma para acompanhamento.'
            : 'Adicione etapas para estruturar a execução e acompanhar os serviços diários.'}
        </p>
        {!isReadOnly ? (
          <button onClick={() => onOpenWizard(null)} className="btn-primary">
            <Plus size={16} weight="bold" />
            <span>Adicionar Etapa</span>
          </button>
        ) : (
          <span
            className="timeline-badge"
            style={{
              background: 'var(--coral-glow-100)',
              color: 'var(--coral-glow-700)',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Modo de Acompanhamento (Leitura)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="timeline-section">
      {/* Título de Seção */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Cronograma Físico
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isReadOnly
              ? 'Acompanhe as etapas, serviços e fotos do diário de obra em tempo real.'
              : 'Arraste pelo ícone ⋮⋮ para reordenar etapas e serviços'}
          </p>
        </div>

        {isReadOnly ? (
          <span
            className="timeline-badge"
            style={{
              background: 'var(--coral-glow-100)',
              color: 'var(--coral-glow-700)',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Acompanhamento do Cliente (Leitura)
          </span>
        ) : (
          <button onClick={() => onOpenWizard(null)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.88rem' }}>
            <Plus size={16} weight="bold" />
            <span>Nova Etapa</span>
          </button>
        )}
      </div>

      {/* Linha do Tempo Vertical Contínua */}
      <div className="vertical-timeline-container">
        {/* Trilho Vertical (Linha da Linha do Tempo) */}
        <div className="timeline-spine-line" />

        <div className="timeline-items-flow">
          {obra.etapas.map((etapa, etapaIndex) => {
            const isOpen = openAccordions[etapa.id] ?? true;
            const totalTarefas = etapa.tarefas.length;
            const concluidas = etapa.tarefas.filter((t) => t.concluida).length;
            const todasConcluidas = totalTarefas > 0 && concluidas === totalTarefas;
            const percEtapa = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;
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
                            className="drag-handle-grip"
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
                            <span className="timeline-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {etapa.nome}
                            </span>
                            {etapa.tipoOrigem && (
                              <span className="timeline-badge">{etapa.tipoOrigem}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {todasConcluidas ? (
                              <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Check size={14} weight="bold" />
                                <span>Concluída {etapa.concluidaEm ? `em ${formatarDataHora(etapa.concluidaEm)}` : '100%'}</span>
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
                    {isOpen && (
                      <div className="tasks-block">
                        {etapa.tarefas.length === 0 ? (
                          <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Nenhum serviço listado. Digite no campo abaixo para incluir.
                          </div>
                        ) : (
                          <div>
                            {etapa.tarefas.map((tarefa, taskIndex) => {
                              const temAnexos = (tarefa.fotos && tarefa.fotos.length > 0) || (tarefa.anotacoes && tarefa.anotacoes.length > 0);
                              const isTaskOver = dragOverTask?.etapaId === etapa.id && dragOverTask?.index === taskIndex;
                              const isTaskDragging = draggedTask?.etapaId === etapa.id && draggedTask?.index === taskIndex;

                              return (
                                <div
                                  key={tarefa.id}
                                  id={`task-row-${tarefa.id}`}
                                  className={`task-row ${tarefa.concluida ? 'is-done' : ''} ${isTaskOver ? 'drag-target-highlight' : ''}`}
                                  onDragOver={(e) => handleTaskDragOver(e, etapa.id, taskIndex)}
                                  onDrop={(e) => handleTaskDrop(e, etapa.id, taskIndex)}
                                  style={{ opacity: isTaskDragging ? 0.35 : 1 }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                    {/* Drag Handle da Tarefa (apenas Construtor) */}
                                    {!isReadOnly && (
                                      <div
                                        draggable
                                        onDragStart={(e) => handleTaskDragStart(e, etapa.id, taskIndex)}
                                        className="drag-handle-grip"
                                        style={{ padding: 2 }}
                                        title="Arrastar para reordenar serviço"
                                      >
                                        <DotsSixVertical size={15} />
                                      </div>
                                    )}

                                    <input
                                      type="checkbox"
                                      className="task-checkbox"
                                      checked={tarefa.concluida}
                                      disabled={isReadOnly}
                                      onChange={() => {
                                        if (isReadOnly) return;
                                        onToggleTask(etapa.id, tarefa.id);
                                        if (!tarefa.concluida) {
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

                                  {/* Ações da Tarefa */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {/* Botão de Ver Detalhes (Fotos e Notas) - Visível para Ambos */}
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
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Inserir Serviço (apenas Construtor) */}
                        {!isReadOnly && (
                          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                              placeholder="+ Novo serviço..."
                              value={newTaskInput[etapa.id] || ''}
                              onChange={(e) =>
                                setNewTaskInput((prev) => ({
                                  ...prev,
                                  [etapa.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickAddTask(etapa.id);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleQuickAddTask(etapa.id)}
                              className="btn-secondary"
                              style={{ padding: '8px 14px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                            >
                              <span>Adicionar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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

      {/* Botão Final (apenas Construtor) */}
      {!isReadOnly && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            type="button"
            onClick={() => onOpenWizard(null)}
            className="btn-outline-teal"
          >
            <Plus size={16} weight="bold" />
            <span>Adicionar Próxima Etapa</span>
          </button>
        </div>
      )}

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

      {editingTask && (
        <ModalEditItem
          isOpen={true}
          title="Editar Nome do Serviço"
          initialValue={editingTask.nome}
          onClose={() => setEditingTask(null)}
          onSave={(novoNome) => {
            onEditTaskNome(editingTask.etapaId, editingTask.id, novoNome);
            setEditingTask(null);
          }}
        />
      )}

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
