import React, { useState, useRef, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, WarningCircle, CircleNotch } from '@phosphor-icons/react';
import { Obra } from '../types/obra';
import { generateUUID } from '../utils/uuid';
import { useFileIntake } from '../utils/useFileIntake';
import { storeNormalized, buildStoragePath } from '../utils/fileIntake';
import { UploadArquivos } from './UploadArquivos';
import '../styles/registros-modelos.css';

export interface NovaNotaData {
  obraId: string;
  fotos: string[];
  titulo?: string;
  observacoes?: string;
}

interface ModalRegistroNotaProps {
  isOpen: boolean;
  onClose: () => void;
  obras: Obra[];
  preselectedObraId?: string;
  onSave: (dados: NovaNotaData) => void;
}

export const ModalRegistroNota: React.FC<ModalRegistroNotaProps> = ({
  isOpen,
  onClose,
  obras,
  preselectedObraId,
  onSave,
}) => {
  const [obraId, setObraId] = useState<string>(preselectedObraId || '');
  const [titulo, setTitulo] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const {
    items: fotos,
    handleInputChange: handleFilesChange,
    remove: handleRemoveFoto,
    clear: clearFotos,
  } = useFileIntake(setErro);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar apenas quando o modal for aberto (evita limpar o formulário se obras atualizar em segundo plano)
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setObraId(preselectedObraId || (obras.length === 1 ? obras[0].id : ''));
      setTitulo('');
      setObservacoes('');
      clearFotos();
      setErro('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, preselectedObraId]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!obraId) {
      setErro('Selecione uma obra.');
      return;
    }

    if (fotos.length === 0) {
      setErro('Faça o upload de pelo menos uma foto ou documento PDF da nota/recibo.');
      return;
    }

    setIsSaving(true);
    try {
      const notaId = generateUUID();
      const urlsUpload: string[] = [];

      // Envia os arquivos binários diretamente para o Supabase Storage (sem base64)
      for (let i = 0; i < fotos.length; i++) {
        const item = fotos[i];
        urlsUpload.push(
          await storeNormalized(item, {
            bucket: 'registro-notas',
            path: buildStoragePath(`${obraId}/notas/${notaId}_${i}`, item),
          })
        );
      }

      clearFotos();

      onSave({
        obraId,
        fotos: urlsUpload,
        titulo: titulo.trim() ? titulo.trim() : undefined,
        observacoes: observacoes.trim() ? observacoes.trim() : undefined,
      });

      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar a nota fiscal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card rg-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-nota-title"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="modal-nota-title">
            Registrar nota
          </h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Fechar">
            <X size={20} aria-hidden="true" />
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
              <label className="form-label" htmlFor="nota-obra">
                Obra
              </label>
              <select
                id="nota-obra"
                className="form-input"
                value={obraId}
                onChange={(e) => {
                  setObraId(e.target.value);
                  if (erro) setErro('');
                }}
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

            <div className="rg-field">
              <span className="form-label">Foto ou PDF da nota</span>
              <UploadArquivos
                arquivos={fotos}
                onRemove={handleRemoveFoto}
                onPickFotos={() => fileInputRef.current?.click()}
                onPickPdf={() => pdfInputRef.current?.click()}
                altPrefix="Nota"
              />
              {/* Input unificado para fotos (câmera ou galeria do dispositivo) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFilesChange}
              />
              {/* Input exclusivo para seleção de arquivos PDF */}
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                style={{ display: 'none' }}
                onChange={handleFilesChange}
              />
            </div>

            <div className="rg-field">
              <label className="form-label" htmlFor="nota-titulo">
                Título <span className="rg-optional">(opcional)</span>
              </label>
              <input
                id="nota-titulo"
                type="text"
                className="form-input"
                placeholder="Ex.: NF 4589 - Tintas"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="rg-field">
              <label className="form-label" htmlFor="nota-obs">
                Observações <span className="rg-optional">(opcional)</span>
              </label>
              <textarea
                id="nota-obs"
                className="form-input"
                rows={2}
                placeholder="Fornecedor, forma de pagamento..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? (
                <>
                  <CircleNotch size={16} className="spin-animate" weight="bold" aria-hidden="true" />
                  <span>Enviando arquivos...</span>
                </>
              ) : (
                <span>Salvar nota</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
