import React from 'react';
import { Camera, FilePdf, X } from '@phosphor-icons/react';
import type { NormalizedFile } from '../utils/fileIntake';
import '../styles/registros-modelos.css';

interface UploadArquivosProps {
  arquivos: NormalizedFile[];
  onRemove: (index: number) => void;
  onPickFotos: () => void;
  onPickPdf: () => void;
  /** Prefixo do texto alternativo das miniaturas. */
  altPrefix: string;
}

/**
 * Bloco de anexos dos modais de Notas e Locação: miniaturas (quando houver) e duas ações
 * lado a lado (foto/galeria e PDF). Os <input type="file"> ficam no modal.
 */
export const UploadArquivos: React.FC<UploadArquivosProps> = ({ arquivos, onRemove, onPickFotos, onPickPdf, altPrefix }) => (
  <div className="rg-upload">
    {arquivos.length > 0 && (
      <ul className="rg-upload-thumbs">
        {arquivos.map((item, idx) => (
          <li key={idx} className={`rg-upload-thumb${item.isPdf ? ' rg-upload-thumb--pdf' : ''}`}>
            {item.isPdf ? (
              <>
                <FilePdf size={28} weight="fill" aria-hidden="true" />
                <span>PDF</span>
              </>
            ) : (
              <img src={item.previewUrl} alt={`${altPrefix} ${idx + 1}`} />
            )}
            <button type="button" className="rg-upload-remove" onClick={() => onRemove(idx)} aria-label="Remover arquivo">
              <X size={14} weight="bold" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    )}
    <div className="rg-upload-actions">
      <button type="button" className="rg-upload-btn" onClick={onPickFotos}>
        <Camera size={20} weight="bold" aria-hidden="true" />
        <span>{arquivos.length > 0 ? 'Mais fotos' : 'Foto ou galeria'}</span>
      </button>
      <button type="button" className="rg-upload-btn" onClick={onPickPdf}>
        <FilePdf size={20} weight="bold" aria-hidden="true" />
        <span>{arquivos.length > 0 ? 'Mais PDF' : 'Anexar PDF'}</span>
      </button>
    </div>
  </div>
);
