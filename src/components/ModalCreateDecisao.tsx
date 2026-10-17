import React, { useState, useRef, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, Camera, CircleNotch } from '@phosphor-icons/react';
import { Decisao, PerfilUsuario } from '../types/obra';
import { parseMoedaBR, formatarMoeda, mascararMoedaInput, proibirNaoNumericosMoeda } from '../utils/moeda';
import { generateUUID } from '../utils/uuid';
import { useFileIntake } from '../utils/useFileIntake';
import { blobToDataUrl } from '../utils/fileIntake';
import { atualizarPrazo, diasAssinados, novaDataPrevista } from '../utils/prazoDecisao';
import { formatarDataBR } from '../utils/data';

interface ModalCreateDecisaoProps {
  isOpen: boolean;
  onClose: () => void;
  perfilAtivo: PerfilUsuario;
  nomeUsuario: string;
  /** Data prevista atual da obra (YYYY-MM-DD), usada para exibir a nova data. */
  dataPrevistaObra?: string;
  onSubmit: (novaDecisao: Decisao) => void;
}

export const ModalCreateDecisao: React.FC<ModalCreateDecisaoProps> = ({
  isOpen,
  onClose,
  perfilAtivo,
  nomeUsuario,
  dataPrevistaObra,
  onSubmit,
}) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [aditivo, setAditivo] = useState<string>('');
  const [supressivo, setSupressivo] = useState<string>('');
  const [prazo, setPrazo] = useState({ acrescimo: '', reducao: '' });
  const { items: fotoItems, handleInputChange: handleFileUpload, remove: handleRemoveFoto, clear: clearFotos } = useFileIntake();
  const fotos = fotoItems.map((f) => f.previewUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleAditivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = mascararMoedaInput(e.target.value);
    setAditivo(masked);
    const parsed = parseMoedaBR(masked);
    if (parsed && parsed > 0) {
      setSupressivo('');
    }
  };

  const handleSupressivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = mascararMoedaInput(e.target.value);
    setSupressivo(masked);
    const parsed = parseMoedaBR(masked);
    if (parsed && parsed > 0) {
      setAditivo('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
    const agora = new Date().toISOString();
    // Fotos comprimidas pela política única; o contrato de Decisao carrega data URLs até o save (services/assets.ts sobe ao Storage)
    const fotosDataUrl = await Promise.all(fotoItems.map((f) => blobToDataUrl(f.blob)));

    const parsedAditivo = parseMoedaBR(aditivo);
    const parsedSupressivo = parseMoedaBR(supressivo);

    const temAditivo = parsedAditivo !== undefined && parsedAditivo > 0;
    const temSupressivo = !temAditivo && parsedSupressivo !== undefined && parsedSupressivo > 0;

    let valorAditivoFinal: number | undefined = undefined;
    let valorSupressivoFinal: number | undefined = undefined;
    let impactoFinanceiroCalculado: number | undefined = undefined;
    let tipoImpacto: 'aditivo' | 'supressivo' | undefined = undefined;

    if (temAditivo) {
      valorAditivoFinal = Math.abs(parsedAditivo!);
      impactoFinanceiroCalculado = valorAditivoFinal;
      tipoImpacto = 'aditivo';
    } else if (temSupressivo) {
      valorSupressivoFinal = Math.abs(parsedSupressivo!);
      impactoFinanceiroCalculado = -valorSupressivoFinal;
      tipoImpacto = 'supressivo';
    }

    const decisao: Decisao = {
      id: generateUUID(),
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      impactoFinanceiro: impactoFinanceiroCalculado,
      tipoImpactoFinanceiro: tipoImpacto,
      valorAditivo: valorAditivoFinal,
      valorSupressivo: valorSupressivoFinal,
      impactoPrazoDias: diasAssinados(prazo),
      criadaPor: perfilAtivo,
      criadorNome: nomeUsuario,
      criadaEm: agora,
      status: 'pendente',
      assinaturaCriador: {
        autor: perfilAtivo,
        nomeSignatario: nomeUsuario,
        assinadoEm: agora,
      },
      fotos: fotosDataUrl.length > 0 ? fotosDataUrl : undefined,
    };

      onSubmit(decisao);
      onClose();

      // Resetar
      setTitulo('');
      setDescricao('');
      setAditivo('');
      setSupressivo('');
      setPrazo({ acrescimo: '', reducao: '' });
      clearFotos();
    } finally {
      setIsSubmitting(false);
    }
  };

  const diasPrazo = diasAssinados(prazo);
  const novaData = novaDataPrevista(dataPrevistaObra, diasPrazo);
  const numAditivo = parseMoedaBR(aditivo);
  const numSupressivo = parseMoedaBR(supressivo);
  const hasAditivo = numAditivo !== undefined && numAditivo > 0;
  const hasSupressivo = numSupressivo !== undefined && numSupressivo > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Limpo */}
        <div className="modal-header" style={{ padding: '16px 20px' }}>
          <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>
            Nova Proposta
          </h2>
          <button onClick={onClose} className="btn-icon" title="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Formulário Enxuto */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px' }}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Título da Proposta</label>
              <input
                type="text"
                autoFocus
                required
                className="form-input"
                placeholder="Ex: Cor da tinta da sala"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Descrição</label>
              <textarea
                required
                rows={3}
                className="form-textarea"
                placeholder="Descreva o que foi combinado..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12, marginBottom: hasAditivo || hasSupressivo ? 8 : 14 }}>
              <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 20 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Aditivo (R$)</span>
                  <span style={{ whiteSpace: 'nowrap', fontSize: '0.70rem', color: hasSupressivo ? 'var(--text-muted)' : 'var(--primary-accent)', fontWeight: 600 }}>+ Acréscimo</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="0,00"
                  value={aditivo}
                  onChange={handleAditivoChange}
                  onKeyDown={proibirNaoNumericosMoeda}
                />
              </div>

              <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 20 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Supressivo (R$)</span>
                  <span style={{ whiteSpace: 'nowrap', fontSize: '0.70rem', color: hasAditivo ? 'var(--text-muted)' : '#16a34a', fontWeight: 600 }}>- Redução</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="0,00"
                  value={supressivo}
                  onChange={handleSupressivoChange}
                  onKeyDown={proibirNaoNumericosMoeda}
                />
              </div>
            </div>

            {/* Resumo do Impacto Financeiro Selecionado */}
            {hasAditivo && numAditivo && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--cinnamon-wood-50)',
                  border: '1px solid var(--cinnamon-wood-200)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 14,
                  fontSize: '0.80rem',
                }}
              >
                <span style={{ color: 'var(--cinnamon-wood-700)', fontWeight: 600 }}>Impacto no Contrato:</span>
                <strong style={{ color: 'var(--cinnamon-wood-700)', fontWeight: 700 }}>
                  + {formatarMoeda(numAditivo)} (Aditivo / Acréscimo)
                </strong>
              </div>
            )}

            {hasSupressivo && numSupressivo && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 14,
                  fontSize: '0.80rem',
                }}
              >
                <span style={{ color: '#15803d', fontWeight: 600 }}>Impacto no Contrato:</span>
                <strong style={{ color: '#15803d', fontWeight: 700 }}>
                  - {formatarMoeda(numSupressivo)} (Supressivo / Redução)
                </strong>
              </div>
            )}

            {/* Impacto no prazo (exclusão mútua) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12, marginBottom: diasPrazo ? 8 : 14 }}>
              <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 20 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Acréscimo de Prazo</span>
                  <span style={{ whiteSpace: 'nowrap', fontSize: '0.70rem', color: (diasPrazo ?? 0) < 0 ? 'var(--text-muted)' : 'var(--primary-accent)', fontWeight: 600 }}>+ Dias</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-input"
                  placeholder="0"
                  aria-label="Acréscimo de Prazo (+ Dias)"
                  value={prazo.acrescimo}
                  onChange={(e) => setPrazo((p) => atualizarPrazo('acrescimo', e.target.value, p))}
                />
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 20 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Redução de Prazo</span>
                  <span style={{ whiteSpace: 'nowrap', fontSize: '0.70rem', color: (diasPrazo ?? 0) > 0 ? 'var(--text-muted)' : '#16a34a', fontWeight: 600 }}>- Dias</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-input"
                  placeholder="0"
                  aria-label="Redução de Prazo (- Dias)"
                  value={prazo.reducao}
                  onChange={(e) => setPrazo((p) => atualizarPrazo('reducao', e.target.value, p))}
                />
              </div>
            </div>

            {diasPrazo !== undefined && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'var(--dark-coffee-50)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 14,
                  fontSize: '0.80rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                  Prazo: {diasPrazo > 0 ? `+${diasPrazo}` : diasPrazo} {Math.abs(diasPrazo) === 1 ? 'dia' : 'dias'}
                </span>
                <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                  {novaData ? `Nova data prevista: ${formatarDataBR(novaData)}` : 'Obra sem data prevista'}
                </strong>
              </div>
            )}

            {/* Anexo de Foto Opcional */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />

              {fotos.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  {fotos.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'relative',
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        overflow: 'hidden',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      <img src={f} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => handleRemoveFoto(i)}
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 16,
                          height: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: 9,
                        }}
                      >
                        <X size={10} weight="bold" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  >
                    + Foto
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <Camera size={14} />
                  <span>Anexar foto ou amostra (opcional)</span>
                </button>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="modal-footer" style={{ padding: '12px 20px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ fontSize: '0.84rem' }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!titulo.trim() || !descricao.trim() || isSubmitting}
              className="btn-primary"
              style={{
                fontSize: '0.84rem',
                opacity: !titulo.trim() || !descricao.trim() || isSubmitting ? 0.65 : 1,
                cursor: !titulo.trim() || !descricao.trim() || isSubmitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={14} className="spin-animate" weight="bold" />
                  <span>Criando e Assinando...</span>
                </>
              ) : (
                <span>Criar e Assinar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
