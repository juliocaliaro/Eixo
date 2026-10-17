import React, { useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, WarningCircle, CircleNotch } from '@phosphor-icons/react';
import { DatePickerInput } from './DatePickerInput';
import { useSessionUser } from '../hooks/useSession';
import { EmailChipsInput } from './EmailChipsInput';
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
    emailsClientes?: string[];
  }) => void;
}

export const ModalCreateObra: React.FC<ModalCreateObraProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const sessionUser = useSessionUser();
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [orcamentoInicial, setOrcamentoInicial] = useState('');
  const [emailsClientes, setEmailsClientes] = useState<string[]>([]);
  const [erro, setErro] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEscapeKey(() => handleClose(), isOpen);

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

    // Empresa responsável vem do perfil da conta autenticada (banco de dados)
    const savedEmpresa = sessionUser?.empresa || undefined;

    setIsSubmitting(true);
    try {
      onSubmit({
        nome: nome.trim(),
        cliente: cliente.trim(),
        endereco: endereco.trim() || 'Endereço não informado',
        dataPrevista: dataPrevista || '',
        empresaResponsavel: savedEmpresa,
        orcamentoInicial: valorNumerico,
        emailsClientes: emailsClientes.length ? emailsClientes : undefined,
      });

      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNome('');
    setCliente('');
    setEndereco('');
    setDataPrevista('');
    setOrcamentoInicial('');
    setEmailsClientes([]);
    setErro('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-card obra-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nova-obra-title"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="nova-obra-title">
            Nova obra
          </h2>
          <button type="button" onClick={handleClose} className="btn-icon" aria-label="Fechar" title="Fechar (Esc)">
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
              <label className="form-label" htmlFor="nova-obra-nome">
                Nome da obra
              </label>
              <input
                id="nova-obra-nome"
                type="text"
                autoFocus
                className="form-input"
                placeholder="Ex: Reforma Apto 402"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (erro) setErro('');
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="nova-obra-cliente">
                Cliente
              </label>
              <input
                id="nova-obra-cliente"
                type="text"
                className="form-input"
                placeholder="Nome do cliente"
                value={cliente}
                onChange={(e) => {
                  setCliente(e.target.value);
                  if (erro) setErro('');
                }}
              />
            </div>

            <EmailChipsInput value={emailsClientes} onChange={setEmailsClientes} />

            <div className="form-group">
              <div className="field-head">
                <label className="form-label" htmlFor="nova-obra-endereco">
                  Endereço
                </label>
                <span className="field-optional">Opcional</span>
              </div>
              <input
                id="nova-obra-endereco"
                type="text"
                className="form-input"
                placeholder="Rua, número e complemento"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="field-head">
                <label className="form-label" htmlFor="nova-obra-valor">
                  Valor contratado
                </label>
                <span className="field-optional">Opcional</span>
              </div>
              <input
                id="nova-obra-valor"
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
              onChange={(val) => {
                setDataPrevista(val);
                if (erro) setErro('');
              }}
              minDate={minDate}
              label="Previsão de término"
              helperText=""
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={handleClose} className="btn-secondary sheet-cancel">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} className="spin-animate" weight="bold" />
                  <span>Criando...</span>
                </>
              ) : (
                <span>Criar obra</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
