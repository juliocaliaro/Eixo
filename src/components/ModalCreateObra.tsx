import React, { useState, useRef } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  BuildingApartment,
  User,
  MapPin,
  CalendarBlank,
  WarningCircle,
  Plus,
} from '@phosphor-icons/react';
import { DatePickerInput } from './DatePickerInput';

interface ModalCreateObraProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nome: string;
    cliente: string;
    endereco: string;
    dataPrevista: string;
  }) => void;
}

export const ModalCreateObra: React.FC<ModalCreateObraProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [erro, setErro] = useState('');

  // Guarda temporal para evitar que duplo toque ou click residual no celular submeta o passo 3 acidentalmente
  const step3EnteredAtRef = useRef<number>(0);

  if (!isOpen) return null;

  const handleNextFrom1 = () => {
    if (!nome.trim()) {
      setErro('Informe o nome da obra para continuar.');
      return;
    }
    setErro('');
    setStep(2);
  };

  const handleNextFrom2 = () => {
    if (!cliente.trim()) {
      setErro('Informe o nome do cliente para continuar.');
      return;
    }
    setErro('');
    step3EnteredAtRef.current = Date.now();
    setStep(3);
  };

  // Data mínima permitida: apenas datas futuras (a partir de amanhã)
  const getMinDateStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const minDate = getMinDateStr();

  const handleFinalSubmit = () => {
    if (step !== 3) return;

    // Se a transição para o passo 3 ocorreu há menos de 250ms, ignora clique residual de touch
    if (Date.now() - step3EnteredAtRef.current < 250) {
      return;
    }

    if (!nome.trim()) {
      setStep(1);
      setErro('Informe o nome da obra.');
      return;
    }
    if (!cliente.trim()) {
      setStep(2);
      setErro('Informe o nome do cliente.');
      return;
    }
    if (dataPrevista && dataPrevista < minDate) {
      setErro('A data prevista deve ser uma data futura (a partir de amanhã).');
      return;
    }

    onSubmit({
      nome: nome.trim(),
      cliente: cliente.trim(),
      endereco: endereco.trim() || 'Endereço não informado',
      dataPrevista: dataPrevista || '',
    });

    // Reset de estado
    setNome('');
    setCliente('');
    setEndereco('');
    setDataPrevista('');
    setStep(1);
    setErro('');
  };

  const handleClose = () => {
    setStep(1);
    setErro('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Cabeçalho com indicador de etapas */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'var(--dark-coffee-100)',
                color: 'var(--dark-coffee-800)',
                padding: 7,
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {step === 1 && <BuildingApartment size={20} weight="fill" />}
              {step === 2 && <User size={20} weight="fill" />}
              {step === 3 && <MapPin size={20} weight="fill" />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--primary-accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  Etapa {step} de 3
                </span>
                <span style={{ color: 'var(--border-hairline)', fontSize: '0.78rem' }}>•</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {step === 1 && 'Identificação'}
                  {step === 2 && 'Cliente'}
                  {step === 3 && 'Endereço & Prazo'}
                </span>
              </div>
              <h2 className="modal-title" style={{ fontSize: '1.12rem', marginTop: 2 }}>
                {step === 1 && 'Nome da Obra'}
                {step === 2 && 'Cliente da Obra'}
                {step === 3 && 'Localização e Previsão'}
              </h2>
            </div>
          </div>
          <button onClick={handleClose} className="btn-icon" title="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Linha de Progresso Visual do Wizard */}
        <div style={{ height: 3, background: 'var(--dark-coffee-100)', width: '100%' }}>
          <div
            style={{
              height: '100%',
              background: 'var(--primary-accent)',
              width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%',
              transition: 'width 0.28s ease',
            }}
          />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 1) handleNextFrom1();
            else if (step === 2) handleNextFrom2();
            else handleFinalSubmit();
          }}
        >
          <div className="modal-body" style={{ padding: '24px' }}>
            {erro && (
              <div
                style={{
                  background: 'var(--coral-glow-50)',
                  border: '1px solid var(--coral-glow-300)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  color: 'var(--coral-glow-700)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <WarningCircle size={18} weight="bold" />
                <span>{erro}</span>
              </div>
            )}

            {/* ETAPA 1: Nome da Obra */}
            {step === 1 && (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 18 }}>
                  Identificação principal do projeto utilizada pela sua equipe.
                </p>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <BuildingApartment size={18} color="var(--primary-accent)" weight="bold" />
                      Nome da Obra *
                    </span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Reforma Apto 402, Residência Alphaville..."
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      if (erro) setErro('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNextFrom1();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* ETAPA 2: Nome do Cliente */}
            {step === 2 && (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 18 }}>
                  Pessoa ou empresa proprietária para acompanhamento e aprovação de decisões.
                </p>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <User size={18} color="var(--primary-accent)" weight="bold" />
                      Nome do Cliente *
                    </span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Dra. Carolina Mendes, Carlos Eduardo..."
                    value={cliente}
                    onChange={(e) => {
                      setCliente(e.target.value);
                      if (erro) setErro('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNextFrom2();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* ETAPA 3: Endereço e Data Prevista */}
            {step === 3 && (
              <div>
                {/* Resumo compacto dos passos 1 e 2 */}
                <div
                  style={{
                    background: 'var(--dark-coffee-50)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    marginBottom: 18,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px 16px',
                    fontSize: '0.83rem',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)' }}>
                    Obra: <strong style={{ color: 'var(--text-main)' }}>{nome}</strong>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    Cliente: <strong style={{ color: 'var(--text-main)' }}>{cliente}</strong>
                  </div>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Informe o local do canteiro e a previsão estimada para conclusão.
                </p>

                <div className="form-group">
                  <label className="form-label">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={18} color="var(--primary-accent)" weight="bold" />
                      Endereço da Obra
                    </span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Alameda Santos, 1820 - Apto 402"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    autoFocus
                  />
                </div>

                <DatePickerInput
                  value={dataPrevista}
                  onChange={(val) => {
                    setDataPrevista(val);
                    if (erro) setErro('');
                  }}
                  minDate={minDate}
                  label="Data Prevista de Conclusão"
                  helperText="Permitido apenas datas futuras (a partir de amanhã)."
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setErro('');
                  setStep((prev) => (prev - 1) as 1 | 2);
                }}
                className="btn-secondary"
              >
                <ArrowLeft size={16} weight="bold" />
                <span>Voltar</span>
              </button>
            ) : (
              <button type="button" onClick={handleClose} className="btn-secondary">
                Cancelar
              </button>
            )}

            {step === 1 && (
              <button
                key="btn-step-1"
                type="button"
                onClick={handleNextFrom1}
                className="btn-primary"
              >
                <span>Avançar</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            )}

            {step === 2 && (
              <button
                key="btn-step-2"
                type="button"
                onClick={handleNextFrom2}
                className="btn-primary"
              >
                <span>Avançar</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            )}

            {step === 3 && (
              <button
                key="btn-step-3"
                type="button"
                onClick={handleFinalSubmit}
                className="btn-primary"
              >
                <Plus size={16} weight="bold" />
                <span>Criar Obra</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
