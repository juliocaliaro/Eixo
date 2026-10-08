import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, FloppyDisk, WarningCircle, Plus, Receipt, Trash, CircleNotch } from '@phosphor-icons/react';
import { Obra } from '../types/obra';
import { storageApi } from '../services/api';
import { generateUUID } from '../utils/uuid';

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

interface FotoPreview {
  blob: Blob;
  previewUrl: string;
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
  const [fotos, setFotos] = useState<FotoPreview[]>([]);
  const [erro, setErro] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar apenas quando o modal for aberto (evita limpar o formulário se obras atualizar em segundo plano)
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setObraId(preselectedObraId || (obras.length === 1 ? obras[0].id : ''));
      setTitulo('');
      setObservacoes('');
      setFotos((prev) => {
        prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
        return [];
      });
      setErro('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, preselectedObraId]);

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

  // Processamento e compressão de imagem para Blob binário (sem base64)
  const processarArquivo = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1400;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => resolve(blob || file),
              'image/jpeg',
              0.82
            );
          } else {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const fileList = Array.from(files);
      const novosBlobs = await Promise.all(fileList.map((f) => processarArquivo(f)));
      const novosItens: FotoPreview[] = novosBlobs.map((blob) => ({
        blob,
        previewUrl: URL.createObjectURL(blob),
      }));
      setFotos((prev) => [...prev, ...novosItens]);
      if (erro) setErro('');
    } catch {
      setErro('Erro ao processar imagem.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFoto = (index: number) => {
    setFotos((prev) => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!obraId) {
      setErro('Selecione uma obra.');
      return;
    }

    if (fotos.length === 0) {
      setErro('Faça o upload de pelo menos uma imagem da nota ou recibo.');
      return;
    }

    setIsSaving(true);
    try {
      const notaId = generateUUID();
      const urlsUpload: string[] = [];

      // Envia os arquivos binários diretamente para o Supabase Storage (sem base64)
      for (let i = 0; i < fotos.length; i++) {
        const item = fotos[i];
        const path = `${obraId}/notas/${notaId}_${i}.jpg`;
        const remoteUrl = await storageApi.uploadBlob('registro-notas', path, item.blob, 'image/jpeg');

        if (remoteUrl) {
          urlsUpload.push(remoteUrl);
        } else {
          // Fallback offline seguro se Supabase não estiver disponível
          const fallback = await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(item.blob);
          });
          urlsUpload.push(fallback);
        }
      }

      // Libera as referências da memória local do navegador
      fotos.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setFotos([]);

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
        className="modal-card"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho Minimalista */}
        <div className="modal-header" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'var(--dark-coffee-100)',
                color: 'var(--dark-coffee-800)',
                padding: 8,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={20} weight="fill" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>
                Registro de Notas
              </h2>
              <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: 0 }}>
                Anexe a imagem da nota fiscal ou recibo da obra
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar (Escape)">
            <X size={20} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {erro && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'var(--coral-glow-50)',
                  border: '1px solid var(--coral-glow-300)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--coral-glow-700)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <WarningCircle size={18} weight="fill" />
                <span>{erro}</span>
              </div>
            )}

            {/* Campo 1: Selecionar a Obra */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                <span>Obra *</span>
              </label>
              <select
                className="form-input"
                value={obraId}
                onChange={(e) => {
                  setObraId(e.target.value);
                  if (erro) setErro('');
                }}
                required
                style={{ cursor: 'pointer', appearance: 'auto' }}
              >
                <option value="">Selecione a obra...</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome} {o.cliente ? `(${o.cliente})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo 2: Upload de Imagem */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                  Upload de Imagem da Nota *
                </label>
                {fotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-accent)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <Plus size={13} weight="bold" />
                    <span>Adicionar outra foto</span>
                  </button>
                )}
              </div>

              {fotos.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '1.5px dashed var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: 'var(--dark-coffee-50)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    color: 'var(--text-muted)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-accent)';
                    e.currentTarget.style.background = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-hairline)';
                    e.currentTarget.style.background = 'var(--dark-coffee-50)';
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary-accent)',
                    }}
                  >
                    <Camera size={22} weight="bold" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
                      Clique ou tire uma foto da nota
                    </span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Formatos JPG, PNG ou captura direta no celular
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {fotos.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: 72,
                        height: 72,
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-hairline)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >
                      <img
                        src={item.previewUrl}
                        alt={`Nota ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFoto(idx)}
                        style={{
                          position: 'absolute',
                          top: 3,
                          right: 3,
                          background: 'rgba(0, 0, 0, 0.70)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'background 0.15s ease',
                        }}
                        title="Remover foto"
                      >
                        <Trash size={12} weight="bold" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px dashed var(--border-hairline)',
                      background: 'var(--dark-coffee-50)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      gap: 4,
                      transition: 'border-color 0.15s',
                    }}
                    title="Adicionar mais fotos"
                  >
                    <Plus size={18} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>Mais foto</span>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFilesChange}
              />
            </div>

            {/* Campo 3: Título ou Descrição (opcional) */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Título / Identificação (opcional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: NF 4589 - Tintas e Acabamentos, Recibo Madeireira..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            {/* Campo 4: Observações (opcional) */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Observações (opcional)
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Fornecedor, forma de pagamento, observações do recibo..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Rodapé Minimalista */}
          <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '9px 18px', fontSize: '0.88rem' }}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
              style={{
                padding: '9px 20px',
                fontSize: '0.88rem',
                opacity: isSaving ? 0.75 : 1,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? (
                <>
                  <CircleNotch size={16} className="spin-animate" weight="bold" />
                  <span>Enviando arquivos...</span>
                </>
              ) : (
                <>
                  <FloppyDisk size={16} weight="bold" />
                  <span>Salvar Nota</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
