import React, { useState, useRef, useEffect } from 'react';
import { Camera, NotePencil, X, Check, CaretDown, CaretUp, Sparkle, Plus } from '@phosphor-icons/react';
import { Tarefa, Etapa } from '../types/obra';

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

export const ModalAddMedia: React.FC<ModalAddMediaProps> = ({
  isOpen,
  tarefa,
  etapa,
  onClose,
  onSaveMedia,
}) => {
  const [openSection, setOpenSection] = useState<'none' | 'foto' | 'nota' | 'both'>('none');
  const [anotacao, setAnotacao] = useState('');
  const [fotosPreview, setFotosPreview] = useState<string[]>([]);
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

  if (!isOpen || !tarefa) return null;

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      const readPromises = fileList.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readPromises).then((novasFotos) => {
        setFotosPreview((prev) => [...prev, ...novasFotos]);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFoto = (indexToRemove: number) => {
    setFotosPreview((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const hasContent = Boolean(fotosPreview.length > 0 || anotacao.trim());

  const handleSalvar = () => {
    onSaveMedia({
      fotosBase64: fotosPreview.length > 0 ? fotosPreview : undefined,
      fotoBase64: fotosPreview.length > 0 ? fotosPreview[0] : undefined,
      anotacao: anotacao.trim() || undefined,
    });
    setAnotacao('');
    setFotosPreview([]);
    setOpenSection('none');
    onClose();
  };

  const handleFecharSemSalvar = () => {
    setAnotacao('');
    setFotosPreview([]);
    setOpenSection('none');
    onClose();
  };

  const toggleSection = (section: 'foto' | 'nota') => {
    if (openSection === section) {
      setOpenSection('none');
    } else if (openSection === 'both') {
      setOpenSection(section === 'foto' ? 'nota' : 'foto');
    } else if (openSection === 'none') {
      setOpenSection(section);
    } else {
      setOpenSection('both');
    }
  };

  const isFotoOpen = openSection === 'foto' || openSection === 'both';
  const isNotaOpen = openSection === 'nota' || openSection === 'both';

  return (
    <div className="modal-backdrop" onClick={handleFecharSemSalvar}>
      <div
        className="modal-card"
        style={{ maxWidth: '460px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Cabeçalho Limpo e Direto */}
        <div className="modal-header" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={16} weight="bold" />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                {tarefa.nome}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {etapa?.nome}
              </div>
            </div>
          </div>
          <button onClick={handleFecharSemSalvar} className="btn-icon" title="Fechar">
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Corpo: Acordeons Opcionais para Foto e Anotação */}
        <div className="modal-body" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Deseja anexar comprovação a este serviço?
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Acordeon 1: Foto */}
            <div
              style={{
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                background: '#ffffff',
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection('foto')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isFotoOpen ? 'var(--dark-coffee-50)' : '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: isFotoOpen ? 'var(--primary-accent)' : 'var(--text-body)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Camera size={18} weight={isFotoOpen ? 'fill' : 'bold'} />
                  <span>Fotos do serviço</span>
                  {fotosPreview.length > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: '#dcfce7',
                        color: '#16a34a',
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      <Check size={12} weight="bold" />
                      {fotosPreview.length} {fotosPreview.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  )}
                </div>
                {isFotoOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
              </button>

              {isFotoOpen && (
                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-subtle)' }}>
                  {/* Input Oculto com suporte a múltiplos arquivos */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFilesChange}
                    style={{ display: 'none' }}
                  />

                  {fotosPreview.length > 0 ? (
                    <div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
                          gap: 8,
                        }}
                      >
                        {fotosPreview.map((foto, idx) => (
                          <div
                            key={idx}
                            style={{
                              position: 'relative',
                              aspectRatio: '1',
                              borderRadius: 8,
                              overflow: 'hidden',
                              border: '1px solid var(--border-hairline)',
                              background: 'var(--dark-coffee-100)',
                            }}
                          >
                            <img
                              src={foto}
                              alt={`Foto ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFoto(idx)}
                              style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                background: 'rgba(0,0,0,0.7)',
                                color: '#ffffff',
                                borderRadius: '50%',
                                width: 20,
                                height: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                              title="Remover foto"
                            >
                              <X size={12} weight="bold" />
                            </button>
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 3,
                                left: 4,
                                background: 'rgba(0,0,0,0.65)',
                                color: '#ffffff',
                                fontSize: '0.65rem',
                                padding: '1px 5px',
                                borderRadius: 4,
                                fontWeight: 700,
                              }}
                            >
                              #{idx + 1}
                            </span>
                          </div>
                        ))}

                        {/* Botão de Adicionar Mais Fotos */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            aspectRatio: '1',
                            border: '1.5px dashed var(--dark-coffee-300)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: 'var(--dark-coffee-50)',
                            color: 'var(--primary-accent)',
                            gap: 4,
                            padding: 6,
                          }}
                          title="Anexar mais fotos"
                        >
                          <Plus size={18} weight="bold" />
                          <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Mais foto</span>
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 10,
                          paddingTop: 6,
                          borderTop: '1px dashed var(--border-hairline)',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {fotosPreview.length} {fotosPreview.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFotosPreview([])}
                          style={{
                            fontSize: '0.75rem',
                            color: '#b91c1c',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Remover todas
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '18px 14px',
                        border: '1.5px dashed var(--dark-coffee-200)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: 'var(--dark-coffee-50)',
                        color: 'var(--primary-accent)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'var(--coral-glow-50)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Camera size={20} weight="bold" color="var(--primary-accent)" />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div>Selecionar ou tirar fotos</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
                          Envie uma ou mais fotos da conclusão deste serviço
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Acordeon 2: Anotação */}
            <div
              style={{
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                background: '#ffffff',
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection('nota')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isNotaOpen ? 'var(--dark-coffee-50)' : '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: isNotaOpen ? 'var(--primary-accent)' : 'var(--text-body)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <NotePencil size={18} weight={isNotaOpen ? 'fill' : 'bold'} />
                  <span>Observação escrita</span>
                  {anotacao.trim() && <Check size={14} weight="bold" color="#16a34a" />}
                </div>
                {isNotaOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
              </button>

              {isNotaOpen && (
                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-subtle)' }}>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    style={{ fontSize: '0.88rem', padding: '8px 10px' }}
                    placeholder="Ex: Executado conforme o projeto estrutural..."
                    value={anotacao}
                    onChange={(e) => setAnotacao(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé Dinâmico */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            background: 'var(--dark-coffee-50)',
          }}
        >
          {hasContent ? (
            <>
              <button
                type="button"
                onClick={handleFecharSemSalvar}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                Pular
              </button>
              <button
                type="button"
                onClick={handleSalvar}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Sparkle size={15} weight="fill" />
                <span>Salvar Registro</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleFecharSemSalvar}
              className="btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.88rem' }}
            >
              <span>Concluir</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
