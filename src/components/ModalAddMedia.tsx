import React, { useRef } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { Camera, X, Check, Plus } from '@phosphor-icons/react';
import { Tarefa, Etapa } from '../types/obra';
import { useFileIntake } from '../utils/useFileIntake';
import { blobToDataUrl } from '../utils/fileIntake';
// Ordem do CSS: index e foundation antes deste arquivo (App importa os componentes antes de main.tsx importar os CSS globais)
import '../index.css';
import '../styles/foundation.css';
import '../styles/decisoes-diario.css';

export interface ModalAddMediaData {
  fotoBase64?: string;
  fotosBase64?: string[];
  anotacao?: string;
}

interface ModalAddMediaProps {
  isOpen: boolean;
  tarefa: Tarefa | null;
  etapa: Etapa | null;
  onClose: () => void;
  onSaveMedia: (data: ModalAddMediaData) => void;
}

/**
 * Aparece ao concluir um serviço: comprovação opcional (fotos e/ou observação).
 * Sheet no mobile: corpo único rolável + rodapé fixo (primário "Salvar registro" ou "Concluir").
 */
export const ModalAddMedia: React.FC<ModalAddMediaProps> = ({
  isOpen,
  tarefa,
  etapa,
  onClose,
  onSaveMedia,
}) => {
  const [anotacao, setAnotacao] = React.useState('');
  const { items: fotoItems, handleInputChange: handleFilesChange, remove: handleRemoveFoto, clear: clearFotos } = useFileIntake();
  const fotosPreview = fotoItems.map((f) => f.previewUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(onClose, isOpen);

  if (!isOpen || !tarefa) return null;

  const hasContent = Boolean(fotosPreview.length > 0 || anotacao.trim());

  const handleSalvar = async () => {
    // Fotos já comprimidas pela política única de entrada; contrato legado recebe data URLs
    const fotosDataUrl = await Promise.all(fotoItems.map((f) => blobToDataUrl(f.blob)));
    onSaveMedia({
      fotosBase64: fotosDataUrl.length > 0 ? fotosDataUrl : undefined,
      fotoBase64: fotosDataUrl.length > 0 ? fotosDataUrl[0] : undefined,
      anotacao: anotacao.trim() || undefined,
    });
    setAnotacao('');
    clearFotos();
    onClose();
  };

  const handleFecharSemSalvar = () => {
    setAnotacao('');
    clearFotos();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleFecharSemSalvar}>
      <div className="modal-card media-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="media-modal-title">
        <div className="modal-header">
          <div className="media-head">
            <span className="media-head-icon" aria-hidden="true">
              <Check size={16} weight="bold" />
            </span>
            <div className="media-head-text">
              <h2 id="media-modal-title" className="modal-title">{tarefa.nome}</h2>
              {etapa?.nome && <div className="media-head-sub">{etapa.nome}</div>}
            </div>
          </div>
          <button type="button" onClick={handleFecharSemSalvar} className="btn-icon" title="Fechar" aria-label="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="modal-body">
          <p className="media-intro">Serviço concluído. Quer anexar uma comprovação?</p>

          <div className="dec-field">
            <span className="form-label">Fotos</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              style={{ display: 'none' }}
            />
            {fotoItems.length > 0 ? (
              <div className="media-thumbs">
                {fotoItems.map((item, idx) => (
                  <div key={idx} className="media-thumb">
                    <img
                      src={item.previewUrl}
                      alt={`Foto ${idx + 1}`}
                      loading="eager"
                      decoding="sync"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallback === '1') return;
                        img.dataset.fallback = '1';
                        void blobToDataUrl(item.blob).then((url) => {
                          img.src = url;
                        });
                      }}
                    />
                    <button
                      type="button"
                      className="media-thumb-remove"
                      onClick={() => handleRemoveFoto(idx)}
                      aria-label={`Remover foto ${idx + 1}`}
                    >
                      <span><X size={12} weight="bold" /></span>
                    </button>
                  </div>
                ))}
                <button type="button" className="media-add" onClick={() => fileInputRef.current?.click()} aria-label="Adicionar mais fotos">
                  <Plus size={20} weight="bold" />
                  <span>Mais fotos</span>
                </button>
              </div>
            ) : (
              <button type="button" className="btn-secondary btn--block" onClick={() => fileInputRef.current?.click()}>
                <Camera size={16} weight="bold" />
                <span>Tirar ou escolher fotos</span>
              </button>
            )}
          </div>

          <div className="form-group dec-field">
            <label className="form-label" htmlFor="media-obs">Observação</label>
            <textarea
              id="media-obs"
              rows={3}
              className="form-textarea"
              placeholder="Ex: Executado conforme o projeto"
              value={anotacao}
              onChange={(e) => setAnotacao(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          {hasContent ? (
            <>
              <button type="button" onClick={handleFecharSemSalvar} className="btn-secondary">
                Pular
              </button>
              <button type="button" onClick={handleSalvar} className="btn-primary">
                <span>Salvar registro</span>
              </button>
            </>
          ) : (
            <button type="button" onClick={handleFecharSemSalvar} className="btn-primary">
              <span>Concluir</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
