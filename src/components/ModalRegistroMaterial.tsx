import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, FloppyDisk, WarningCircle, Plus } from '@phosphor-icons/react';
import { Obra } from '../types/obra';

export interface NovoMaterialData {
  obraId: string;
  nome: string;
  status: string;
  fotos: string[];
  observacoes?: string;
}

interface ModalRegistroMaterialProps {
  isOpen: boolean;
  onClose: () => void;
  obras: Obra[];
  preselectedObraId?: string;
  onSave: (dados: NovoMaterialData) => void;
}

export const ModalRegistroMaterial: React.FC<ModalRegistroMaterialProps> = ({
  isOpen,
  onClose,
  obras,
  preselectedObraId,
  onSave,
}) => {
  const [obraId, setObraId] = useState<string>(preselectedObraId || '');
  const [status, setStatus] = useState<string>('Materiais');
  const [nome, setNome] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [erro, setErro] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar ao abrir
  useEffect(() => {
    if (isOpen) {
      setObraId(preselectedObraId || (obras.length === 1 ? obras[0].id : ''));
      setStatus('Materiais');
      setNome('');
      setObservacoes('');
      setFotos([]);
      setErro('');
    }
  }, [isOpen, preselectedObraId, obras]);

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

  // Processamento e compressão leve de imagem base64
  const processarArquivo = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
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
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
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
      const novasFotos = await Promise.all(fileList.map((f) => processarArquivo(f)));
      setFotos((prev) => [...prev, ...novasFotos]);
    } catch {
      setErro('Erro ao processar imagem.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!obraId) {
      setErro('Selecione uma obra.');
      return;
    }

    if (!nome.trim()) {
      setErro('Informe o nome do material.');
      return;
    }

    onSave({
      obraId,
      nome: nome.trim(),
      status,
      fotos,
      observacoes: observacoes.trim() ? observacoes.trim() : undefined,
    });

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho Minimalista */}
        <div className="modal-header" style={{ padding: '16px 20px' }}>
          <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>
            Registrar Material
          </h2>
          <button onClick={onClose} className="btn-icon" title="Fechar (Escape)">
            <X size={20} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {erro && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-sm)',
                  color: '#b91c1c',
                  fontSize: '0.82rem',
                }}
              >
                <WarningCircle size={16} weight="fill" />
                <span>{erro}</span>
              </div>
            )}

            {/* Linha 1: Obra e Status lado a lado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Obra *</label>
                <select
                  className="form-select"
                  value={obraId}
                  onChange={(e) => setObraId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Materiais">Materiais</option>
                  <option value="Entregue">Entregue</option>
                  <option value="Comprado">Comprado</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>
            </div>

            {/* Linha 2: Descrição / Nome */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nome do Material *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: 50 sacos de cimento, porcelanato, cabos..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            {/* Linha 3: Observações */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Observações</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Fornecedor, nota fiscal ou anotações (opcional)..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Linha 4: Fotos / Comprovantes */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Fotos / Comprovantes</label>
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
                    <span>Adicionar foto</span>
                  </button>
                )}
              </div>

              {fotos.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '1px dashed var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    textAlign: 'center',
                    background: 'var(--dark-coffee-50)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    color: 'var(--text-muted)',
                    fontSize: '0.80rem',
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
                  <Camera size={16} />
                  <span>Anexar fotos do material ou comprovantes</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {fotos.map((fotoUrl, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: 52,
                        height: 52,
                        borderRadius: 'var(--radius-xs)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      <img
                        src={fotoUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFoto(idx)}
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          background: 'rgba(0, 0, 0, 0.65)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 16,
                          height: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        title="Remover foto"
                      >
                        <X size={10} weight="bold" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 'var(--radius-xs)',
                      border: '1px dashed var(--border-hairline)',
                      background: 'var(--dark-coffee-50)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                    title="Adicionar mais fotos"
                  >
                    <Plus size={16} />
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
          </div>

          {/* Rodapé Minimalista */}
          <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.84rem' }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.84rem' }}>
              <FloppyDisk size={16} weight="bold" />
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
