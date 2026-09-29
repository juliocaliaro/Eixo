import React, { useState, useEffect } from 'react';
import {
  X,
  BuildingApartment,
  User,
  MapPin,
  WarningCircle,
  Plus,
  CurrencyDollar,
} from '@phosphor-icons/react';
import { DatePickerInput } from './DatePickerInput';
import { parseMoedaBR, mascararMoedaInput, proibirNaoNumericosMoeda } from '../utils/moeda';

interface ModalCreateObraProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nome: string;
    cliente: string;
    endereco: string;
    dataPrevista: string;
    empresaResponsavel?: string;
    orcamentoInicial?: number;
  }) => void;
}

export const ModalCreateObra: React.FC<ModalCreateObraProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [orcamentoInicial, setOrcamentoInicial] = useState('');
  const [erro, setErro] = useState('');

  // Fechar com tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Data mínima permitida: hoje em diante
  const getTodayDateStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const minDate = getTodayDateStr();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      setErro('Informe o nome da obra para continuar.');
      return;
    }
    if (!cliente.trim()) {
      setErro('Informe o nome do cliente para continuar.');
      return;
    }
    if (dataPrevista && dataPrevista < minDate) {
      setErro('A data prevista não pode ser anterior à data de hoje.');
      return;
    }

    const valorNumerico = parseMoedaBR(orcamentoInicial);
    if (orcamentoInicial.trim() && valorNumerico === undefined) {
      setErro('Valor do orçamento inválido. Use formato numérico (ex: 185.000,00).');
      return;
    }
    if (valorNumerico !== undefined && valorNumerico < 0) {
      setErro('O valor do orçamento não pode ser negativo.');
      return;
    }

    const savedEmpresa =
      typeof window !== 'undefined'
        ? localStorage.getItem('eixo_empresa_cadastrada') || undefined
        : undefined;

    onSubmit({
      nome: nome.trim(),
      cliente: cliente.trim(),
      endereco: endereco.trim() || 'Endereço não informado',
      dataPrevista: dataPrevista || '',
      empresaResponsavel: savedEmpresa,
      orcamentoInicial: valorNumerico,
    });

    handleClose();
  };

  const handleClose = () => {
    setNome('');
    setCliente('');
    setEndereco('');
    setDataPrevista('');
    setOrcamentoInicial('');
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
        aria-modal="true"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'var(--dark-coffee-100)',
                color: 'var(--dark-coffee-800)',
                padding: 8,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BuildingApartment size={22} weight="fill" />
            </div>
            <div>
              <h2 className="modal-title">Nova Obra</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Cadastre as informações principais para iniciar o acompanhamento
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="btn-icon" title="Fechar (Esc)">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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

            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <BuildingApartment size={18} color="var(--primary-accent)" weight="bold" />
                  Nome da Obra *
                </span>
              </label>
              <input
                type="text"
                autoFocus
                className="form-input"
                placeholder="Ex: Reforma Apto 402, Residência Alphaville..."
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (erro) setErro('');
                }}
              />
            </div>

            <div className="form-group">
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
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={18} color="var(--primary-accent)" weight="bold" />
                  Endereço
                </span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Alameda Santos, 1820 - Apto 402"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CurrencyDollar size={18} color="var(--primary-accent)" weight="bold" />
                  Valor Contratado Inicial (R$ - Opcional)
                </span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="form-input"
                placeholder="0,00"
                value={orcamentoInicial}
                onChange={(e) => setOrcamentoInicial(mascararMoedaInput(e.target.value))}
                onKeyDown={proibirNaoNumericosMoeda}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Base financeira para cálculo automático dos aditivos e supressivos aprovados.
              </span>
            </div>

            <DatePickerInput
              value={dataPrevista}
              onChange={(val) => {
                setDataPrevista(val);
                if (erro) setErro('');
              }}
              minDate={minDate}
              label="Data Prevista de Conclusão"
              helperText="Informe a previsão de conclusão estimada da obra."
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <Plus size={16} weight="bold" />
              <span>Criar Obra</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
