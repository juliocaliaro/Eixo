import React, { useState, useRef, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, Camera, FloppyDisk, WarningCircle, Plus, Receipt, Trash, CircleNotch, FilePdf } from '@phosphor-icons/react';
import { Obra } from '../types/obra';
import { generateUUID } from '../utils/uuid';
import { useFileIntake } from '../utils/useFileIntake';
import { storeNormalized, buildStoragePath } from '../utils/fileIntake';

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
  const [erro, setErro] = useState<string>('');
  const {
    items: fotos,
    handleInputChange: handleFilesChange,
    remove: handleRemoveFoto,
    clear: clearFotos,
  } = useFileIntake(setErro);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar apenas quando o modal for aberto (evita limpar o formulário se obras atualizar em segundo plano)
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setObraId(preselectedObraId || (obras.length === 1 ? obras[0].id : ''));
      setTitulo('');
      setObservacoes('');
      clearFotos();
      setErro('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, preselectedObraId]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!obraId) {
      setErro('Selecione uma obra.');
      return;
    }

    if (fotos.length === 0) {
      setErro('Faça o upload de pelo menos uma foto ou documento PDF da nota/recibo.');
      return;
    }

    setIsSaving(true);
    try {
      const notaId = generateUUID();
      const urlsUpload: string[] = [];

      // Envia os arquivos binários diretamente para o Supabase Storage (sem base64)
      for (let i = 0; i < fotos.length; i++) {
        const item = fotos[i];
        urlsUpload.push(
          await storeNormalized(item, {
            bucket: 'registro-notas',
            path: buildStoragePath(`${obraId}/notas/${notaId}_${i}`, item),
          })
        );
      }

      clearFotos();

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

            {/* Campo 2: Upload de Imagem ou PDF */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                  Upload de Imagem ou PDF da Nota *
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
                    <span>Adicionar outro arquivo</span>
                  </button>
                )}
              </div>

              {fotos.length === 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {/* Opção 1: Fotos ou Galeria (um único input unificado) */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '1.5px dashed var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '20px 14px',
                      textAlign: 'center',
                      background: 'var(--dark-coffee-50)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: 'var(--text-muted)',
                      transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
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
                      <Camera size={24} weight="bold" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>
                        Fotos ou Galeria
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                        Câmera ou imagens do celular
                      </span>
                    </div>
                  </div>

                  {/* Opção 2: Anexar Documento PDF */}
                  <div
                    onClick={() => pdfInputRef.current?.click()}
                    style={{
                      border: '1.5px dashed var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '20px 14px',
                      textAlign: 'center',
                      background: 'var(--dark-coffee-50)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: 'var(--text-muted)',
                      transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#dc2626';
                      e.currentTarget.style.background = '#fff5f5';
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
                        color: '#dc2626',
                      }}
                    >
                      <FilePdf size={24} weight="bold" />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>
                        Anexar PDF
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                        Nota fiscal em PDF
                      </span>
                    </div>
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
                        background: item.isPdf ? '#fef2f2' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.isPdf ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: 4, textAlign: 'center' }}>
                          <FilePdf size={26} weight="duotone" color="#dc2626" />
                          <span
                            style={{
                              fontSize: '0.60rem',
                              fontWeight: 700,
                              color: '#dc2626',
                              maxWidth: 62,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            PDF
                          </span>
                        </div>
                      ) : (
                        <img
                          src={item.previewUrl}
                          alt={`Nota ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
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
                        title="Remover arquivo"
                      >
                        <Trash size={12} weight="bold" />
                      </button>
                    </div>
                  ))}

                  {/* Botão Adicionar mais fotos da câmera ou galeria */}
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
                      gap: 3,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    title="Adicionar mais fotos (câmera ou galeria)"
                  >
                    <Camera size={18} weight="bold" />
                    <span style={{ fontSize: '0.64rem', fontWeight: 600 }}>+ Fotos</span>
                  </button>

                  {/* Botão Adicionar mais documentos PDF */}
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
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
                      color: '#dc2626',
                      gap: 3,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    title="Adicionar arquivo PDF"
                  >
                    <FilePdf size={18} weight="bold" />
                    <span style={{ fontSize: '0.64rem', fontWeight: 600 }}>+ PDF</span>
                  </button>
                </div>
              )}

              {/* Input unificado para fotos (câmera ou galeria do dispositivo) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFilesChange}
              />

              {/* Input exclusivo para seleção de arquivos PDF */}
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
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
