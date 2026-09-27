import React, { useState } from 'react';
import {
  Scales,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  PenNib,
  ShieldCheck,
  Money,
  CalendarBlank,
  Camera,
  ArrowsOut,
  X,
  WarningCircle,
  Check
} from '@phosphor-icons/react';
import { Obra, Decisao, PerfilUsuario } from '../types/obra';
import { ModalCreateDecisao } from './ModalCreateDecisao';
import { ModalConfirm } from './ModalConfirm';

interface DecisoesTabProps {
  obra: Obra;
  perfilAtivo: PerfilUsuario;
  nomeUsuario: string;
  onAddDecisao: (decisao: Decisao) => void;
  onAssinarDecisao: (decisaoId: string) => void;
  onRecusarDecisao: (decisaoId: string) => void;
}

export const DecisoesTab: React.FC<DecisoesTabProps> = ({
  obra,
  perfilAtivo,
  nomeUsuario,
  onAddDecisao,
  onAssinarDecisao,
  onRecusarDecisao,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'pendentes' | 'aprovadas'>('todas');
  const [lightboxFoto, setLightboxFoto] = useState<string | null>(null);
  const [confirmSignDecisao, setConfirmSignDecisao] = useState<Decisao | null>(null);
  const [confirmRecusarDecisao, setConfirmRecusarDecisao] = useState<Decisao | null>(null);

  const decisoes = obra.decisoes || [];

  const formatarDataHora = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getCategoriaLabel = (cat: Decisao['categoria']) => {
    switch (cat) {
      case 'acabamento':
        return 'Acabamentos';
      case 'projeto':
        return 'Projeto';
      case 'custo':
        return 'Financeiro';
      case 'prazo':
        return 'Cronograma';
      default:
        return 'Geral';
    }
  };

  // Contagem de pendências para o usuário logado
  const pendenciasUsuario = decisoes.filter(
    (d) => d.status === 'pendente' && d.criadaPor !== perfilAtivo
  );

  const decisoesFiltradas = decisoes.filter((d) => {
    if (filter === 'pendentes') return d.status === 'pendente';
    if (filter === 'aprovadas') return d.status === 'aprovada';
    return true;
  });

  return (
    <div className="decisoes-tab-container">
      {/* Cabeçalho da Aba */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
            Central de Decisões e Aprovações
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Registro de escolhas com validade de assinatura digital entre Construtor e Cliente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
          style={{ padding: '9px 16px', fontSize: '0.88rem' }}
        >
          <Plus size={16} weight="bold" />
          <span>Propor Nova Decisão</span>
        </button>
      </div>

      {/* Alerta de Decisões Pendentes da Minha Assinatura */}
      {pendenciasUsuario.length > 0 && (
        <div
          style={{
            background: 'var(--coral-glow-50)',
            border: '1.5px solid var(--coral-glow-300)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            boxShadow: '0 2px 8px rgba(181, 104, 74, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PenNib size={22} weight="bold" color="var(--primary-accent)" />
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--coral-glow-700)', display: 'block' }}>
                {pendenciasUsuario.length} decisão{pendenciasUsuario.length > 1 ? 'ões' : ''} aguardando sua assinatura digital!
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {perfilAtivo === 'cliente'
                  ? 'O construtor propôs escolhas que necessitam do seu aval para execução.'
                  : 'O cliente solicitou escolhas/mudanças que aguardam sua aprovação técnica.'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilter('pendentes')}
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            Ver Pendentes
          </button>
        </div>
      )}

      {/* Filtros em Pílula */}
      {decisoes.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setFilter('todas')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: filter === 'todas' ? 'var(--primary-accent)' : 'var(--border-hairline)',
              background: filter === 'todas' ? 'var(--coral-glow-50)' : '#ffffff',
              color: filter === 'todas' ? 'var(--primary-accent)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            Todas ({decisoes.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('pendentes')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: filter === 'pendentes' ? 'var(--primary-accent)' : 'var(--border-hairline)',
              background: filter === 'pendentes' ? 'var(--coral-glow-50)' : '#ffffff',
              color: filter === 'pendentes' ? 'var(--primary-accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Clock size={13} weight="bold" />
            <span>Pendentes ({decisoes.filter((d) => d.status === 'pendente').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('aprovadas')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: filter === 'aprovadas' ? '#16a34a' : 'var(--border-hairline)',
              background: filter === 'aprovadas' ? '#dcfce7' : '#ffffff',
              color: filter === 'aprovadas' ? '#16a34a' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CheckCircle size={13} weight="bold" />
            <span>Aprovadas por Ambos ({decisoes.filter((d) => d.status === 'aprovada').length})</span>
          </button>
        </div>
      )}

      {/* Conteúdo: Lista em Timeline Vertical ou Empty State */}
      {decisoes.length === 0 ? (
        <div
          style={{
            padding: '56px 20px',
            textAlign: 'center',
            background: '#ffffff',
            border: '1px dashed var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: 580,
            margin: '24px auto',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--coral-glow-50)',
              color: 'var(--primary-accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Scales size={22} weight="duotone" />
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            Nenhuma decisão registrada
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '0 auto 18px auto', maxWidth: 400, lineHeight: 1.5 }}>
            Registre escolhas de acabamentos, cores ou mudanças com assinatura digital entre Construtor e Cliente.
          </p>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Plus size={15} weight="bold" />
            <span>Propor Decisão</span>
          </button>
        </div>
      ) : (
        /* Linha do Tempo Vertical Contínua de Decisões */
        <div className="vertical-timeline-container" style={{ marginTop: 12 }}>
          {/* Trilho Vertical */}
          <div className="timeline-spine-line" style={{ top: 24, bottom: 20 }} />

          <div className="timeline-items-flow">
            {decisoesFiltradas.map((decisao, index) => {
              const isAprovada = decisao.status === 'aprovada';
              const isRecusada = decisao.status === 'recusada';
              const isPendente = decisao.status === 'pendente';
              const pendenteParaMim = isPendente && decisao.criadaPor !== perfilAtivo;
              const contraparteNome = decisao.criadaPor === 'construtor' ? 'Cliente' : 'Construtor';

              return (
                <div key={decisao.id} className="timeline-entry-row" style={{ marginBottom: 18 }}>
                  {/* Nó da Timeline com Ícone Representativo */}
                  <div
                    className={`timeline-spine-node ${isAprovada ? 'completed' : ''}`}
                    style={{
                      background: isAprovada ? '#dcfce7' : isRecusada ? '#fee2e2' : 'var(--coral-glow-50)',
                      borderColor: isAprovada ? '#16a34a' : isRecusada ? '#dc2626' : 'var(--primary-accent)',
                      color: isAprovada ? '#16a34a' : isRecusada ? '#dc2626' : 'var(--primary-accent)',
                    }}
                  >
                    {isAprovada ? (
                      <CheckCircle size={18} weight="bold" />
                    ) : isRecusada ? (
                      <XCircle size={18} weight="bold" />
                    ) : (
                      <Clock size={16} weight="bold" />
                    )}
                  </div>

                  {/* Conteúdo do Cartão da Decisão (Minimalista & Intuitivo) */}
                  <div className="timeline-entry-content">
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 20px',
                        boxShadow: 'var(--shadow-subtle)',
                        transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      {/* Top Bar do Card: Categoria, Autor/Data e Badge de Status */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'var(--dark-coffee-100)',
                              color: 'var(--dark-coffee-800)',
                            }}
                          >
                            {getCategoriaLabel(decisao.categoria)}
                          </span>

                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Proposta por <strong>{decisao.criadorNome}</strong> ({decisao.criadaPor === 'construtor' ? 'Construtor' : 'Cliente'}) • {formatarDataHora(decisao.criadaEm)}
                          </span>
                        </div>

                        {/* Badge de Status */}
                        <div>
                          {isAprovada ? (
                            <span
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: '#16a34a',
                                background: '#dcfce7',
                                padding: '2px 9px',
                                borderRadius: 999,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <CheckCircle size={13} weight="fill" />
                              Aprovada
                            </span>
                          ) : isRecusada ? (
                            <span
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: '#dc2626',
                                background: '#fee2e2',
                                padding: '2px 9px',
                                borderRadius: 999,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <XCircle size={13} weight="fill" />
                              Recusada
                            </span>
                          ) : pendenteParaMim ? (
                            <span
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: 'var(--primary-accent)',
                                background: 'var(--coral-glow-100)',
                                padding: '2px 9px',
                                borderRadius: 999,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Clock size={13} weight="bold" />
                              Aguardando sua assinatura
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                                background: 'var(--dark-coffee-100)',
                                padding: '2px 9px',
                                borderRadius: 999,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Clock size={13} />
                              Aguardando {contraparteNome}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Título da Decisão */}
                      <h3
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          margin: '0 0 6px 0',
                          lineHeight: 1.3,
                        }}
                      >
                        {decisao.titulo}
                      </h3>

                      {/* Descrição */}
                      <p
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--text-body)',
                          margin: '0 0 10px 0',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {decisao.descricao}
                      </p>

                      {/* Linha Compacta de Custo e Prazo (se existirem) */}
                      {(decisao.impactoFinanceiro !== undefined || decisao.impactoPrazoDias !== undefined) && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          {decisao.impactoFinanceiro !== undefined && (
                            <span
                              style={{
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                color: decisao.impactoFinanceiro > 0 ? 'var(--cinnamon-wood-700)' : '#16a34a',
                                background: decisao.impactoFinanceiro > 0 ? 'var(--cinnamon-wood-50)' : '#dcfce7',
                                border: `1px solid ${decisao.impactoFinanceiro > 0 ? 'var(--cinnamon-wood-200)' : '#bbf7d0'}`,
                                padding: '3px 8px',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Money size={13} weight="bold" />
                              {decisao.impactoFinanceiro > 0
                                ? `+ R$ ${decisao.impactoFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : 'Sem custo extra'}
                            </span>
                          )}

                          {decisao.impactoPrazoDias !== undefined && (
                            <span
                              style={{
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                color: 'var(--primary-accent)',
                                background: 'var(--coral-glow-50)',
                                border: '1px solid var(--coral-glow-200)',
                                padding: '3px 8px',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <CalendarBlank size={13} weight="bold" />
                              {decisao.impactoPrazoDias > 0
                                ? `+ ${decisao.impactoPrazoDias} dias úteis`
                                : 'Sem alteração no prazo'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Amostras / Fotos anexadas */}
                      {decisao.fotos && decisao.fotos.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Amostras ({decisao.fotos.length}):
                          </span>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {decisao.fotos.map((foto, fIdx) => (
                              <div
                                key={fIdx}
                                onClick={() => setLightboxFoto(foto)}
                                style={{
                                  width: 54,
                                  height: 54,
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  border: '1px solid var(--border-hairline)',
                                  cursor: 'pointer',
                                  position: 'relative',
                                }}
                                title="Clique para ampliar amostra"
                              >
                                <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rodapé Minimalista: Assinaturas Digitais e Ações */}
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 12,
                          borderTop: '1px solid var(--border-hairline)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        {/* Status de Assinatura Auditável */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {isAprovada ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontWeight: 600 }}>
                              <ShieldCheck size={16} weight="fill" />
                              <span>
                                Assinada por <strong>{decisao.assinaturaCriador.nomeSignatario}</strong> e <strong>{decisao.assinaturaContraparte?.nomeSignatario}</strong> em {formatarDataHora(decisao.assinaturaContraparte?.assinadoEm)}
                              </span>
                            </div>
                          ) : isRecusada ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontWeight: 600 }}>
                              <XCircle size={16} weight="fill" />
                              <span>Proposta recusada</span>
                            </div>
                          ) : pendenteParaMim ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--coral-glow-700)', fontWeight: 600 }}>
                              <PenNib size={15} weight="bold" />
                              <span>Aguardando sua validação formal</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Clock size={14} />
                              <span>Aguardando assinatura digital de {contraparteNome}</span>
                            </div>
                          )}
                        </div>

                        {/* Botões de Ação Imediata (quando pendente para o perfil ativo) */}
                        {pendenteParaMim && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => setConfirmRecusarDecisao(decisao)}
                              className="btn-secondary"
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.80rem',
                                color: 'var(--coral-glow-700)',
                              }}
                            >
                              Recusar
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmSignDecisao(decisao)}
                              className="btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.80rem' }}
                            >
                              <PenNib size={13} weight="bold" />
                              <span>Concordar e Assinar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Criação de Decisão */}
      <ModalCreateDecisao
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        perfilAtivo={perfilAtivo}
        nomeUsuario={nomeUsuario}
        onSubmit={onAddDecisao}
      />

      {/* Confirmação de Assinatura */}
      {confirmSignDecisao && (
        <ModalConfirm
          isOpen={true}
          title="Assinatura Digital de Decisão"
          message={`Ao assinar, você (${nomeUsuario}) confirma que concorda com todos os termos e especificações de "${confirmSignDecisao.titulo}". Esta ação ficará registrada no diário da obra com validade combinada.`}
          confirmText="Confirmar e Assinar Digitalmente"
          cancelText="Voltar"
          variant="info"
          onConfirm={() => {
            onAssinarDecisao(confirmSignDecisao.id);
            setConfirmSignDecisao(null);
          }}
          onCancel={() => setConfirmSignDecisao(null)}
        />
      )}

      {/* Confirmação de Recusa */}
      {confirmRecusarDecisao && (
        <ModalConfirm
          isOpen={true}
          title="Recusar Decisão"
          message={`Tem certeza que deseja recusar a proposta "${confirmRecusarDecisao.titulo}"? A contraparte será notificada.`}
          confirmText="Recusar Decisão"
          cancelText="Voltar"
          variant="danger"
          onConfirm={() => {
            onRecusarDecisao(confirmRecusarDecisao.id);
            setConfirmRecusarDecisao(null);
          }}
          onCancel={() => setConfirmRecusarDecisao(null)}
        />
      )}

      {/* Lightbox para fotos de amostra */}
      {lightboxFoto && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 120, background: 'rgba(15, 12, 4, 0.92)' }}
          onClick={() => setLightboxFoto(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxFoto}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
            />
            <button
              onClick={() => setLightboxFoto(null)}
              style={{
                position: 'absolute',
                top: -16,
                right: -16,
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
