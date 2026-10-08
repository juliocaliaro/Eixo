import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, FloppyDisk, WarningCircle, Trash, Wrench, Clock, BuildingApartment, Storefront } from '@phosphor-icons/react';
import { Obra, TipoPeriodoLocacao } from '../types/obra';

export interface NovaLocacaoData {
  obraId: string;
  itemLocado: string;
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
  onSave: (dados: NovaLocacaoData) => void;
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
  const [fornecedor, setFornecedor] = useState<string>('');
  const [periodo, setPeriodo] = useState<TipoPeriodoLocacao | ''>('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [erro, setErro] = useState<string>('');
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar ao abrir
  useEffect(() => {
    if (isOpen) {
      setObraId(preselectedObraId || (obras.length === 1 ? obras[0].id : ''));
      setItemLocado('');
      setFornecedor('');
      setPeriodo('');
      setFotos([]);
      setErro('');
      setIsProcessingPhotos(false);
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

  // Processamento e compressão leve de imagem
  const processarArquivo = (file: File): Promise<string> => {
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
            resolve(canvas.toDataURL('image/jpeg', 0.82));
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

    setIsProcessingPhotos(true);
    try {
      const fileList = Array.from(files);
      const novasFotos = await Promise.all(fileList.map((f) => processarArquivo(f)));
      setFotos((prev) => [...prev, ...novasFotos]);
    } catch {
      setErro('Falha ao processar imagem(ns). Tente novamente.');
    } finally {
      setIsProcessingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const calcularDataVencimento = (p: TipoPeriodoLocacao): string => {
    const d = new Date();
    if (p === 'diaria') d.setDate(d.getDate() + 1);
    else if (p === 'semanal') d.setDate(d.getDate() + 7);
    else if (p === 'quinzenal') d.setDate(d.getDate() + 15);
    else if (p === 'mensal') d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    const dataVencimento = calcularDataVencimento(periodo);

    onSave({
      obraId,
      itemLocado: itemLocado.trim(),
      periodo,
      dataVencimento,
      fotos,
      fornecedor: fornecedor.trim() || undefined,
    });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(26, 19, 10, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-locacao-title"
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90dvh',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-hairline)',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--dark-coffee-50, #fcfaf8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                background: 'var(--pitch-black-50, #f6f3eb)',
                color: 'var(--coral-glow-500, #e05a47)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wrench size={22} weight="bold" />
            </div>
            <div>
              <h2
                id="modal-locacao-title"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Registro de Locação
              </h2>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  margin: '2px 0 0 0',
                }}
              >
                Cadastre equipamentos, máquinas e ferramentas alugadas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{
              width: 32,
              height: 32,
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Fechar"
            title="Fechar (Esc)"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Formulário com rolagem interna */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Mensagem de Erro */}
            {erro && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <WarningCircle size={18} weight="fill" style={{ flexShrink: 0 }} />
                <span>{erro}</span>
              </div>
            )}

            {/* 1. Obra Vinculada (Obrigatório) */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: 6,
                }}
              >
                <BuildingApartment size={16} />
                <span>Obra Vinculada *</span>
              </label>
              <select
                value={obraId}
                onChange={(e) => {
                  setObraId(e.target.value);
                  setErro('');
                }}
                className="form-select"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '0.92rem',
                  backgroundColor: '#ffffff',
                  color: 'var(--text-main)',
                  outline: 'none',
                }}
                required
              >
                <option value="">Selecione uma obra...</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome} {o.cliente ? `(${o.cliente})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. O que foi locado (Obrigatório) */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: 6,
                }}
              >
                <Wrench size={16} />
                <span>O que foi locado? *</span>
              </label>
              <input
                type="text"
                value={itemLocado}
                onChange={(e) => {
                  setItemLocado(e.target.value);
                  setErro('');
                }}
                placeholder="Ex: Andaime Fachadeiro 12m, Betoneira 400L, Rompedor 30kg..."
                className="form-input"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
                required
              />
            </div>

            {/* 3. Fornecedor / Locadora E Data de Vencimento lado a lado */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {/* Fornecedor / Locadora */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 6,
                  }}
                >
                  <Storefront size={16} />
                  <span>Fornecedor / Locadora</span>
                </label>
                <input
                  type="text"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  placeholder="Ex: LocaMais, Casa do Construtor..."
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-hairline)',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Período da Locação (Diária, Semanal, Quinzenal, Mensal) */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 6,
                  }}
                >
                  <Clock size={16} />
                  <span>Período da Locação *</span>
                </label>
                <select
                  value={periodo}
                  onChange={(e) => {
                    setPeriodo(e.target.value as TipoPeriodoLocacao);
                    setErro('');
                  }}
                  className="form-select"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-hairline)',
                    fontSize: '0.92rem',
                    backgroundColor: '#ffffff',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                  required
                >
                  <option value="">Selecione o período...</option>
                  <option value="diaria">Diária</option>
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
            </div>

            {/* 4. Upload de Foto do Equipamento / Comprovante */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Camera size={16} />
                  <span>Foto do Equipamento ou Comprovante</span>
                </div>
                {fotos.length > 0 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {fotos.length} {fotos.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
                  </span>
                )}
              </label>

              {/* Botão de Adição de Fotos */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1.5px dashed var(--border-hairline)',
                  borderRadius: '8px',
                  padding: '18px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--dark-coffee-50, #fcfaf8)',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--coral-glow-500, #e05a47)';
                  e.currentTarget.style.background = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-hairline)';
                  e.currentTarget.style.background = 'var(--dark-coffee-50, #fcfaf8)';
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesChange}
                  style={{ display: 'none' }}
                />
                <Camera size={26} color="var(--coral-glow-500, #e05a47)" weight="duotone" />
                <div>
                  <span
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      display: 'block',
                    }}
                  >
                    {isProcessingPhotos ? 'Processando imagem...' : 'Clique para adicionar foto'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      display: 'block',
                      marginTop: 2,
                    }}
                  >
                    JPG, PNG ou foto direta da câmera do celular
                  </span>
                </div>
              </div>

              {/* Miniaturas das Fotos */}
              {fotos.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {fotos.map((foto, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-hairline)',
                        backgroundColor: '#f1f1f1',
                      }}
                    >
                      <img
                        src={foto}
                        alt={`Foto locação ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFoto(idx);
                        }}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: '#ffffff',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
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
          </div>

          {/* Rodapé com Ações */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-hairline)',
              backgroundColor: 'var(--dark-coffee-50, #fcfaf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{
                minHeight: 44,
                padding: '10px 18px',
                fontSize: '0.9rem',
                borderRadius: '6px',
                fontWeight: 600,
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-primary"
              style={{
                minHeight: 44,
                padding: '10px 22px',
                fontSize: '0.9rem',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FloppyDisk size={18} weight="bold" />
              <span>Salvar Locação</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
