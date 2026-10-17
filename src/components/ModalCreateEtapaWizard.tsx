import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Buildings,
  PaintBrushHousehold,
  Sparkle,
  Trash,
  ListChecks
} from '@phosphor-icons/react';
import { EmptyState } from './EmptyState';
import { PRESET_TIPOS_OBRA } from '../data/presetObras';
import { PresetEtapa, PresetTipoObra } from '../types/obra';
import { getEtapaIcon } from '../utils/etapaIcons';
import { generateUUID } from '../utils/uuid';

interface ModalCreateEtapaWizardProps {
  isOpen: boolean;
  onClose: () => void;
  insertAtIndex?: number | null;
  templates?: PresetTipoObra[];
  onAddEtapa: (etapa: {
    nome: string;
    tarefas: { nome: string }[];
    tipoOrigem?: string;
  }, insertIndex?: number | null) => void;
}

export const ModalCreateEtapaWizard: React.FC<ModalCreateEtapaWizardProps> = ({
  isOpen,
  onClose,
  insertAtIndex,
  templates,
  onAddEtapa,
}) => {
  const availableTemplates = templates && templates.length > 0 ? templates : PRESET_TIPOS_OBRA;
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedTipo, setSelectedTipo] = useState<PresetTipoObra | null>(availableTemplates[0] || null);
  const [isTipoPersonalizado, setIsTipoPersonalizado] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<PresetEtapa | null>(null);
  const [customEtapaNome, setCustomEtapaNome] = useState('');
  const [isCustomEtapa, setIsCustomEtapa] = useState(false);
  const [tarefasSelecionadas, setTarefasSelecionadas] = useState<{ id: string; nome: string; checked: boolean }[]>([]);
  const [novaTarefaTexto, setNovaTarefaTexto] = useState('');
  const [erroMsg, setErroMsg] = useState('');

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSelectTipo = (tipo: PresetTipoObra) => {
    setSelectedTipo(tipo);
    setIsTipoPersonalizado(false);
    setSelectedEtapa(null);
    setIsCustomEtapa(false);
    setErroMsg('');
    setCurrentStep(2);
  };

  const handleSelectTipoCustom = () => {
    setSelectedTipo(null);
    setIsTipoPersonalizado(true);
    setIsCustomEtapa(true);
    setErroMsg('');
    setCurrentStep(2);
  };

  const handleSelectEtapa = (etapa: PresetEtapa) => {
    setSelectedEtapa(etapa);
    setIsCustomEtapa(false);
    setTarefasSelecionadas(
      etapa.tarefas.map((t) => ({
        id: t.id,
        nome: t.nome,
        checked: true,
      }))
    );
    setErroMsg('');
    setCurrentStep(3);
  };

  const handleIniciarEtapaCustom = () => {
    if (!customEtapaNome.trim()) {
      setErroMsg('Digite o nome da etapa para prosseguir.');
      return;
    }
    setIsCustomEtapa(true);
    setSelectedEtapa(null);
    if (tarefasSelecionadas.length === 0) {
      setTarefasSelecionadas([]);
    }
    setErroMsg('');
    setCurrentStep(3);
  };

  const toggleTarefa = (index: number) => {
    setTarefasSelecionadas((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleAdicionarTarefaCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTarefaTexto.trim()) return;

    setTarefasSelecionadas((prev) => [
      ...prev,
      {
        id: generateUUID(),
        nome: novaTarefaTexto.trim(),
        checked: true,
      },
    ]);
    setNovaTarefaTexto('');
  };

  const handleRemoverTarefa = (index: number) => {
    setTarefasSelecionadas((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleToggleTodas = (marcar: boolean) => {
    setTarefasSelecionadas((prev) => prev.map((t) => ({ ...t, checked: marcar })));
  };

  const handleConcluir = () => {
    const nomeFinal = isCustomEtapa ? customEtapaNome.trim() : (selectedEtapa?.nome || customEtapaNome.trim());
    if (!nomeFinal) {
      setErroMsg('Informe o nome da etapa.');
      return;
    }

    const tarefasFinais = tarefasSelecionadas
      .filter((t) => t.checked)
      .map((t) => ({ nome: t.nome }));

    if (tarefasFinais.length === 0) {
      setErroMsg('Selecione ou adicione ao menos um serviço.');
      return;
    }

    onAddEtapa(
      {
        nome: nomeFinal,
        tarefas: tarefasFinais,
        tipoOrigem: isTipoPersonalizado
          ? 'Personalizada'
          : selectedTipo?.nome || 'Geral',
      },
      insertAtIndex
    );

    // Reset
    setCurrentStep(1);
    setSelectedEtapa(null);
    setCustomEtapaNome('');
    setTarefasSelecionadas([]);
    setErroMsg('');
    onClose();
  };

  const etapaNomeDisplay = isCustomEtapa ? customEtapaNome : (selectedEtapa?.nome || 'Etapa');
  const qtdMarcadas = tarefasSelecionadas.filter((t) => t.checked).length;
  const todasMarcadas = tarefasSelecionadas.length > 0 && qtdMarcadas === tarefasSelecionadas.length;

  const tituloPasso =
    currentStep === 1 ? 'Tipo de obra' : currentStep === 2 ? 'Escolha da etapa' : null;
  const iconCfgPasso3 = currentStep === 3 ? getEtapaIcon(etapaNomeDisplay) : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Nova etapa">
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <span className="wizard-step-label">Passo {currentStep} de 3</span>
            <h2 className="modal-title wizard-title">
              {tituloPasso}
              {iconCfgPasso3 && (
                <>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-xs)',
                      background: iconCfgPasso3.bg,
                      color: iconCfgPasso3.color,
                      flexShrink: 0,
                    }}
                  >
                    <iconCfgPasso3.Icon size={17} weight="bold" />
                  </span>
                  <span style={{ overflowWrap: 'anywhere' }}>{etapaNomeDisplay}</span>
                </>
              )}
            </h2>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar" aria-label="Fechar" type="button">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="wizard-progress">
          <div style={{ width: `${(currentStep / 3) * 100}%` }} />
        </div>

        <div className="modal-body">
          {erroMsg && (
            <div className="modal-error" role="alert">
              <span>{erroMsg}</span>
            </div>
          )}

          {/* PASSO 1: TIPO DE OBRA (escolher já avança) */}
          {currentStep === 1 && (
            <div className="wizard-list">
              {availableTemplates.map((tipo, idx) => (
                <button
                  key={tipo.id}
                  type="button"
                  className="wizard-option"
                  onClick={() => handleSelectTipo(tipo)}
                >
                  <span
                    className="wizard-option-icon"
                    style={{
                      background: 'var(--dark-coffee-100)',
                      color: idx % 2 === 0 ? 'var(--cinnamon-wood-600)' : 'var(--coral-glow-600)',
                    }}
                  >
                    {idx % 2 === 0 ? <Buildings size={20} weight="duotone" /> : <PaintBrushHousehold size={20} weight="duotone" />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="wizard-option-name" style={{ display: 'block' }}>{tipo.nome}</span>
                    <span className="wizard-option-sub">
                      {tipo.etapas.length} {tipo.etapas.length === 1 ? 'etapa' : 'etapas'}
                    </span>
                  </span>
                  <ArrowRight size={16} weight="bold" color="var(--mauve-bark-400)" />
                </button>
              ))}

              <button type="button" className="wizard-option" onClick={handleSelectTipoCustom}>
                <span className="wizard-option-icon" style={{ background: 'var(--dark-coffee-100)', color: 'var(--pitch-black-500)' }}>
                  <Sparkle size={20} weight="duotone" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="wizard-option-name" style={{ display: 'block' }}>Personalizado</span>
                  <span className="wizard-option-sub">Crie uma etapa do zero</span>
                </span>
                <ArrowRight size={16} weight="bold" color="var(--mauve-bark-400)" />
              </button>
            </div>
          )}

          {/* PASSO 2: ETAPA DO CATÁLOGO OU NOME PRÓPRIO */}
          {currentStep === 2 && (
            <div>
              {!isTipoPersonalizado && selectedTipo && (
                <div className="wizard-list">
                  {selectedTipo.etapas.map((etp) => {
                    const iconCfg = getEtapaIcon(etp.nome, etp.id);
                    const StepIcon = iconCfg.Icon;
                    return (
                      <button key={etp.id} type="button" className="wizard-option" onClick={() => handleSelectEtapa(etp)}>
                        <span className="wizard-option-icon" style={{ background: iconCfg.bg, color: iconCfg.color }}>
                          <StepIcon size={19} weight="bold" />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="wizard-option-name" style={{ display: 'block' }}>{etp.nome}</span>
                          <span className="wizard-option-sub">{etp.tarefas.length} serviços sugeridos</span>
                        </span>
                        <ArrowRight size={16} weight="bold" color="var(--mauve-bark-400)" />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="wizard-custom" style={isTipoPersonalizado ? { borderTop: 'none', marginTop: 0, paddingTop: 0 } : undefined}>
                <label className="form-label" htmlFor="wizard-etapa-nome">
                  {isTipoPersonalizado ? 'Nome da etapa' : 'Ou crie outra etapa'}
                </label>
                <input
                  id="wizard-etapa-nome"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Paisagismo"
                  value={customEtapaNome}
                  onChange={(e) => {
                    setCustomEtapaNome(e.target.value);
                    setIsCustomEtapa(true);
                    setSelectedEtapa(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleIniciarEtapaCustom();
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* PASSO 3: SERVIÇOS */}
          {currentStep === 3 && (
            <div>
              <div className="wizard-bar">
                <span>
                  {qtdMarcadas} de {tarefasSelecionadas.length} selecionados
                </span>
                <button type="button" onClick={() => handleToggleTodas(!todasMarcadas)}>
                  {todasMarcadas ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              </div>

              <div className="wizard-tasks">
                {tarefasSelecionadas.length === 0 ? (
                  <EmptyState icon={ListChecks} className="empty-state--nested" title="Nenhum serviço adicionado." hint="Adicione os serviços abaixo." />
                ) : (
                  tarefasSelecionadas.map((item, index) => (
                    <div key={item.id} className="wizard-task">
                      <label>
                        <input
                          type="checkbox"
                          className="task-checkbox"
                          checked={item.checked}
                          onChange={() => toggleTarefa(index)}
                        />
                        <span style={{ color: item.checked ? 'var(--text-main)' : 'var(--text-muted)', overflowWrap: 'anywhere' }}>
                          {item.nome}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemoverTarefa(index)}
                        className="btn-icon touch-target-44"
                        style={{ border: 'none', background: 'transparent' }}
                        aria-label={`Remover ${item.nome}`}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAdicionarTarefaCustom} className="wizard-add">
                <input
                  type="text"
                  className="form-input"
                  aria-label="Adicionar outro serviço"
                  placeholder="Adicionar outro serviço"
                  value={novaTarefaTexto}
                  onChange={(e) => setNovaTarefaTexto(e.target.value)}
                />
                <button type="submit" className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                  <Plus size={16} weight="bold" />
                  <span>Incluir</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Rodapé: um único botão primário por passo (no passo 1 a própria escolha avança) */}
        {currentStep > 1 && (
          <div className="modal-footer">
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2)}
              className="btn-secondary"
            >
              <ArrowLeft size={16} weight="bold" />
              <span>Voltar</span>
            </button>

            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => {
                  if (selectedEtapa && !isCustomEtapa) {
                    setCurrentStep(3);
                    return;
                  }
                  if (!customEtapaNome.trim()) {
                    setErroMsg('Escolha uma etapa da lista ou digite o nome de uma nova.');
                    return;
                  }
                  handleIniciarEtapaCustom();
                }}
                className="btn-primary"
              >
                <span>Avançar</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            )}

            {currentStep === 3 && (
              <button type="button" onClick={handleConcluir} className="btn-primary">
                <Check size={16} weight="bold" />
                <span>Criar etapa ({qtdMarcadas})</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
