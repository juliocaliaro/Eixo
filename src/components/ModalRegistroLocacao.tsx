import React, { useState, useRef, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, WarningCircle, CircleNotch } from '@phosphor-icons/react';
import { Obra, TipoPeriodoLocacao } from '../types/obra';
import { generateUUID } from '../utils/uuid';
import { useFileIntake } from '../utils/useFileIntake';
import { storeNormalized, buildStoragePath } from '../utils/fileIntake';
import { hojeLocal, calcularVencimentoPeriodo } from '../utils/locacao';
import { formatarDataBR } from '../utils/data';
import { UploadArquivos } from './UploadArquivos';
import '../styles/registros-modelos.css';

export interface NovaLocacaoData {
  id?: string;
  obraId: string;
  itemLocado: string;
  quantidade?: number;
  periodo: TipoPeriodoLocacao;
  dataVencimento: string;
  fotos: string[];
  fornecedor?: string;
}

interface ModalRegistroLocacaoProps {
  isOpen: boolean;
  onClose: () => void;
  obras: Obra[];
  preselectedObraId?: string;
  onSave: (dados: NovaLocacaoData) => Promise<void> | void;
}

export const ModalRegistroLocacao: React.FC<ModalRegistroLocacaoProps> = ({
  isOpen,
  onClose,
  obras,
  preselectedObraId,
  onSave,
}) => {
  const [obraId, setObraId] = useState<string>(preselectedObraId || '');
  const [itemLocado, setItemLocado] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [fornecedor, setFornecedor] = useState<string>('');
  const [periodo, setPeriodo] = useState<TipoPeriodoLocacao | ''>('');
  const [erro, setErro] = useState<string>('');
  const {
    items: fotos,
    isProcessing: isProcessingPhotos,
    handleInputChange: handleFilesChange,
    remove: handleRemoveFoto,
    clear: clearFotos,
  } = useFileIntake(setErro);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar apenas quando o modal for aberto
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setObraId(preselectedObraId || (obras.length === 1 ? obras[0].id : ''));
      setItemLocado('');
      setQuantidade('');
      setFornecedor('');
      setPeriodo('');
      clearFotos();
      setErro('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, preselectedObraId]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!obraId.trim()) {
      setErro('Selecione a obra vinculada a esta locação.');
      return;
    }

    if (!itemLocado.trim()) {
      setErro('Informe o que foi locado (ex: Betoneira, Andaime, Gerador...).');
      return;
    }

    if (!periodo) {
      setErro('Selecione o período da locação (Diária, Semanal, Quinzenal ou Mensal).');
      return;
    }

    const dataVencimento = calcularVencimentoPeriodo(periodo, hojeLocal());

    setIsSaving(true);
    setErro('');
    try {
      const locacaoId = generateUUID();
      const urlsUpload: string[] = [];

      // Faz upload de cada foto/PDF diretamente para o Supabase Storage antes de salvar
      for (let i = 0; i < fotos.length; i++) {
        const item = fotos[i];
        const path = buildStoragePath(`${obraId}/locacoes/${locacaoId}_${i}`, item);
        urlsUpload.push(
          await storeNormalized(item, {
            bucket: 'registro-notas',
            path,
            fallbackBuckets: ['evidencias-diario'],
          })
        );
      }

      await onSave({
        id: locacaoId,
        obraId,
        itemLocado: itemLocado.trim(),
        quantidade: quantidade ? Number(quantidade) : undefined,
        periodo,
        dataVencimento,
        fotos: urlsUpload,
        fornecedor: fornecedor.trim() || undefined,
      });

      clearFotos();
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar locação. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const vencimentoPrevisto = periodo ? calcularVencimentoPeriodo(periodo, hojeLocal()) : '';

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-locacao-title"
    >
      <div className="modal-card rg-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="modal-locacao-title">
            Nova locação
          </h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Fechar">
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body rg-sheet-body">
            {erro && (
              <div className="rg-error" role="alert">
                <WarningCircle size={18} weight="fill" aria-hidden="true" />
                <span>{erro}</span>
              </div>
            )}

            <div className="rg-field">
              <label className="form-label" htmlFor="locacao-obra">
                Obra
              </label>
              <select
                id="locacao-obra"
                value={obraId}
                onChange={(e) => {
                  setObraId(e.target.value);
                  setErro('');
                }}
                className="form-input"
                required
              >
                <option value="">Selecione a obra</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome} {o.cliente ? `(${o.cliente})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="rg-field-row rg-field-row--qty">
              <div className="rg-field">
                <label className="form-label" htmlFor="locacao-item">
                  O que foi locado?
                </label>
                <input
                  id="locacao-item"
                  type="text"
                  value={itemLocado}
                  onChange={(e) => {
                    setItemLocado(e.target.value);
                    setErro('');
                  }}
                  placeholder="Ex.: Betoneira"
                  className="form-input"
                  required
                />
              </div>

              <div className="rg-field">
                <label className="form-label" htmlFor="locacao-quantidade">
                  Qtd.
                </label>
                <input
                  id="locacao-quantidade"
                  name="quantidade"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={quantidade}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setQuantidade('');
                    } else {
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num > 0) {
                        setQuantidade(num);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="1"
                  className="form-input rg-input-qty"
                />
              </div>
            </div>

            <div className="rg-field-row">
              <div className="rg-field">
                <label className="form-label" htmlFor="locacao-fornecedor">
                  Fornecedor <span className="rg-optional">(opcional)</span>
                </label>
                <input
                  id="locacao-fornecedor"
                  type="text"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  placeholder="Ex.: LocaMais"
                  className="form-input"
                />
              </div>

              <div className="rg-field">
                <label className="form-label" htmlFor="locacao-periodo">
                  Período
                </label>
                <select
                  id="locacao-periodo"
                  value={periodo}
                  onChange={(e) => {
                    setPeriodo(e.target.value as TipoPeriodoLocacao);
                    setErro('');
                  }}
                  className="form-input"
                  required
                >
                  <option value="">Selecione o período</option>
                  <option value="diaria">Diária</option>
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                </select>
                {vencimentoPrevisto && <span className="form-hint">Vence em {formatarDataBR(vencimentoPrevisto)}</span>}
              </div>
            </div>

            <div className="rg-field">
              <span className="form-label">
                Foto ou PDF <span className="rg-optional">(opcional)</span>
              </span>
              <UploadArquivos
                arquivos={fotos}
                onRemove={handleRemoveFoto}
                onPickFotos={() => fileInputRef.current?.click()}
                onPickPdf={() => pdfInputRef.current?.click()}
                altPrefix="Foto da locação"
              />
              {/* Input unificado para fotos (câmera ou galeria do dispositivo) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                style={{ display: 'none' }}
              />
              {/* Input exclusivo para seleção de PDFs */}
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                onChange={handleFilesChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving || isProcessingPhotos}>
              {isSaving || isProcessingPhotos ? (
                <>
                  <CircleNotch size={18} className="spin-animate" weight="bold" aria-hidden="true" />
                  <span>{isProcessingPhotos ? 'Processando fotos...' : 'Salvando...'}</span>
                </>
              ) : (
                <span>Salvar locação</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
