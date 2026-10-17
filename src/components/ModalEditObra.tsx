import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, WarningCircle, CircleNotch } from '@phosphor-icons/react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEscapeKey(onClose, isOpen);

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

    setIsSubmitting(true);
    try {
      onSave({
        nome: nome.trim(),
        empresaResponsavel: obra.empresaResponsavel,
        cliente: cliente.trim(),
        endereco: endereco.trim() || 'Endereço não informado',
        dataPrevista: dataPrevista || obra.dataPrevista,
        orcamentoInicial: valorNumerico,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card obra-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-obra-title"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="editar-obra-title">
            Editar obra
          </h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Fechar" title="Fechar (Esc)">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {erro && (
              <div className="form-error" role="alert">
                <WarningCircle size={18} weight="bold" />
                <span>{erro}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="editar-obra-nome">
                Nome da obra
              </label>
              <input
                id="editar-obra-nome"
                type="text"
                className="form-input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="editar-obra-cliente">
                Cliente
              </label>
              <input
                id="editar-obra-cliente"
                type="text"
                className="form-input"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="field-head">
                <label className="form-label" htmlFor="editar-obra-endereco">
                  Endereço
                </label>
                <span className="field-optional">Opcional</span>
              </div>
              <input
                id="editar-obra-endereco"
                type="text"
                className="form-input"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="field-head">
                <label className="form-label" htmlFor="editar-obra-valor">
                  Valor contratado
                </label>
                <span className="field-optional">Opcional</span>
              </div>
              <input
                id="editar-obra-valor"
                type="text"
                inputMode="numeric"
                className="form-input"
                placeholder="R$ 0,00"
                value={orcamentoInicial}
                onChange={(e) => setOrcamentoInicial(mascararMoedaInput(e.target.value))}
                onKeyDown={proibirNaoNumericosMoeda}
              />
            </div>

            <DatePickerInput
              value={dataPrevista}
              onChange={(val) => setDataPrevista(val)}
              label="Previsão de término"
              helperText=""
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary sheet-cancel">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} className="spin-animate" weight="bold" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
