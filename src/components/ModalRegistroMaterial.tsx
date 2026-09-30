import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  X,
  Camera,
  FloppyDisk,
  WarningCircle,
  Trash,
  Buildings,
  Tag,
  NotePencil,
  Plus
} from '@phosphor-icons/react';
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
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar obra pré-selecionada ao abrir
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

  // Listener para fechar modal com tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Função para comprimir e converter imagem em base64
  const processarArquivo = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
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

    setIsProcessingFiles(true);
    try {
      const fileList = Array.from(files);
      const novasFotos = await Promise.all(fileList.map((f) => processarArquivo(f)));
      setFotos((prev) => [...prev, ...novasFotos]);
    } catch {
      setErro('Erro ao processar imagens. Tente fotos menores.');
    } finally {
      setIsProcessingFiles(false);
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
      setErro('Selecione obrigatoriamente uma obra para vincular o material.');
      return;
    }

    if (!nome.trim()) {
      setErro('Informe a descrição ou nome do material.');
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
        style={{ maxWidth: 540 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-material-title"
      >
        {/* Cabeçalho */}
        <div className="modal-header" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--dark-coffee-100)',
                color: 'var(--dark-coffee-900)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} weight="bold" />
            </div>
            <div>
              <h2 id="modal-material-title" className="modal-title" style={{ fontSize: '1.15rem' }}>
                Registro de Materiais
              </h2>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Vincule insumos, entregas e notas fiscais ao histórico da obra
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" title="Fechar (Escape)">
            <X size={20} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Mensagem de Erro */}
            {erro && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-sm)',
                  color: '#b91c1c',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                }}
              >
                <WarningCircle size={18} weight="fill" style={{ flexShrink: 0 }} />
                <span>{erro}</span>
              </div>
            )}

            {/* 1. Seleção da Obra (Obrigatório) */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Buildings size={16} weight="bold" color="var(--primary-accent)" />
                <span>Obra Vinculada *</span>
              </label>
              <select
                className="form-select"
                value={obraId}
                onChange={(e) => setObraId(e.target.value)}
                required
              >
                <option value="">Selecione uma obra cadastrada...</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome} — Cliente: {o.cliente}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Todo material registrado fica obrigatoriamente associado a uma obra específica.
              </span>
            </div>

            {/* 2. Status do Material */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={16} weight="bold" color="var(--primary-accent)" />
                <span>Status do Material *</span>
              </label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Materiais">Materiais</option>
                <option value="Entregue na Obra">Entregue na Obra</option>
                <option value="Comprado / A caminho">Comprado / A caminho</option>
                <option value="Pendente / Em cotação">Pendente / Em cotação</option>
              </select>
            </div>

            {/* 3. Descrição / Nome do Material */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={16} weight="bold" color="var(--primary-accent)" />
                <span>Descrição / Nome do Material *</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: 50 sacos de Cimento CP-II, Cabos de cobre 2.5mm, Porcelanato..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            {/* 4. Fotos e Notas Fiscais */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={16} weight="bold" color="var(--primary-accent)" />
                <span>Fotos & Comprovantes (Notas Fiscais / Canteiro)</span>
              </label>

              {/* Botão de Upload / Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1.5px dashed var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  textAlign: 'center',
                  background: 'var(--dark-coffee-50)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
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
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    color: 'var(--primary-accent)',
                  }}
                >
                  <Camera size={20} weight="bold" />
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {isProcessingFiles ? 'Processando fotos...' : 'Clique para anexar fotos ou notas fiscais'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Suporta múltiplas imagens (JPG, PNG, WebP)
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFilesChange}
              />

              {/* Galeria de Miniaturas Selecionadas */}
              {fotos.length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                  {fotos.map((fotoUrl, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: 72,
                        height: 72,
                        borderRadius: 'var(--radius-xs)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-hairline)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      <img
                        src={fotoUrl}
                        alt={`Foto anexa ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFoto(idx)}
                        style={{
                          position: 'absolute',
                          top: 3,
                          right: 3,
                          background: 'rgba(0, 0, 0, 0.65)',
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
                        }}
                        title="Remover foto"
                      >
                        <Trash size={12} weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Observações */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <NotePencil size={16} weight="bold" color="var(--primary-accent)" />
                <span>Observações Adicionais</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Detalhes adicionais, fornecedor, quantidade conferida, número de nota fiscal, local de armazenamento..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Rodapé com Ações */}
          <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isProcessingFiles}>
              <FloppyDisk size={18} weight="bold" />
              <span>Salvar Registro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
