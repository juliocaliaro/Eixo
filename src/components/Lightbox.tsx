import React, { useEffect, useRef } from 'react';
import { X, CaretLeft, CaretRight, FilePdf, ArrowSquareOut, DownloadSimple } from '@phosphor-icons/react';
import { isPdfUrl } from '../utils/fileUtils';
import { useEscapeKey } from '../hooks/useEscapeKey';

/* ========================================================
   Lightbox único do app (substitui 5 cópias manuais).
   - Lightbox: foto única, ampliada (Decisões, Diário, Detalhes da Tarefa).
   - GalleryLightbox: tela cheia com setas, swipe, miniaturas e PDF (Notas, Locações).
   Escape fecha via pilha de overlays (só o topo reage).
   ======================================================== */

interface LightboxProps {
  src: string;
  onClose: () => void;
  alt?: string;
  /** Com título, usa o cabeçalho (estilo Diário); sem título, botão de fechar no canto. */
  titulo?: string;
  subtitulo?: string;
  closeLabel?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({ src, onClose, alt = '', titulo, subtitulo, closeLabel }) => {
  useEscapeKey(onClose);

  if (titulo) {
    return (
      <div
        className="modal-backdrop lightbox-backdrop"
        onClick={onClose}
        style={{ background: 'rgba(0,0,0,0.85)', padding: 16, zIndex: 'var(--z-lightbox)' }}
        role="dialog"
        aria-label="Visualização ampliada da foto"
      >
        <div
          style={{ maxWidth: '92vw', maxHeight: '92vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffffff', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: 700 }}>{titulo}</div>
              {subtitulo && <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{subtitulo}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#ffffff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              aria-label={closeLabel || 'Fechar foto ampliada'}
            >
              <X size={16} weight="bold" />
            </button>
          </div>
          <img
            src={src}
            alt={alt || titulo}
            style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 'var(--radius-sm)', display: 'block', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop lightbox-backdrop" style={{ zIndex: 'var(--z-lightbox)', background: 'rgba(15, 12, 4, 0.92)' }} onClick={onClose}>
      <div
        style={{ position: 'relative', maxWidth: '92vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 'var(--radius-sm)', objectFit: 'contain', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}
        />
        <button
          type="button"
          onClick={onClose}
          style={{ position: 'absolute', top: -16, right: -16, background: 'var(--pitch-black-900)', color: '#ffffff', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          title={closeLabel || 'Fechar visualização'}
          aria-label={closeLabel || 'Fechar visualização'}
          className="lightbox-close-btn"
        >
          <X size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
};

interface GalleryLightboxProps {
  fotos: string[];
  index: number;
  titulo?: string;
  /** Título exibido quando a nota/locação não tem título próprio. */
  tituloPadrao: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({ fotos, index, titulo, tituloPadrao, onIndexChange, onClose }) => {
  const touchX = useRef<number | null>(null);
  useEscapeKey(onClose);

  const goPrev = () => onIndexChange(index > 0 ? index - 1 : fotos.length - 1);
  const goNext = () => onIndexChange(index < fotos.length - 1 ? index + 1 : 0);

  // Setas do teclado navegam entre as fotos (Escape é tratado pela pilha de overlays).
  const nav = useRef({ goPrev, goNext });
  nav.current = { goPrev, goNext };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') nav.current.goPrev();
      if (e.key === 'ArrowRight') nav.current.goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (fotos.length === 0) return null;

  return (
        <div
          onClick={() => onClose()}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.94)',
            zIndex: 'var(--z-lightbox)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            touchAction: 'pan-y',
            userSelect: 'none',
          }}
        >
          {/* Cabeçalho do Lightbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 960,
              color: '#ffffff',
              padding: '6px 4px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: '#ffffff',
                }}
              >
                {titulo || tituloPadrao}
              </span>
              {fotos.length > 1 && (
                <span
                  style={{
                    fontSize: '0.76rem',
                    background: 'rgba(255, 255, 255, 0.22)',
                    padding: '2px 9px',
                    borderRadius: 100,
                    fontWeight: 700,
                    flexShrink: 0,
                    color: '#ffffff',
                  }}
                >
                  {index + 1} / {fotos.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onClose()}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Fechar (Escape)"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Área Central: Imagem com Setas e Swipe Touch Nativo */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 960,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 0,
              touchAction: 'pan-y',
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchX.current === null || fotos.length <= 1) return;
              const diff = touchX.current - e.changedTouches[0].clientX;
              touchX.current = null;
              if (diff > 35) {
                // Arrasto para a esquerda -> próxima foto
                goNext();
              } else if (diff < -35) {
                // Arrasto para a direita -> foto anterior
                goPrev();
              }
            }}
          >
            {/* Seta Lateral Esquerda */}
            {fotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                style={{
                  position: 'absolute',
                  left: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(26, 19, 10, 0.85)',
                  color: '#ffffff',
                  border: '1.5px solid rgba(255, 255, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 'var(--z-sticky)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                }}
                title="Foto anterior"
                aria-label="Foto anterior"
              >
                <CaretLeft size={24} weight="bold" />
              </button>
            )}

            {isPdfUrl(fotos[index]) ? (
              <div
                style={{
                  width: '92vw',
                  maxWidth: 860,
                  height: '75vh',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'var(--dark-coffee-50, #fcfaf8)',
                    borderBottom: '1px solid var(--border-hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <FilePdf size={22} weight="fill" color="#dc2626" />
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {titulo || 'Documento PDF'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a
                      href={fotos[index]}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: 6,
                        background: '#ffffff',
                        border: '1px solid var(--border-hairline)',
                        color: 'var(--text-main)',
                        textDecoration: 'none',
                      }}
                    >
                      <ArrowSquareOut size={14} weight="bold" />
                      <span>Abrir</span>
                    </a>
                    <a
                      href={fotos[index]}
                      download
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: 6,
                        background: 'var(--primary-accent)',
                        color: '#ffffff',
                        textDecoration: 'none',
                      }}
                    >
                      <DownloadSimple size={14} weight="bold" />
                      <span>Baixar</span>
                    </a>
                  </div>
                </div>

                <iframe
                  src={fotos[index]}
                  title="Documento PDF"
                  style={{
                    width: '100%',
                    flex: 1,
                    border: 'none',
                    backgroundColor: '#525659',
                  }}
                />
              </div>
            ) : (
              <img
                src={fotos[index]}
                alt=""
                draggable={false}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  userSelect: 'none',
                }}
              />
            )}

            {/* Seta Lateral Direita */}
            {fotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(26, 19, 10, 0.85)',
                  color: '#ffffff',
                  border: '1.5px solid rgba(255, 255, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 'var(--z-sticky)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                }}
                title="Próxima foto"
                aria-label="Próxima foto"
              >
                <CaretRight size={24} weight="bold" />
              </button>
            )}
          </div>

          {/* Rodapé do Lightbox: Controles de toque e miniaturas interativas */}
          {fotos.length > 1 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                maxWidth: 960,
                padding: '6px 0',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botões táteis Anterior / Próxima para toque direto no mobile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() =>
                    goPrev()
                  }
                  style={{
                    background: 'rgba(255, 255, 255, 0.16)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: 20,
                    padding: '5px 14px',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CaretLeft size={16} weight="bold" />
                  <span>Anterior</span>
                </button>

                <span style={{ color: '#ffffff', fontSize: '0.80rem', fontWeight: 600 }}>
                  {index + 1} de {fotos.length}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    goNext()
                  }
                  style={{
                    background: 'rgba(255, 255, 255, 0.16)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: 20,
                    padding: '5px 14px',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>Próxima</span>
                  <CaretRight size={16} weight="bold" />
                </button>
              </div>

              {/* Faixa de Miniaturas */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  maxWidth: '100%',
                  padding: '4px',
                  scrollbarWidth: 'none',
                }}
              >
                {fotos.map((fUrl, fIdx) => (
                  isPdfUrl(fUrl) ? (
                    <div
                      key={fIdx}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        backgroundColor: '#fff5f5',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: fIdx === index ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.3)',
                        opacity: fIdx === index ? 1 : 0.65,
                        flexShrink: 0,
                        transform: fIdx === index ? 'scale(1.08)' : 'scale(1)',
                        color: '#dc2626',
                        transition: 'transform 0.15s ease, opacity 0.15s ease, border-color 0.15s ease',
                      }}
                      onClick={() => onIndexChange(fIdx)}
                      title="Documento PDF"
                    >
                      <FilePdf size={20} weight="fill" />
                      <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#991b1b', lineHeight: 1 }}>PDF</span>
                    </div>
                  ) : (
                    <img
                      key={fIdx}
                      src={fUrl}
                      alt=""
                      draggable={false}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        objectFit: 'cover',
                        cursor: 'pointer',
                        border: fIdx === index ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.3)',
                        opacity: fIdx === index ? 1 : 0.55,
                        flexShrink: 0,
                        transform: fIdx === index ? 'scale(1.08)' : 'scale(1)',
                        transition: 'transform 0.15s ease, opacity 0.15s ease, border-color 0.15s ease',
                      }}
                      onClick={() => onIndexChange(fIdx)}
                    />
                  )
                ))}
              </div>
            </div>
          )}
        </div>
  );
};
