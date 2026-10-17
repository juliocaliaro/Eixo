import React, { useState, useRef } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useIsMobile } from '../hooks/useIsMobile';
import { X, FilePdf, UploadSimple, WarningCircle, Plus, CircleNotch } from '@phosphor-icons/react';
import { TipoProjeto } from '../types/obra';
import { TIPOS_PROJETO_LISTA, formatBytes } from '../utils/projetoConfig';
import { storeFile } from '../utils/fileIntake';
import { generateUUID } from '../utils/uuid';

interface ModalUploadProjetoProps {
  isOpen: boolean;
  onClose: () => void;
  obraId?: string;
  onUpload: (dados: {
    titulo: string;
    tipo: TipoProjeto;
    tipoCustomizado?: string;
    arquivoNome: string;
    tamanhoBytes: number;
    url: string;
    versao?: string;
    descricao?: string;
  }) => void;
}

export const ModalUploadProjeto: React.FC<ModalUploadProjetoProps> = ({ isOpen, onClose, obraId, onUpload }) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  // Sem disciplina pré-selecionada: a classificação é obrigatória e precisa ser uma escolha consciente.
  const [tipo, setTipo] = useState<TipoProjeto | ''>('');
  const [tipoCustomizado, setTipoCustomizado] = useState('');
  const [versao, setVersao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErro('Selecione apenas arquivos PDF.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErro('Arquivo acima de 25MB.');
      return;
    }

    setErro('');
    setArquivo(file);

    if (!titulo.trim()) {
      const nomeLimpo = file.name
        .replace(/\.pdf$/i, '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      setTitulo(nomeLimpo);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!arquivo) {
      setErro('Selecione um PDF.');
      return;
    }

    if (!titulo.trim()) {
      setErro('Informe o título.');
      return;
    }

    if (!tipo) {
      setErro('Escolha a disciplina do projeto.');
      return;
    }

    if (tipo === 'outro' && !tipoCustomizado.trim()) {
      setErro('Informe o nome da disciplina.');
      return;
    }

    setIsUploading(true);
    try {
      const projId = generateUUID();
      const sanitizedName = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${obraId || 'geral'}/projetos/${projId}_${sanitizedName}`;

      const finalUrl = await storeFile(arquivo, { bucket: 'projetos-pdf', path: storagePath });

      onUpload({
        titulo: titulo.trim(),
        tipo,
        tipoCustomizado: tipo === 'outro' ? tipoCustomizado.trim() : undefined,
        arquivoNome: arquivo.name,
        tamanhoBytes: arquivo.size,
        url: finalUrl,
        versao: versao.trim() || undefined,
        descricao: descricao.trim() || undefined,
      });

      handleClose();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao enviar arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setArquivo(null);
    setTitulo('');
    setTipo('');
    setTipoCustomizado('');
    setVersao('');
    setDescricao('');
    setErro('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Anexar arquivo">
        <div className="modal-header">
          <h2 className="modal-title">Anexar arquivo (PDF)</h2>
          <button type="button" onClick={handleClose} className="btn-icon" title="Fechar" aria-label="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body">
            <div className="modal-stack">
              {erro && (
                <div className="modal-error" role="alert" style={{ marginBottom: 0 }}>
                  <WarningCircle size={16} weight="bold" style={{ flexShrink: 0 }} />
                  <span>{erro}</span>
                </div>
              )}

              {/* Arquivo */}
              {!arquivo ? (
                <div
                  className={`upload-drop ${isDragging ? 'is-dragging' : ''}`}
                  role="button"
                  tabIndex={0}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileProcess(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <UploadSimple size={20} color="var(--primary-accent)" weight="bold" />
                  <span>Selecionar PDF</span>
                </div>
              ) : (
                <div className="upload-file">
                  <FilePdf size={22} weight="fill" color="#b91c1c" style={{ flexShrink: 0 }} />
                  <span className="upload-file-name">{arquivo.name}</span>
                  <span className="upload-file-size">{formatBytes(arquivo.size)}</span>
                  <button
                    type="button"
                    onClick={() => setArquivo(null)}
                    className="btn-icon touch-target-44"
                    aria-label="Remover arquivo"
                    style={{ border: 'none', background: 'transparent' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Disciplina (obrigatória, sem valor pré-selecionado) */}
              <div className="form-group">
                <label className="form-label" htmlFor="upload-disciplina">
                  Disciplina
                </label>

                {isMobile ? (
                  <select
                    id="upload-disciplina"
                    className="form-input"
                    value={tipo}
                    onChange={(e) => {
                      setTipo(e.target.value as TipoProjeto | '');
                      if (erro) setErro('');
                    }}
                  >
                    <option value="">Escolha a disciplina</option>
                    {TIPOS_PROJETO_LISTA.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label.split('&')[0].trim()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="disc-chips" role="radiogroup" aria-label="Disciplina">
                    {TIPOS_PROJETO_LISTA.map((t) => {
                      const isSelected = tipo === t.id;
                      const IconComp = t.Icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`disc-chip ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => {
                            setTipo(t.id);
                            if (erro) setErro('');
                          }}
                          style={
                            isSelected
                              ? { border: `1.5px solid ${t.color}`, background: t.bg, color: t.color }
                              : undefined
                          }
                        >
                          <IconComp size={14} weight={isSelected ? 'fill' : 'bold'} />
                          <span>{t.label.split('&')[0].trim()}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {tipo === 'outro' && (
                  <input
                    type="text"
                    className="form-input"
                    aria-label="Nome da disciplina"
                    placeholder="Nome da disciplina (ex: Paisagismo)"
                    value={tipoCustomizado}
                    onChange={(e) => setTipoCustomizado(e.target.value)}
                    autoFocus
                    style={{ marginTop: 'var(--space-2)' }}
                  />
                )}
              </div>

              <div className="upload-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="upload-titulo">Título</label>
                  <input
                    id="upload-titulo"
                    type="text"
                    className="form-input"
                    placeholder="Ex: Planta de iluminação"
                    value={titulo}
                    onChange={(e) => {
                      setTitulo(e.target.value);
                      if (erro) setErro('');
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="upload-versao">Versão (opcional)</label>
                  <input
                    id="upload-versao"
                    type="text"
                    className="form-input"
                    placeholder="Ex: Rev. 02"
                    value={versao}
                    onChange={(e) => setVersao(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="upload-notas">Notas (opcional)</label>
                <input
                  id="upload-notas"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Aprovado pelo cliente"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="submit"
              className="btn-primary"
              disabled={!arquivo || isUploading}
              style={{
                opacity: !arquivo || isUploading ? 0.65 : 1,
                cursor: !arquivo || isUploading ? 'not-allowed' : 'pointer',
              }}
            >
              {isUploading ? (
                <>
                  <CircleNotch size={16} className="spin-animate" weight="bold" />
                  <span>Anexando...</span>
                </>
              ) : (
                <>
                  <Plus size={16} weight="bold" />
                  <span>Anexar PDF</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
