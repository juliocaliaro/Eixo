import React, { useState, useRef } from 'react';
import { X, Camera } from '@phosphor-icons/react';
import { Decisao, PerfilUsuario } from '../types/obra';

interface ModalCreateDecisaoProps {
  isOpen: boolean;
  onClose: () => void;
  perfilAtivo: PerfilUsuario;
  nomeUsuario: string;
  onSubmit: (novaDecisao: Decisao) => void;
}

export const ModalCreateDecisao: React.FC<ModalCreateDecisaoProps> = ({
  isOpen,
  onClose,
  perfilAtivo,
  nomeUsuario,
  onSubmit,
}) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [aditivo, setAditivo] = useState<string>('');
  const [supressivo, setSupressivo] = useState<string>('');
  const [impactoPrazoDias, setImpactoPrazoDias] = useState<string>('');
  const [fotos, setFotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) return;

    const agora = new Date().toISOString();

    const parsedAditivo = aditivo.trim() ? parseFloat(aditivo.replace(',', '.')) : NaN;
    const parsedSupressivo = supressivo.trim() ? parseFloat(supressivo.replace(',', '.')) : NaN;

    const temAditivo = !isNaN(parsedAditivo) && parsedAditivo > 0;
    const temSupressivo = !isNaN(parsedSupressivo) && parsedSupressivo > 0;

    let valorAditivoFinal: number | undefined = undefined;
    let valorSupressivoFinal: number | undefined = undefined;
    let impactoFinanceiroCalculado: number | undefined = undefined;
    let tipoImpacto: 'aditivo' | 'supressivo' | 'ambos' | undefined = undefined;

    if (temAditivo && temSupressivo) {
      valorAditivoFinal = Math.abs(parsedAditivo);
      valorSupressivoFinal = Math.abs(parsedSupressivo);
      impactoFinanceiroCalculado = valorAditivoFinal - valorSupressivoFinal;
      tipoImpacto = 'ambos';
    } else if (temAditivo) {
      valorAditivoFinal = Math.abs(parsedAditivo);
      impactoFinanceiroCalculado = valorAditivoFinal;
      tipoImpacto = 'aditivo';
    } else if (temSupressivo) {
      valorSupressivoFinal = Math.abs(parsedSupressivo);
      impactoFinanceiroCalculado = -valorSupressivoFinal;
      tipoImpacto = 'supressivo';
    }

    const decisao: Decisao = {
      id: `decisao_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      impactoFinanceiro: impactoFinanceiroCalculado,
      tipoImpactoFinanceiro: tipoImpacto,
      valorAditivo: valorAditivoFinal,
      valorSupressivo: valorSupressivoFinal,
      impactoPrazoDias: impactoPrazoDias ? parseInt(impactoPrazoDias, 10) : undefined,
      criadaPor: perfilAtivo,
      criadorNome: nomeUsuario,
      criadaEm: agora,
      status: 'pendente',
      assinaturaCriador: {
        autor: perfilAtivo,
        nomeSignatario: nomeUsuario,
        assinadoEm: agora,
      },
      fotos: fotos.length > 0 ? fotos : undefined,
    };

    onSubmit(decisao);
    onClose();

    // Resetar
    setTitulo('');
    setDescricao('');
    setAditivo('');
    setSupressivo('');
    setImpactoPrazoDias('');
    setFotos([]);
  };

  const numAditivo = parseFloat(aditivo.replace(',', '.'));
  const numSupressivo = parseFloat(supressivo.replace(',', '.'));
  const hasAditivo = !isNaN(numAditivo) && numAditivo > 0;
  const hasSupressivo = !isNaN(numSupressivo) && numSupressivo > 0;
  const saldoCalculado = (hasAditivo ? numAditivo : 0) - (hasSupressivo ? numSupressivo : 0);

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
            Nova Decisão
          </h2>
          <button onClick={onClose} className="btn-icon" title="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Formulário Enxuto */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px' }}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Título da Decisão</label>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: hasAditivo && hasSupressivo ? 8 : 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Aditivo (R$)</span>
                  <span style={{ fontSize: '0.70rem', color: 'var(--primary-accent)', fontWeight: 600 }}>+ Acréscimo</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="0,00"
                  value={aditivo}
                  onChange={(e) => setAditivo(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Supressivo (R$)</span>
                  <span style={{ fontSize: '0.70rem', color: '#16a34a', fontWeight: 600 }}>- Redução</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="0,00"
                  value={supressivo}
                  onChange={(e) => setSupressivo(e.target.value)}
                />
              </div>
            </div>

            {/* Resumo Dinâmico do Saldo quando ambos preenchidos */}
            {hasAditivo && hasSupressivo && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--dark-coffee-50)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 14,
                  fontSize: '0.80rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Saldo Líquido da Decisão:</span>
                <strong
                  style={{
                    color: saldoCalculado > 0 ? 'var(--primary-accent)' : saldoCalculado < 0 ? '#16a34a' : 'var(--text-main)',
                    fontWeight: 700,
                  }}
                >
                  {saldoCalculado > 0
                    ? `+ R$ ${saldoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Acréscimo)`
                    : saldoCalculado < 0
                    ? `- R$ ${Math.abs(saldoCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Economia / Redução)`
                    : 'R$ 0,00 (Neutro)'}
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
              disabled={!titulo.trim() || !descricao.trim()}
              className="btn-primary"
              style={{ fontSize: '0.84rem' }}
            >
              Criar e Assinar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
