import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  NotePencil,
  Plus,
  Trash,
  CheckCircle,
  Clock,
  ArrowsOut,
  FolderOpen
} from '@phosphor-icons/react';
import { Tarefa } from '../types/obra';

interface ModalTaskDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  tarefa: Tarefa | null;
  etapaNome: string;
  etapaId: string;
  onUpdateTaskMedia?: (etapaId: string, tarefaId: string, fotos: string[], anotacoes: string[]) => void;
  isReadOnly?: boolean;
}

export const ModalTaskDetails: React.FC<ModalTaskDetailsProps> = ({
  isOpen,
  onClose,
  tarefa,
  etapaNome,
  etapaId,
  onUpdateTaskMedia,
  isReadOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'tudo' | 'fotos' | 'notas'>('tudo');
  const [novaNota, setNovaNota] = useState('');
  const [isAddingNota, setIsAddingNota] = useState(false);
  const [lightboxFoto, setLightboxFoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = !isReadOnly && Boolean(onUpdateTaskMedia);

  if (!isOpen || !tarefa) return null;

  const fotos = tarefa.fotos || [];
  const anotacoes = tarefa.anotacoes || [];
  const temFotos = fotos.length > 0;
  const temNotas = anotacoes.length > 0;

  const formatarDataHora = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const data = new Date(isoString);
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUpdateTaskMedia) {
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

      Promise.all(readPromises).then((novasImgs) => {
        onUpdateTaskMedia(etapaId, tarefa.id, [...fotos, ...novasImgs], anotacoes);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaNota.trim() || !onUpdateTaskMedia) return;
    const novasNotas = [...anotacoes, novaNota.trim()];
    onUpdateTaskMedia(etapaId, tarefa.id, fotos, novasNotas);
    setNovaNota('');
    setIsAddingNota(false);
  };

  const handleDeleteFoto = (indexToDelete: number) => {
    if (!onUpdateTaskMedia) return;
    const novasFotos = fotos.filter((_, idx) => idx !== indexToDelete);
    onUpdateTaskMedia(etapaId, tarefa.id, novasFotos, anotacoes);
    if (lightboxFoto === fotos[indexToDelete]) {
      setLightboxFoto(null);
    }
  };

  const handleDeleteNota = (indexToDelete: number) => {
    if (!onUpdateTaskMedia) return;
    const novasNotas = anotacoes.filter((_, idx) => idx !== indexToDelete);
    onUpdateTaskMedia(etapaId, tarefa.id, fotos, novasNotas);
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-card"
          style={{
            width: '640px',
            maxWidth: '94vw',
            height: '560px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho do Modal */}
          <div className="modal-header" style={{ padding: '18px 24px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span className="timeline-badge" style={{ fontSize: '0.72rem' }}>
                  {etapaNome}
                </span>

                {tarefa.concluida ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#16a34a',
                      background: '#dcfce7',
                      padding: '2px 8px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCircle size={12} weight="bold" />
                    Concluída {tarefa.concluidaEm ? `em ${formatarDataHora(tarefa.concluidaEm)}` : ''}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--cinnamon-wood-700)',
                      background: 'var(--cinnamon-wood-100)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Clock size={12} weight="bold" />
                    Serviço Pendente
                  </span>
                )}
              </div>

              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {tarefa.nome}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="btn-icon"
              style={{ width: 32, height: 32 }}
              title="Fechar"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Sub-nav de Filtro Rápido */}
          <div
            style={{
              padding: '0 24px',
              borderBottom: '1px solid var(--border-hairline)',
              display: 'flex',
              gap: 16,
              background: 'var(--dark-coffee-50)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('tudo')}
              style={{
                padding: '10px 4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: activeTab === 'tudo' ? 'var(--primary-accent)' : 'var(--text-muted)',
                borderBottom: activeTab === 'tudo' ? '2px solid var(--primary-accent)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              Visão Geral ({fotos.length + anotacoes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fotos')}
              style={{
                padding: '10px 4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: activeTab === 'fotos' ? 'var(--primary-accent)' : 'var(--text-muted)',
                borderBottom: activeTab === 'fotos' ? '2px solid var(--primary-accent)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Camera size={14} weight="bold" />
              Fotos ({fotos.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notas')}
              style={{
                padding: '10px 4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: activeTab === 'notas' ? 'var(--primary-accent)' : 'var(--text-muted)',
                borderBottom: activeTab === 'notas' ? '2px solid var(--primary-accent)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <NotePencil size={14} weight="bold" />
              Anotações ({anotacoes.length})
            </button>
          </div>

          {/* Corpo do Modal */}
          <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Seção 1: Fotos do Serviço */}
            {(activeTab === 'tudo' || activeTab === 'fotos') && (
              <section>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Camera size={16} weight="bold" color="var(--primary-accent)" />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      Registro Fotográfico ({fotos.length})
                    </h3>
                  </div>

                  {/* Input Oculto de Arquivo */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                      title="Tirar foto ou anexar imagens"
                    >
                      <Plus size={12} weight="bold" />
                      <span>Adicionar Fotos</span>
                    </button>
                  )}
                </div>

                {temFotos ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {fotos.map((foto, idx) => (
                      <div
                        key={idx}
                        className="task-photo-thumb-container"
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          border: '1px solid var(--border-hairline)',
                          background: 'var(--pitch-black-950)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setLightboxFoto(foto)}
                      >
                        <img
                          src={foto}
                          alt={`Registro ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.2s ease',
                          }}
                          className="hover-zoom-img"
                        />

                        {/* Botão de Ampliar / Overlay */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(30, 24, 6, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.15s ease',
                            color: '#ffffff',
                          }}
                          className="thumb-hover-overlay"
                        >
                          <ArrowsOut size={20} weight="bold" />
                        </div>

                        {/* Botão Excluir Foto */}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFoto(idx);
                            }}
                            title="Remover foto"
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: 'rgba(30, 24, 6, 0.75)',
                              color: '#ffffff',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '24px 16px',
                      border: '1px dashed var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    <FolderOpen size={24} color="var(--mauve-bark-400)" style={{ margin: '0 auto 6px auto' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                      Nenhuma foto registrada para este serviço.
                    </p>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', margin: '0 auto' }}
                      >
                        <Camera size={13} weight="bold" />
                        <span>Anexar fotos</span>
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Seção 2: Anotações & Observações */}
            {(activeTab === 'tudo' || activeTab === 'notas') && (
              <section>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <NotePencil size={16} weight="bold" color="var(--cinnamon-wood-600)" />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      Anotações de Campo ({anotacoes.length})
                    </h3>
                  </div>

                  {canEdit && !isAddingNota && (
                    <button
                      type="button"
                      onClick={() => setIsAddingNota(true)}
                      className="btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                    >
                      <Plus size={12} weight="bold" />
                      <span>Nova Anotação</span>
                    </button>
                  )}
                </div>

                {/* Formulário para Nova Anotação */}
                {canEdit && isAddingNota && (
                  <form
                    onSubmit={handleAddNota}
                    style={{
                      marginBottom: 14,
                      background: 'var(--dark-coffee-50)',
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <textarea
                      autoFocus
                      rows={3}
                      className="form-textarea"
                      placeholder="Descreva a observação, medição ou ocorrência..."
                      value={novaNota}
                      onChange={(e) => setNovaNota(e.target.value)}
                      style={{ fontSize: '0.88rem', marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNota(false);
                          setNovaNota('');
                        }}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={!novaNota.trim()}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        Salvar Nota
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de Anotações */}
                {temNotas ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {anotacoes.map((nota, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px 14px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'var(--mauve-bark-600)',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              display: 'block',
                              marginBottom: 4,
                            }}
                          >
                            Nota #{idx + 1}
                          </span>
                          <p
                            style={{
                              fontSize: '0.88rem',
                              color: 'var(--text-main)',
                              margin: 0,
                              lineHeight: 1.45,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {nota}
                          </p>
                        </div>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNota(idx)}
                            className="btn-icon"
                            style={{ width: 26, height: 26, color: 'var(--coral-glow-600)', flexShrink: 0 }}
                            title="Excluir anotação"
                          >
                            <Trash size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  !isAddingNota && (
                    <div
                      style={{
                        padding: '24px 16px',
                        border: '1px dashed var(--border-hairline)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        background: 'var(--bg-surface)',
                      }}
                    >
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                        Nenhuma observação escrita para este serviço.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddingNota(true)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', margin: '0 auto' }}
                      >
                        <NotePencil size={13} weight="bold" />
                        <span>Escrever primeira nota</span>
                      </button>
                    </div>
                  )
                )}
              </section>
            )}
          </div>

          {/* Rodapé com Fechar */}
          <div className="modal-footer" style={{ padding: '12px 24px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary"
              style={{ minWidth: 100, fontSize: '0.88rem' }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom em Tela Cheia da Foto */}
      {lightboxFoto && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 120, background: 'rgba(15, 12, 4, 0.92)' }}
          onClick={() => setLightboxFoto(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '90vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxFoto}
              alt="Ampliada"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: 'var(--radius-sm)',
                objectFit: 'contain',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              }}
            />
            <button
              type="button"
              onClick={() => setLightboxFoto(null)}
              style={{
                position: 'absolute',
                top: -16,
                right: -16,
                background: 'var(--pitch-black-900)',
                color: '#ffffff',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Fechar visualização"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
