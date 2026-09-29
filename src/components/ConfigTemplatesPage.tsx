import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Gear,
  Plus,
  Trash,
  PencilSimple,
  Check,
  X,
  ArrowCounterClockwise,
  CaretDown,
  CaretUp,
  ArrowUp,
  ArrowDown,
  ListChecks,
  Buildings,
  FolderSimple,
  Sparkle
} from '@phosphor-icons/react';
import { PresetTipoObra, PresetEtapa, PresetTarefa } from '../types/obra';
import { getEtapaIcon } from '../utils/etapaIcons';
import { ModalConfirm } from './ModalConfirm';
import { resetTemplatesToDefault } from '../utils/storage';

interface ConfigTemplatesPageProps {
  templates: PresetTipoObra[];
  onUpdateTemplates: (updated: PresetTipoObra[]) => void;
  onBack: () => void;
  showToast: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ConfigTemplatesPage: React.FC<ConfigTemplatesPageProps> = ({
  templates,
  onUpdateTemplates,
  onBack,
  showToast,
}) => {
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    templates.length > 0 ? templates[0].id : ''
  );

  // Controle de accordions das etapas abertas
  const [openAccordions, setOpenAccordions] = useState<{ [etapaId: string]: boolean }>({});

  // Edição inline de nome de modelo
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tempTemplateNome, setTempTemplateNome] = useState('');

  // Edição inline de nome de etapa
  const [editingEtapaId, setEditingEtapaId] = useState<string | null>(null);
  const [tempEtapaNome, setTempEtapaNome] = useState('');

  // Edição inline de nome de tarefa
  const [editingTarefaKey, setEditingTarefaKey] = useState<string | null>(null); // `${etapaId}__${tarefaId}`
  const [tempTarefaNome, setTempTarefaNome] = useState('');

  // Novo serviço em digitação por etapa
  const [novaTarefaInputs, setNovaTarefaInputs] = useState<{ [etapaId: string]: string }>({});

  // Modais de confirmação e criação
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [novoModeloNome, setNovoModeloNome] = useState('');
  const [novoModeloClonarDe, setNovoModeloClonarDe] = useState<string>('blank');

  const [isAddEtapaOpen, setIsAddEtapaOpen] = useState(false);
  const [novaEtapaNome, setNovaEtapaNome] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'template' | 'etapa' | 'tarefa';
    templateId?: string;
    etapaId?: string;
    tarefaId?: string;
    name: string;
  } | null>(null);

  // Fechar modais de criação com tecla Escape
  useEffect(() => {
    if (!isAddTemplateOpen && !isAddEtapaOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddTemplateOpen) setIsAddTemplateOpen(false);
        if (isAddEtapaOpen) setIsAddEtapaOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddTemplateOpen, isAddEtapaOpen]);

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];

  const toggleAccordion = (etapaId: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [etapaId]: prev[etapaId] === undefined ? false : !prev[etapaId],
    }));
  };

  const isAccordionOpen = (etapaId: string) => {
    return openAccordions[etapaId] !== false; // Aberto por padrão
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
    const updated = templates.map((t) =>
      t.id === editingTemplateId ? { ...t, nome: tempTemplateNome.trim() } : t
    );
    onUpdateTemplates(updated);
    setEditingTemplateId(null);
    showToast('Modelo atualizado', 'O nome do modelo foi alterado com sucesso.');
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
        // Clonar com novos IDs
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

    const updated = [...templates, novoTemplate];
    onUpdateTemplates(updated);
    setActiveTemplateId(novoId);
    setIsAddTemplateOpen(false);
    setNovoModeloNome('');
    setNovoModeloClonarDe('blank');
    showToast('Modelo criado com sucesso!', `O modelo "${novoTemplate.nome}" já está disponível.`);
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
    showToast('Modelo removido', 'O modelo foi excluído com sucesso.');
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

    const updated = templates.map((t) => {
      if (t.id === activeTemplate.id) {
        return {
          ...t,
          etapas: [...t.etapas, novaEtapa],
        };
      }
      return t;
    });

    onUpdateTemplates(updated);
    setIsAddEtapaOpen(false);
    setNovaEtapaNome('');
    showToast('Etapa adicionada', `A etapa "${novaEtapa.nome}" foi incluída no modelo.`);
  };

  const handleStartEditEtapa = (etapa: PresetEtapa) => {
    setEditingEtapaId(etapa.id);
    setTempEtapaNome(etapa.nome);
  };

  const handleSaveEditEtapa = (etapaId: string) => {
    if (!tempEtapaNome.trim() || !activeTemplate) return;

    const updated = templates.map((t) => {
      if (t.id === activeTemplate.id) {
        return {
          ...t,
          etapas: t.etapas.map((e) => (e.id === etapaId ? { ...e, nome: tempEtapaNome.trim() } : e)),
        };
      }
      return t;
    });

    onUpdateTemplates(updated);
    setEditingEtapaId(null);
    showToast('Etapa renomeada', 'O nome da etapa foi atualizado.');
  };

  const handleDeleteEtapa = (etapaId: string) => {
    if (!activeTemplate) return;

    const updated = templates.map((t) => {
      if (t.id === activeTemplate.id) {
        return {
          ...t,
          etapas: t.etapas.filter((e) => e.id !== etapaId),
        };
      }
      return t;
    });

    onUpdateTemplates(updated);
    showToast('Etapa removida', 'A etapa e suas tarefas foram excluídas do modelo.');
  };

  const handleMoveEtapa = (index: number, direction: 'up' | 'down') => {
    if (!activeTemplate) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeTemplate.etapas.length) return;

    const novasEtapas = [...activeTemplate.etapas];
    const [removido] = novasEtapas.splice(index, 1);
    novasEtapas.splice(targetIndex, 0, removido);

    const updated = templates.map((t) => (t.id === activeTemplate.id ? { ...t, etapas: novasEtapas } : t));
    onUpdateTemplates(updated);
  };

  // --- Handlers de Tarefas ---
  const handleAddTarefa = (etapaId: string) => {
    const texto = (novaTarefaInputs[etapaId] || '').trim();
    if (!texto || !activeTemplate) return;

    const novaTarefa: PresetTarefa = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nome: texto,
    };

    const updated = templates.map((t) => {
      if (t.id === activeTemplate.id) {
        return {
          ...t,
          etapas: t.etapas.map((e) => {
            if (e.id === etapaId) {
              return {
                ...e,
                tarefas: [...e.tarefas, novaTarefa],
              };
            }
            return e;
          }),
        };
      }
      return t;
    });

    onUpdateTemplates(updated);
    setNovaTarefaInputs((prev) => ({ ...prev, [etapaId]: '' }));
    showToast('Serviço adicionado', `"${novaTarefa.nome}" adicionado à etapa.`);
  };

  const handleStartEditTarefa = (etapaId: string, tarefa: PresetTarefa) => {
    setEditingTarefaKey(`${etapaId}__${tarefa.id}`);
    setTempTarefaNome(tarefa.nome);
  };

  const handleSaveEditTarefa = (etapaId: string, tarefaId: string) => {
    if (!tempTarefaNome.trim() || !activeTemplate) return;

    const updated = templates.map((t) => {
      if (t.id === activeTemplate.id) {
        return {
          ...t,
          etapas: t.etapas.map((e) => {
            if (e.id === etapaId) {
              return {
                ...e,
                tarefas: e.tarefas.map((ta) => (ta.id === tarefaId ? { ...ta, nome: tempTarefaNome.trim() } : ta)),
              };
            }
            return e;
          }),
        };
      }
      return t;
    });

    onUpdateTemplates(updated);
    setEditingTarefaKey(null);
  };

  const handleDeleteTarefa = (etapaId: string, tarefaId: string) => {
    if (!activeTemplate) return;

    const updated = templates.map((t) => {
      if (t.id === activeTemplate.id) {
        return {
          ...t,
          etapas: t.etapas.map((e) => {
            if (e.id === etapaId) {
              return {
                ...e,
                tarefas: e.tarefas.filter((ta) => ta.id !== tarefaId),
              };
            }
            return e;
          }),
        };
      }
      return t;
    });

    onUpdateTemplates(updated);
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

    const updated = templates.map((t) => {
      if (t.id === activeTemplate.id) {
        return {
          ...t,
          etapas: t.etapas.map((e) => (e.id === etapaId ? { ...e, tarefas: novasTarefas } : e)),
        };
      }
      return t;
    });

    onUpdateTemplates(updated);
  };

  // --- Reset de Fábrica ---
  const handleResetToDefaults = () => {
    const padroes = resetTemplatesToDefault();
    onUpdateTemplates(padroes);
    if (padroes.length > 0) {
      setActiveTemplateId(padroes[0].id);
    }
    setIsResetConfirmOpen(false);
    showToast('Modelos restaurados!', 'Os modelos de Construção e Reforma foram restaurados para o padrão de fábrica.', 'info');
  };

  if (!activeTemplate) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p>Carregando modelos de templates...</p>
      </div>
    );
  }

  const totalServicosModelo = activeTemplate.etapas.reduce((acc, e) => acc + e.tarefas.length, 0);

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Barra de Ação Superior */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <button onClick={onBack} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} weight="bold" />
          <span>Voltar para Obras</span>
        </button>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="btn-secondary"
            title="Restaurar etapas e tarefas para os modelos originais do sistema"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowCounterClockwise size={16} weight="bold" />
            <span>Restaurar Padrões</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddTemplateOpen(true)}
            className="btn-primary"
          >
            <Plus size={16} weight="bold" />
            <span>Novo Modelo</span>
          </button>
        </div>
      </div>

      {/* Hero Header Institucional do Painel de Configurações */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 28px',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              background: 'var(--dark-coffee-100)',
              color: 'var(--dark-coffee-800)',
              padding: 12,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gear size={28} weight="fill" />
          </div>

          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: 'var(--primary-accent)',
              }}
            >
              Templates & Padronização
            </span>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2, marginBottom: 6 }}>
              Modelos de Etapas e Tarefas
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: '780px' }}>
              Defina o catálogo padrão de etapas e serviços técnicos da sua empresa. Os modelos aqui configurados
              são carregados automaticamente no <strong>Wizard de Etapas</strong> ao planejar qualquer obra.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Abas dos Modelos Cadastrados */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--border-hairline)',
          paddingBottom: 12,
          overflowX: 'auto',
        }}
      >
        {templates.map((tpl) => {
          const isActive = tpl.id === activeTemplate.id;
          return (
            <button
              key={tpl.id}
              onClick={() => setActiveTemplateId(tpl.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                background: isActive ? 'var(--dark-coffee-800)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-body)',
                border: isActive ? 'none' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <FolderSimple size={16} weight={isActive ? 'fill' : 'regular'} />
              <span>{tpl.nome}</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 7px',
                  borderRadius: 10,
                  background: isActive ? 'rgba(255, 255, 255, 0.22)' : 'var(--dark-coffee-100)',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                {tpl.etapas.length} etapas
              </span>
            </button>
          );
        })}
      </div>

      {/* Detalhes do Modelo Ativo */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          {editingTemplateId === activeTemplate.id ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                value={tempTemplateNome}
                onChange={(e) => setTempTemplateNome(e.target.value)}
                style={{ maxWidth: '300px', fontWeight: 700 }}
                autoFocus
              />
              <button onClick={handleSaveEditTemplate} className="btn-icon" title="Salvar">
                <Check size={18} weight="bold" color="var(--primary-accent)" />
              </button>
              <button onClick={() => setEditingTemplateId(null)} className="btn-icon" title="Cancelar">
                <X size={18} weight="bold" />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {activeTemplate.nome}
              </h2>
              <button
                onClick={() => handleStartEditTemplate(activeTemplate)}
                className="btn-icon"
                title="Editar nome do modelo"
              >
                <PencilSimple size={16} />
              </button>
            </div>
          )}
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Contém <strong>{activeTemplate.etapas.length} etapas</strong> e <strong>{totalServicosModelo} serviços catalogados</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {templates.length > 1 && (
            <button
              onClick={() =>
                setDeleteTarget({
                  type: 'template',
                  templateId: activeTemplate.id,
                  name: activeTemplate.nome,
                })
              }
              className="btn-secondary"
              style={{ color: 'var(--text-muted)' }}
              title="Excluir este modelo"
            >
              <Trash size={16} />
              <span>Excluir Modelo</span>
            </button>
          )}

          <button
            onClick={() => setIsAddEtapaOpen(true)}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <Plus size={16} weight="bold" />
            <span>Adicionar Etapa</span>
          </button>
        </div>
      </div>

      {/* Lista de Etapas e Tarefas do Modelo */}
      {activeTemplate.etapas.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <ListChecks size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
            Nenhuma etapa cadastrada neste modelo
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 18 }}>
            Comece adicionando a primeira etapa técnica (ex: "Proteção da área", "Demolição", etc.).
          </p>
          <button onClick={() => setIsAddEtapaOpen(true)} className="btn-primary">
            <Plus size={16} weight="bold" />
            <span>Cadastrar Primeira Etapa</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeTemplate.etapas.map((etapa, etapaIndex) => {
            const etapaIconConfig = getEtapaIcon(etapa.nome, etapa.id);
            const IconComponent = etapaIconConfig.Icon;
            const isOpen = isAccordionOpen(etapa.id);

            return (
              <div
                key={etapa.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* Header da Etapa */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 18px',
                    gap: 12,
                    background: isOpen ? '#ffffff' : 'var(--dark-coffee-50)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: isOpen ? '1px solid var(--border-hairline)' : 'none',
                  }}
                  onClick={() => toggleAccordion(etapa.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleAccordion(etapa.id);
                    }
                  }}
                >
                  {/* Ícone Temático */}
                  <div
                    style={{
                      background: etapaIconConfig.bg,
                      color: etapaIconConfig.color,
                      padding: 8,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconComponent size={20} weight="fill" />
                  </div>

                  {/* Nome da Etapa (Normal ou Edição Inline) */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    {editingEtapaId === etapa.id ? (
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          className="form-input"
                          value={tempEtapaNome}
                          onChange={(e) => setTempEtapaNome(e.target.value)}
                          style={{ padding: '6px 10px', fontSize: '0.95rem', fontWeight: 700 }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditEtapa(etapa.id);
                            if (e.key === 'Escape') setEditingEtapaId(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveEditEtapa(etapa.id)}
                          className="btn-icon"
                          title="Salvar"
                        >
                          <Check size={18} weight="bold" color="var(--primary-accent)" />
                        </button>
                        <button
                          onClick={() => setEditingEtapaId(null)}
                          className="btn-icon"
                          title="Cancelar"
                        >
                          <X size={18} weight="bold" />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                          {etapaIndex + 1}. {etapa.nome}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditEtapa(etapa);
                          }}
                          className="btn-icon"
                          title="Editar nome da etapa"
                          style={{ padding: 4 }}
                        >
                          <PencilSimple size={14} />
                        </button>
                      </div>
                    )}
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {etapa.tarefas.length} {etapa.tarefas.length === 1 ? 'serviço' : 'serviços'}
                    </span>
                  </div>

                  {/* Ações da Etapa: Reordenar / Excluir / Expandir */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleMoveEtapa(etapaIndex, 'up')}
                      disabled={etapaIndex === 0}
                      className="btn-icon"
                      title="Mover etapa para cima"
                      style={{ opacity: etapaIndex === 0 ? 0.3 : 1 }}
                    >
                      <ArrowUp size={15} weight="bold" />
                    </button>
                    <button
                      onClick={() => handleMoveEtapa(etapaIndex, 'down')}
                      disabled={etapaIndex === activeTemplate.etapas.length - 1}
                      className="btn-icon"
                      title="Mover etapa para baixo"
                      style={{ opacity: etapaIndex === activeTemplate.etapas.length - 1 ? 0.3 : 1 }}
                    >
                      <ArrowDown size={15} weight="bold" />
                    </button>

                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: 'etapa',
                          etapaId: etapa.id,
                          name: etapa.nome,
                        })
                      }
                      className="btn-icon"
                      title="Excluir etapa"
                      style={{ color: 'var(--text-muted)', marginLeft: 4 }}
                    >
                      <Trash size={16} />
                    </button>

                    <div style={{ color: 'var(--text-muted)', marginLeft: 6, display: 'flex', alignItems: 'center' }}>
                      {isOpen ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                    </div>
                  </div>
                </div>

                {/* Corpo da Etapa: Lista de Serviços e Input de Adição */}
                {isOpen && (
                  <div style={{ padding: '16px 20px', background: '#faf9f7' }}>
                    {/* Linha de cadastro rápido de novo serviço */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Adicionar serviço padrão nesta etapa..."
                        value={novaTarefaInputs[etapa.id] || ''}
                        onChange={(e) =>
                          setNovaTarefaInputs((prev) => ({ ...prev, [etapa.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTarefa(etapa.id);
                          }
                        }}
                        style={{ fontSize: '0.88rem', padding: '8px 12px' }}
                      />
                      <button
                        onClick={() => handleAddTarefa(etapa.id)}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                      >
                        <Plus size={15} weight="bold" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    {/* Lista de Serviços */}
                    {etapa.tarefas.length === 0 ? (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 4px' }}>
                        Nenhum serviço cadastrado nesta etapa. Digite acima para adicionar.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {etapa.tarefas.map((tarefa, tIndex) => {
                          const isEditing = editingTarefaKey === `${etapa.id}__${tarefa.id}`;

                          return (
                            <div
                              key={tarefa.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#ffffff',
                                border: '1px solid var(--border-hairline)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px 12px',
                                gap: 10,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-accent)', flexShrink: 0 }} />

                                {isEditing ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={tempTarefaNome}
                                      onChange={(e) => setTempTarefaNome(e.target.value)}
                                      style={{ padding: '4px 8px', fontSize: '0.88rem', flex: 1 }}
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEditTarefa(etapa.id, tarefa.id);
                                        if (e.key === 'Escape') setEditingTarefaKey(null);
                                      }}
                                    />
                                    <button
                                      onClick={() => handleSaveEditTarefa(etapa.id, tarefa.id)}
                                      className="btn-icon"
                                      title="Salvar"
                                      style={{ padding: 4 }}
                                    >
                                      <Check size={16} weight="bold" color="var(--primary-accent)" />
                                    </button>
                                    <button
                                      onClick={() => setEditingTarefaKey(null)}
                                      className="btn-icon"
                                      title="Cancelar"
                                      style={{ padding: 4 }}
                                    >
                                      <X size={16} weight="bold" />
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.88rem', color: 'var(--text-body)', flex: 1 }}>
                                    {tarefa.nome}
                                  </span>
                                )}
                              </div>

                              {/* Ações da Tarefa */}
                              {!isEditing && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <button
                                    onClick={() => handleStartEditTarefa(etapa.id, tarefa)}
                                    className="btn-icon"
                                    title="Editar serviço"
                                    style={{ padding: 4 }}
                                  >
                                    <PencilSimple size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleMoveTarefa(etapa.id, tIndex, 'up')}
                                    disabled={tIndex === 0}
                                    className="btn-icon"
                                    title="Mover para cima"
                                    style={{ padding: 4, opacity: tIndex === 0 ? 0.3 : 1 }}
                                  >
                                    <ArrowUp size={13} weight="bold" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveTarefa(etapa.id, tIndex, 'down')}
                                    disabled={tIndex === etapa.tarefas.length - 1}
                                    className="btn-icon"
                                    title="Mover para baixo"
                                    style={{ padding: 4, opacity: tIndex === etapa.tarefas.length - 1 ? 0.3 : 1 }}
                                  >
                                    <ArrowDown size={13} weight="bold" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTarefa(etapa.id, tarefa.id)}
                                    className="btn-icon"
                                    title="Excluir serviço"
                                    style={{ padding: 4, color: 'var(--text-muted)' }}
                                  >
                                    <Trash size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar Novo Modelo */}
      {isAddTemplateOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddTemplateOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'var(--dark-coffee-100)', padding: 7, borderRadius: 8 }}>
                  <FolderSimple size={20} weight="fill" color="var(--dark-coffee-800)" />
                </div>
                <div>
                  <h2 className="modal-title">Novo Modelo de Obra</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Crie um novo template padrão de etapas e tarefas
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAddTemplateOpen(false)} className="btn-icon">
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate}>
              <div className="modal-body" style={{ padding: '22px' }}>
                <div className="form-group">
                  <label className="form-label">Nome do Modelo *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Reforma Comercial, Fachada & Pintura..."
                    value={novoModeloNome}
                    onChange={(e) => setNovoModeloNome(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Estrutura Inicial</label>
                  <select
                    className="form-input"
                    value={novoModeloClonarDe}
                    onChange={(e) => setNovoModeloClonarDe(e.target.value)}
                  >
                    <option value="blank">Em branco (sem etapas)</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        Copiar etapas de: {tpl.nome} ({tpl.etapas.length} etapas)
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
                  <Plus size={16} weight="bold" />
                  <span>Criar Modelo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Etapa ao Modelo */}
      {isAddEtapaOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddEtapaOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'var(--coral-glow-100)', padding: 7, borderRadius: 8 }}>
                  <Sparkle size={20} weight="fill" color="var(--primary-accent)" />
                </div>
                <div>
                  <h2 className="modal-title">Nova Etapa Técnica</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Adicione uma etapa ao modelo "{activeTemplate.nome}"
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAddEtapaOpen(false)} className="btn-icon">
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleCreateEtapa}>
              <div className="modal-body" style={{ padding: '22px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome da Etapa *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Marcenaria e Vidraçaria, Instalação Solar..."
                    value={novaEtapaNome}
                    onChange={(e) => setNovaEtapaNome(e.target.value)}
                    autoFocus
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    O sistema atribuirá automaticamente um ícone temático correspondente.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddEtapaOpen(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Plus size={16} weight="bold" />
                  <span>Incluir Etapa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteTarget && (
        <ModalConfirm
          isOpen={true}
          title={
            deleteTarget.type === 'template'
              ? 'Excluir Modelo de Obra'
              : 'Excluir Etapa'
          }
          message={`Tem certeza que deseja excluir "${deleteTarget.name}"? Todos os serviços vinculados serão removidos.`}
          confirmText="Sim, excluir"
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

      {/* Modal de Confirmação para Restaurar Padrões */}
      {isResetConfirmOpen && (
        <ModalConfirm
          isOpen={true}
          title="Restaurar Modelos de Fábrica"
          message="Tem certeza que deseja restaurar as etapas e serviços para os modelos originais (Construção e Reforma)? Todas as customizações feitas nos templates serão redefinidas."
          confirmText="Sim, restaurar padrões"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={handleResetToDefaults}
          onCancel={() => setIsResetConfirmOpen(false)}
        />
      )}
    </div>
  );
};
