import React, { useState } from 'react';
import {
  HardHat,
  Plus,
  Buildings,
  MapPin,
  CalendarBlank,
  User,
  ArrowRight,
  Trash,
  CheckCircle,
  Clock,
  Copy,
  Check,
} from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';
import { ModalConfirm } from './ModalConfirm';

interface ObraListProps {
  obras: Obra[];
  onSelectObra: (obraId: string) => void;
  onOpenCreateModal: () => void;
  onDeleteObra: (obraId: string) => void;
  onLoadDemo?: () => void;
  perfilAtivo?: PerfilUsuario;
  onOpenSettings?: () => void;
}

export const ObraList: React.FC<ObraListProps> = ({
  obras,
  onSelectObra,
  onOpenCreateModal,
  onDeleteObra,
  onLoadDemo,
  perfilAtivo = 'construtor',
  onOpenSettings,
}) => {
  const [deleteObraTarget, setDeleteObraTarget] = useState<{ id: string; nome: string } | null>(null);
  const [copiedObraId, setCopiedObraId] = useState<string | null>(null);

  const handleCopyEndereco = (e: React.MouseEvent, endereco: string, obraId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!endereco) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(endereco);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = endereco;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(textarea);
    }

    setCopiedObraId(obraId);
    setTimeout(() => {
      setCopiedObraId((prev) => (prev === obraId ? null : prev));
    }, 2000);
  };
  // Empty State com âncora visual fotográfica forte (conforme frontend-skill)
  if (obras.length === 0) {
    return (
      <div>
        <div className="hero-visual-anchor">
          <img
            src="https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=1600&auto=format&fit=crop&q=80"
            alt="Canteiro de obras moderno"
            className="hero-visual-bg"
          />
          <div className="hero-visual-overlay" />
          <div className="hero-visual-content">
            <span className="hero-tag">Gestão de Obras & Reformas</span>
            <h1 className="hero-title">Eixo</h1>
            <p className="hero-description">
              Acompanhamento transparente de cronogramas, evidências de canteiro e decisões com assinatura bilateral.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {perfilAtivo !== 'cliente' && (
                <button
                  onClick={onOpenCreateModal}
                  className="btn-primary"
                  style={{ padding: '12px 22px', fontSize: '0.96rem' }}
                >
                  <Plus size={20} weight="bold" />
                  <span>Cadastrar Primeira Obra</span>
                </button>
              )}
              {onLoadDemo && (
                <button
                  onClick={onLoadDemo}
                  className="btn-secondary"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    padding: '12px 20px',
                    fontSize: '0.96rem',
                  }}
                >
                  <span>Explorar Obra Demonstrativa</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Informações utilitárias concisas sobre o fluxo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            paddingTop: 8,
          }}
        >
          <div style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
              1. Estruturação Rápida
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Selecione pacotes prontos de Construção ou Reforma com etapas técnicas catalogadas.
            </p>
          </div>
          <div style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
              2. Checklist Diário
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Marque o avanço de cada serviço e registre fotos do canteiro para o cliente.
            </p>
          </div>
          <div style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
              3. Medição de Avanço
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Cálculo ponderado transparente do progresso físico total da obra em tempo real.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Lista de Obras: Cardless com Divisores e Escaneabilidade Imediata
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            {perfilAtivo === 'cliente' ? 'Obras em Acompanhamento' : 'Obras em Andamento'}
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {obras.length} {obras.length === 1 ? 'projeto ativo' : 'projetos ativos'}
          </p>
        </div>

        {perfilAtivo !== 'cliente' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onOpenCreateModal} className="btn-primary">
              <Plus size={18} weight="bold" />
              <span>Nova Obra</span>
            </button>
          </div>
        )}
      </div>

      <div className="cardless-section">
        {obras.map((obra) => {
          const todasTarefas = obra.etapas.flatMap((e) => e.tarefas);
          const totalTarefas = todasTarefas.length;
          const concluidas = todasTarefas.filter((t) => t.concluida).length;
          const percentual = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;

          return (
            <React.Fragment key={obra.id}>
              {/* ========================================================
                  VERSÃO DESKTOP (Inalterada)
                  ======================================================== */}
              <div
                className="cardless-row obra-card-desktop"
                role="button"
                tabIndex={0}
                aria-label={`Abrir detalhes da obra ${obra.nome}`}
                onClick={() => onSelectObra(obra.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectObra(obra.id);
                  }
                }}
              >
                {/* Identificação da Obra */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        color: 'var(--text-main)',
                        letterSpacing: '-0.2px',
                      }}
                    >
                      {obra.nome}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--dark-coffee-100)',
                        color: 'var(--dark-coffee-800)',
                      }}
                    >
                      {obra.etapas.length} etapas
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>
                      Cliente: <strong style={{ color: 'var(--text-body)' }}>{obra.cliente}</strong>
                    </span>
                    {obra.endereco && (
                      <>
                        <span style={{ color: 'var(--border-hairline)', flexShrink: 0 }}>•</span>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            minWidth: 0,
                            overflow: 'hidden',
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: 'var(--text-muted)',
                            }}
                            title={obra.endereco}
                          >
                            {obra.endereco}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleCopyEndereco(e, obra.endereco, obra.id)}
                            onKeyDown={(e) => e.stopPropagation()}
                            title={copiedObraId === obra.id ? 'Endereço copiado!' : 'Copiar endereço'}
                            aria-label="Copiar endereço"
                            style={{
                              background: copiedObraId === obra.id ? 'var(--dark-coffee-100)' : 'transparent',
                              border: 'none',
                              padding: '2px 4px',
                              cursor: 'pointer',
                              color: copiedObraId === obra.id ? '#16a34a' : 'var(--text-muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              borderRadius: 3,
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {copiedObraId === obra.id ? (
                              <>
                                <Check size={14} weight="bold" color="#16a34a" />
                                <span style={{ fontSize: '0.70rem', color: '#16a34a', fontWeight: 600 }}>Copiado</span>
                              </>
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Data Prevista */}
                <div style={{ width: '130px', flexShrink: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Previsão
                  </span>
                  <strong style={{ color: 'var(--text-body)' }}>
                    {obra.dataPrevista ? obra.dataPrevista.split('-').reverse().join('/') : 'Não informada'}
                  </strong>
                </div>

                {/* Barra de Progresso Compacta */}
                <div style={{ width: '170px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Progresso</span>
                    <strong style={{ color: 'var(--primary-accent)' }}>{percentual}%</strong>
                  </div>
                  <div className="progress-strip-track" style={{ height: 5 }}>
                    <div className="progress-strip-bar" style={{ width: `${percentual}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>{concluidas}/{totalTarefas} serviços</span>
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  {perfilAtivo !== 'cliente' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteObraTarget({ id: obra.id, nome: obra.nome });
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="btn-icon"
                      style={{ color: 'var(--text-muted)' }}
                      title="Excluir obra"
                    >
                      <Trash size={15} />
                    </button>
                  )}
                  <div style={{ color: 'var(--primary-accent)', display: 'flex', alignItems: 'center' }}>
                    <ArrowRight size={18} weight="bold" />
                  </div>
                </div>
              </div>

              {/* ========================================================
                  VERSÃO MOBILE (Exclusiva para <= 768px)
                  ======================================================== */}
              <div
                className="cardless-row obra-card-mobile"
                role="button"
                tabIndex={0}
                aria-label={`Abrir detalhes da obra ${obra.nome}`}
                onClick={() => onSelectObra(obra.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectObra(obra.id);
                  }
                }}
              >
                {/* Cabeçalho da Obra (Título + Tag) e Linhas Reestruturadas */}
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        color: 'var(--text-main)',
                        letterSpacing: '-0.2px',
                      }}
                    >
                      {obra.nome}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--dark-coffee-100)',
                        color: 'var(--dark-coffee-800)',
                      }}
                    >
                      {obra.etapas.length} etapas
                    </span>
                  </div>

                  {/* Linha 1: Cliente e Previsão lado a lado (Row com space-between) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginTop: 8,
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                      <User size={15} color="var(--primary-accent)" weight="bold" style={{ flexShrink: 0 }} />
                      <strong
                        style={{
                          color: 'var(--text-body)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {obra.cliente}
                      </strong>
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <CalendarBlank size={15} color="var(--primary-accent)" weight="bold" />
                      <strong style={{ color: 'var(--text-body)' }}>
                        {obra.dataPrevista ? obra.dataPrevista.split('-').reverse().join('/') : 'Não informada'}
                      </strong>
                    </div>
                  </div>

                  {/* Linha 2: Endereço completo com ação de copiar */}
                  {obra.endereco ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginTop: 8,
                        padding: '6px 10px',
                        background: 'var(--dark-coffee-50)',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '0.80rem',
                        color: 'var(--text-muted)',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                        <MapPin size={15} color="var(--primary-accent)" weight="bold" style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: 'var(--text-body)',
                          }}
                          title={obra.endereco}
                        >
                          {obra.endereco}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleCopyEndereco(e, obra.endereco, obra.id)}
                        onKeyDown={(e) => e.stopPropagation()}
                        title={copiedObraId === obra.id ? 'Endereço copiado!' : 'Copiar endereço'}
                        aria-label="Copiar endereço"
                        style={{
                          background: copiedObraId === obra.id ? 'var(--dark-coffee-100)' : 'transparent',
                          border: 'none',
                          padding: '4px 6px',
                          cursor: 'pointer',
                          color: copiedObraId === obra.id ? '#16a34a' : 'var(--text-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          borderRadius: 4,
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {copiedObraId === obra.id ? (
                          <>
                            <Check size={15} weight="bold" color="#16a34a" />
                            <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>Copiado</span>
                          </>
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Barra de Progresso Compacta */}
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Progresso</span>
                    <strong style={{ color: 'var(--primary-accent)' }}>{percentual}%</strong>
                  </div>
                  <div className="progress-strip-track" style={{ height: 5 }}>
                    <div className="progress-strip-bar" style={{ width: `${percentual}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>{concluidas}/{totalTarefas} serviços</span>
                  </div>
                </div>

                {/* Linha inferior com Ações (Lixeira e Seta) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    {perfilAtivo !== 'cliente' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteObraTarget({ id: obra.id, nome: obra.nome });
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="btn-icon"
                        style={{ color: 'var(--text-muted)' }}
                        title="Excluir obra"
                      >
                        <Trash size={15} />
                      </button>
                    )}
                  </div>
                  <div style={{ color: 'var(--primary-accent)', display: 'flex', alignItems: 'center' }}>
                    <ArrowRight size={18} weight="bold" />
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {deleteObraTarget && (
        <ModalConfirm
          isOpen={true}
          title="Excluir Obra"
          message={`Tem certeza que deseja excluir "${deleteObraTarget.nome}"? Todos os dados, etapas e fotos serão removidos.`}
          confirmText="Sim, excluir obra"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            onDeleteObra(deleteObraTarget.id);
            setDeleteObraTarget(null);
          }}
          onCancel={() => setDeleteObraTarget(null)}
        />
      )}
    </div>
  );
};
