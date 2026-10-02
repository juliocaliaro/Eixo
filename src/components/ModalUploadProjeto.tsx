import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FilePdf,
  UploadSimple,
  WarningCircle,
  Plus
} from '@phosphor-icons/react';
import { TipoProjeto } from '../types/obra';
import { TIPOS_PROJETO_LISTA, formatBytes } from '../utils/projetoConfig';

interface ModalUploadProjetoProps {
  isOpen: boolean;
  onClose: () => void;
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

export const ModalUploadProjeto: React.FC<ModalUploadProjetoProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arquivoBase64, setArquivoBase64] = useState<string>('');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoProjeto>('eletrico');
  const [tipoCustomizado, setTipoCustomizado] = useState('');
  const [versao, setVersao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fechar com tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErro('Selecione apenas arquivos PDF.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErro('Arquivo acima de 20MB.');
      return;
    }

    setErro('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setArquivo(file);
      setArquivoBase64(result);

      if (!titulo.trim()) {
        const nomeLimpo = file.name
          .replace(/\.pdf$/i, '')
          .replace(/[_-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        setTitulo(nomeLimpo);
      }
    };
    reader.onerror = () => {
      setErro('Falha ao ler arquivo.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!arquivo || !arquivoBase64) {
      setErro('Selecione um PDF.');
      return;
    }

    if (!titulo.trim()) {
      setErro('Informe o título.');
      return;
    }

    if (tipo === 'outro' && !tipoCustomizado.trim()) {
      setErro('Informe o nome da disciplina.');
      return;
    }

    onUpload({
      titulo: titulo.trim(),
      tipo,
      tipoCustomizado: tipo === 'outro' ? tipoCustomizado.trim() : undefined,
      arquivoNome: arquivo.name,
      tamanhoBytes: arquivo.size,
      url: arquivoBase64,
      versao: versao.trim() || undefined,
      descricao: descricao.trim() || undefined,
    });

    handleClose();
  };

  const handleClose = () => {
    setArquivo(null);
    setArquivoBase64('');
    setTitulo('');
    setTipo('eletrico');
    setTipoCustomizado('');
    setVersao('');
    setDescricao('');
    setErro('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Header Minimalista */}
        <div className="modal-header" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FilePdf size={20} weight="fill" color="#b91c1c" />
            <h2 className="modal-title" style={{ fontSize: '1.1rem' }}>
              Anexar Projeto (PDF)
            </h2>
          </div>
          <button onClick={handleClose} className="btn-icon" title="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ padding: '18px 20px' }}>
            {erro && (
              <div
                style={{
                  background: 'var(--coral-glow-50)',
                  border: '1px solid var(--coral-glow-300)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: 'var(--coral-glow-700)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <WarningCircle size={16} weight="bold" />
                <span>{erro}</span>
              </div>
            )}

            {/* SELETOR DE ARQUIVO MINIMALISTA */}
            <div style={{ marginBottom: 16 }}>
              {!arquivo ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileProcess(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `1.5px dashed ${isDragging ? 'var(--primary-accent)' : 'var(--border-hairline)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    textAlign: 'center',
                    background: isDragging ? 'var(--coral-glow-50)' : 'var(--dark-coffee-50)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <UploadSimple size={18} color="var(--primary-accent)" weight="bold" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Selecionar arquivo PDF
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--dark-coffee-50)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <FilePdf size={20} weight="fill" color="#b91c1c" style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '300px',
                      }}
                    >
                      {arquivo.name}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      ({formatBytes(arquivo.size)})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setArquivo(null);
                      setArquivoBase64('');
                    }}
                    className="btn-icon"
                    title="Remover"
                    style={{ padding: 4 }}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* CLASSIFICAÇÃO / DISCIPLINA (PILLS COMPACTOS) */}
            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ marginBottom: 6, fontSize: '0.80rem' }}>
                Classificação *
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TIPOS_PROJETO_LISTA.map((t) => {
                  const isSelected = tipo === t.id;
                  const IconComp = t.Icon;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTipo(t.id);
                        if (erro) setErro('');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: isSelected ? `1.5px solid ${t.color}` : '1px solid var(--border-hairline)',
                        background: isSelected ? t.bg : '#ffffff',
                        color: isSelected ? t.color : 'var(--text-body)',
                        fontSize: '0.80rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <IconComp size={14} weight={isSelected ? 'fill' : 'bold'} />
                      <span>{t.label.split('&')[0].trim()}</span>
                    </button>
                  );
                })}
              </div>

              {tipo === 'outro' && (
                <div style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nome da disciplina (ex: Paisagismo, Gás...)"
                    value={tipoCustomizado}
                    onChange={(e) => setTipoCustomizado(e.target.value)}
                    autoFocus
                    style={{ fontSize: '0.85rem', padding: '7px 10px' }}
                  />
                </div>
              )}
            </div>

            {/* TÍTULO E VERSÃO */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.80rem' }}>Título *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Planta de Iluminação"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    if (erro) setErro('');
                  }}
                  style={{ fontSize: '0.88rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.80rem' }}>Versão</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Rev. 02"
                  value={versao}
                  onChange={(e) => setVersao(e.target.value)}
                  style={{ fontSize: '0.88rem' }}
                />
              </div>
            </div>

            {/* OBSERVAÇÕES COMPACTAS */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.80rem' }}>Notas (opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Aprovado pelo cliente."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '12px 20px' }}>
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!arquivo}
              style={{ opacity: !arquivo ? 0.6 : 1 }}
            >
              <Plus size={16} weight="bold" />
              <span>Anexar PDF</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
