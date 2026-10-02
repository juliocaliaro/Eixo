import React, { useState, useEffect } from 'react';
import { X, FloppyDisk, BuildingApartment, User, MapPin, WarningCircle, CurrencyDollar } from '@phosphor-icons/react';
import { Obra } from '../types/obra';
import { DatePickerInput } from './DatePickerInput';
import { parseMoedaBR, mascararMoedaInput, proibirNaoNumericosMoeda } from '../utils/moeda';

interface ModalEditObraProps {
  isOpen: boolean;
  obra: Obra | null;
  onClose: () => void;
  onSave: (updatedData: {
    nome: string;
    cliente: string;
    endereco: string;
    dataPrevista: string;
    empresaResponsavel?: string;
    orcamentoInicial?: number;
  }) => void;
}

export const ModalEditObra: React.FC<ModalEditObraProps> = ({
  isOpen,
  obra,
  onClose,
  onSave,
}) => {
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [orcamentoInicial, setOrcamentoInicial] = useState<string>('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (obra) {
      setNome(obra.nome);
      setCliente(obra.cliente);
      setEndereco(obra.endereco);
      setDataPrevista(obra.dataPrevista || '');
      setOrcamentoInicial(obra.orcamentoInicial !== undefined ? mascararMoedaInput(obra.orcamentoInicial) : '');
      setErro('');
    }
  }, [obra, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !obra) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('O nome da obra não pode ficar vazio.');
      return;
    }
    if (!cliente.trim()) {
      setErro('O nome do cliente não pode ficar vazio.');
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

    onSave({
      nome: nome.trim(),
      empresaResponsavel: obra.empresaResponsavel,
      cliente: cliente.trim(),
      endereco: endereco.trim() || 'Endereço não informado',
      dataPrevista: dataPrevista || obra.dataPrevista,
      orcamentoInicial: valorNumerico,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'var(--dark-coffee-100)', color: 'var(--dark-coffee-800)', padding: 8, borderRadius: 10 }}>
              <BuildingApartment size={24} weight="fill" />
            </div>
            <div>
              <h2 className="modal-title">Editar Dados da Obra</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Atualize as informações principais da obra
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar">
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {erro && (
              <div
                style={{
                  background: 'var(--coral-glow-50)',
                  border: '1.5px solid var(--coral-glow-400)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: 'var(--coral-glow-700)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <WarningCircle size={17} weight="bold" />
                  <span>{erro}</span>
                </div>
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
                className="form-input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <User size={18} color="var(--primary-accent)" weight="bold" />
                  Cliente *
                </span>
              </label>
              <input
                type="text"
                className="form-input"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
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
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CurrencyDollar size={18} color="var(--primary-accent)" weight="bold" />
                  Valor Contratado Inicial (R$)
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
                Base financeira para cálculo automático dos aditivos contratuais aprovados.
              </span>
            </div>

            <DatePickerInput
              value={dataPrevista}
              onChange={(val) => setDataPrevista(val)}
              label="Data Prevista de Término"
              helperText="Você pode digitar a data (DD/MM/AAAA) ou escolher pelo calendário."
              autoScrollOnMobile
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              <FloppyDisk size={18} weight="bold" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
