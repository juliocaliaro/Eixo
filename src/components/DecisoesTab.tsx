import React, { useState, useRef, useEffect } from 'react';
import { usePopoverDismiss } from '../hooks/usePopoverDismiss';
import { useToggleMap } from '../hooks/useToggleMap';
import { Lightbox } from './Lightbox';
// Ordem do CSS: index e foundation antes deste arquivo (App importa os componentes antes de main.tsx importar os CSS globais)
import '../index.css';
import '../styles/foundation.css';
import '../styles/decisoes-diario.css';
import { useEscapeKey } from '../hooks/useEscapeKey';
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
  ArrowsOut,
  X,
  Check,
  User,
  Tag,
  WhatsappLogo,
  CurrencyDollar,
  CaretDown,
  Funnel,
} from '@phosphor-icons/react';
import { Obra, Decisao, PerfilUsuario } from '../types/obra';
import { ModalCreateDecisao } from './ModalCreateDecisao';
import { ModalConfirm } from './ModalConfirm';
import { EmptyState } from './EmptyState';
import { formatarMoeda as formatarMoedaBR, formatarValorBR } from '../utils/moeda';
import { formatarDataHoraBR } from '../utils/data';
import {
  impactoDaDecisao,
  totaisFinanceiros,
  montarMensagemWhatsApp,
  montarUrlDecisao,
  linkWhatsApp,
} from '../utils/obraMetrics';

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
  const [filter, setFilter] = useState<'todas' | 'pendentes' | 'aprovadas' | 'recusadas'>('todas');
  const [lightboxFoto, setLightboxFoto] = useState<string | null>(null);
  const [confirmSignDecisao, setConfirmSignDecisao] = useState<Decisao | null>(null);
  const [confirmRecusarDecisao, setConfirmRecusarDecisao] = useState<Decisao | null>(null);
  const [expandedMobileIds, toggleMobileExpand] = useToggleMap();
  const [isPainelFinanceiroOpenMobile, setIsPainelFinanceiroOpenMobile] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  usePopoverDismiss(mobileFilterRef, isMobileFilterOpen, () => setIsMobileFilterOpen(false));


  const decisoes = obra.decisoes || [];

  // Cálculos Financeiros de Aditivos e Supressivos (fonte única: utils/obraMetrics)
  const totais = totaisFinanceiros(obra);
  const orcamentoBase = totais.orcamentoBase;
  const aditivosAprovados = totais.aprovadas.aditivos;
  const supressivosAprovados = totais.aprovadas.supressivos;
  const aditivosPendentes = totais.pendentes.aditivos;
  const supressivosPendentes = totais.pendentes.supressivos;
  const totalInvestimento = totais.investimentoAtualizado;

  // Painel financeiro em valores inteiros (sem centavos)
  const formatarMoeda = (val: number) => formatarMoedaBR(val, 0);

  const gerarLinkWhatsAppDecisao = (decisao: Decisao) => {
    const urlObra = typeof window !== 'undefined'
      ? montarUrlDecisao(`${window.location.origin}${window.location.pathname}`, obra.id, decisao.criadaPor)
      : '';
    return linkWhatsApp(montarMensagemWhatsApp({ obraNome: obra.nome, decisao, urlObra }));
  };

  const formatarDataHora = formatarDataHoraBR;
  const temValorContrato = orcamentoBase > 0 || aditivosAprovados > 0 || supressivosAprovados > 0;

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

  const opcoesFiltro: Array<{ valor: 'todas' | 'pendentes' | 'aprovadas' | 'recusadas'; texto: string; total: number }> = [
    { valor: 'todas', texto: 'Todas', total: decisoes.length },
    { valor: 'pendentes', texto: 'Pendentes', total: decisoes.filter((d) => d.status === 'pendente').length },
    { valor: 'aprovadas', texto: 'Aprovadas', total: decisoes.filter((d) => d.status === 'aprovada').length },
    ...(decisoes.some((d) => d.status === 'recusada')
      ? [{ valor: 'recusadas' as const, texto: 'Recusadas', total: decisoes.filter((d) => d.status === 'recusada').length }]
      : []),
  ];

  const decisoesFiltradas = decisoes.filter((d) => {
    if (filter === 'pendentes') return d.status === 'pendente';
    if (filter === 'aprovadas') return d.status === 'aprovada';
    if (filter === 'recusadas') return d.status === 'recusada';
    return true;
  });

  const textoPrazo = (dias?: number) => {
    if (!dias) return 'Sem alteração no prazo previsto';
    if (dias > 0) return `Prazo: +${dias} dias úteis`;
    return `Prazo: ${dias} dias úteis (antecipação)`;
  };

  const contraparteLabel = (d: Decisao) => (d.criadaPor === 'construtor' ? 'Cliente' : 'Construtor');

  const renderStatusBadge = (decisao: Decisao, pendenteParaMim: boolean) => {
    if (decisao.status === 'aprovada') {
      return (
        <span className="badge badge--ok">
          <CheckCircle size={13} weight="bold" />
          Aprovada
        </span>
      );
    }
    if (decisao.status === 'recusada') {
      return (
        <span className="badge badge--danger">
          <XCircle size={13} weight="bold" />
          Recusada
        </span>
      );
    }
    return (
      <span className="badge badge--accent">
        <Clock size={13} weight="bold" />
        {pendenteParaMim ? 'Aguarda você' : `Aguardando ${contraparteLabel(decisao).toLowerCase()}`}
      </span>
    );
  };

  const renderValorBadge = (decisao: Decisao, tamanho: 'compact' | 'regular' = 'compact') => {
    const impacto = impactoDaDecisao(decisao);
    if (!impacto.temImpactoFinanceiro) return null;

    const regular = tamanho === 'regular';
    return (
      <span
        style={{
          fontSize: regular ? '0.8rem' : '0.75rem',
          fontWeight: 600,
          color: impacto.temAditivo ? 'var(--cinnamon-wood-700)' : '#15803d',
          background: impacto.temAditivo ? 'var(--cinnamon-wood-50)' : '#dcfce7',
          border: `1px solid ${impacto.temAditivo ? 'var(--cinnamon-wood-200)' : '#bbf7d0'}`,
          padding: regular ? '4px 10px' : '3px 8px',
          borderRadius: 6,
          display: 'inline-flex',
          alignItems: 'center',
          gap: regular ? 5 : 4,
        }}
      >
        <Money size={regular ? 15 : 13} weight="bold" />
        {impacto.temAditivo
          ? `Aditivo: +R$ ${formatarValorBR(impacto.aditivo)}`
          : `Supressivo: -R$ ${formatarValorBR(impacto.supressivo)}`}
      </span>
    );
  };

  /** Valor da decisão em texto simples (linha recolhida no mobile). */
  const renderValorTexto = (decisao: Decisao) => {
    const impacto = impactoDaDecisao(decisao);
    if (!impacto.temImpactoFinanceiro) return null;
    return impacto.temAditivo ? (
      <span className="dec-valor dec-valor--aditivo">Aditivo +R$ {formatarValorBR(impacto.aditivo)}</span>
    ) : (
      <span className="dec-valor dec-valor--supressivo">Supressivo -R$ {formatarValorBR(impacto.supressivo)}</span>
    );
  };

  /** Assinaturas em duas linhas simples (mobile). Sem ID técnico, sem caixas aninhadas. */
  const renderAssinaturas = (decisao: Decisao) => {
    const isRecusada = decisao.status === 'recusada';
    return (
      <ul className="dec-assinaturas" aria-label="Assinaturas">
        <li className="dec-assinatura dec-assinatura--ok">
          <Check size={14} weight="bold" />
          <span>
            {decisao.assinaturaCriador.nomeSignatario} assinou em {formatarDataHora(decisao.assinaturaCriador.assinadoEm)}
          </span>
        </li>
        {decisao.assinaturaContraparte ? (
          <li className="dec-assinatura dec-assinatura--ok">
            <Check size={14} weight="bold" />
            <span>
              {decisao.assinaturaContraparte.nomeSignatario} assinou em {formatarDataHora(decisao.assinaturaContraparte.assinadoEm)}
            </span>
          </li>
        ) : isRecusada ? (
          <li className="dec-assinatura dec-assinatura--no">
            <XCircle size={14} weight="bold" />
            <span>{contraparteLabel(decisao)} recusou</span>
          </li>
        ) : (
          <li className="dec-assinatura">
            <Clock size={14} weight="bold" />
            <span>{contraparteLabel(decisao)}: assinatura pendente</span>
          </li>
        )}
      </ul>
    );
  };

  return (
    <div className="decisoes-tab-container">
      {/* Cabeçalho da Aba: título + UMA ação primária */}
      <div className="dec-head">
        <h2 className="tab-title" style={{ margin: 0 }}>
          Decisões
        </h2>

        <button type="button" onClick={() => setIsCreateModalOpen(true)} className="btn-primary dec-cta tab-cta">
          <Plus size={16} weight="bold" />
          <span>Nova proposta</span>
        </button>
      </div>

      {/* Painel Financeiro de Aditivos Contratuais - Versão Desktop */}
      <div
        className="painel-financeiro-desktop"
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CurrencyDollar size={18} weight="bold" color="var(--primary-accent)" />
            <strong style={{ fontSize: '0.90rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Painel Financeiro & Aditivos Contratuais
            </strong>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Consolidação de orçamento base e alterações aprovadas
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {/* Orçamento Base */}
          <div style={{ padding: '12px 14px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
              Orçamento Base
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
              {orcamentoBase > 0 ? formatarMoeda(orcamentoBase) : 'Não informado'}
            </div>
          </div>

          {/* Aditivos Aprovados */}
          <div style={{ padding: '12px 14px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--cinnamon-wood-700)', fontWeight: 700, display: 'block' }}>
              Aditivos Aprovados
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: aditivosAprovados > 0 ? 'var(--cinnamon-wood-700)' : 'var(--text-main)', marginTop: 4 }}>
              {aditivosAprovados > 0 ? `+${formatarMoeda(aditivosAprovados)}` : 'R$ 0,00'}
            </div>
          </div>

          {/* Supressivos Aprovados */}
          {supressivosAprovados > 0 && (
            <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#15803d', fontWeight: 700, display: 'block' }}>
                Supressivos Aprovados
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                -{formatarMoeda(Math.abs(supressivosAprovados))}
              </div>
            </div>
          )}

          {/* Total Investimento */}
          <div style={{ padding: '12px 14px', background: 'var(--coral-glow-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--coral-glow-200)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--primary-accent)', fontWeight: 700, display: 'block' }}>
              Investimento Atualizado
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-accent)', marginTop: 4 }}>
              {orcamentoBase > 0 || aditivosAprovados > 0 || supressivosAprovados > 0 ? formatarMoeda(totalInvestimento) : 'A definir'}
            </div>
          </div>

          {/* Propostas em Análise */}
          {(aditivosPendentes > 0 || supressivosPendentes > 0) && (
            <div style={{ padding: '12px 14px', background: '#fef3c7', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#b45309', fontWeight: 700, display: 'block' }}>
                Propostas em Análise
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b45309', marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {aditivosPendentes > 0 && <span>+{formatarMoeda(aditivosPendentes)}</span>}
                {aditivosPendentes > 0 && supressivosPendentes > 0 && <span style={{ color: '#d97706' }}>|</span>}
                {supressivosPendentes > 0 && <span style={{ color: '#15803d' }}>-{formatarMoeda(Math.abs(supressivosPendentes))}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: resumo financeiro (accordion, fechado) + filtro único numa só linha */}
      <div className="toolbar dec-toolbar" ref={mobileFilterRef}>
        <button
          type="button"
          className="dec-resumo-toggle toolbar-lead"
          aria-expanded={isPainelFinanceiroOpenMobile}
          onClick={() => setIsPainelFinanceiroOpenMobile((prev) => !prev)}
        >
          <CurrencyDollar size={18} weight="bold" color="var(--primary-accent)" />
          <span className="dec-resumo-label">Resumo<span className="dec-resumo-extra"> financeiro</span></span>
          <span className="dec-resumo-valor">{temValorContrato ? formatarMoeda(totalInvestimento) : 'A definir'}</span>
          <CaretDown
            size={14}
            weight="bold"
            className="dec-caret"
            data-open={isPainelFinanceiroOpenMobile}
          />
        </button>

        {decisoes.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen((prev) => !prev)}
              className="btn-icon"
              title="Filtrar por situação"
              aria-label="Filtrar por situação"
              aria-haspopup="menu"
              aria-expanded={isMobileFilterOpen}
            >
              <Funnel size={18} weight={filter !== 'todas' ? 'fill' : 'regular'} />
              {filter !== 'todas' && <span className="dot" />}
            </button>

            {isMobileFilterOpen && (
              <div className="toolbar-popover" role="menu">
                {opcoesFiltro.map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    role="menuitemradio"
                    aria-checked={filter === o.valor}
                    className="option dec-option"
                    onClick={() => {
                      setFilter(o.valor);
                      setIsMobileFilterOpen(false);
                    }}
                  >
                    <span>{o.texto}</span>
                    <span className="dec-option-count">{o.total}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {isPainelFinanceiroOpenMobile && (
        <dl className="dec-resumo-lista">
          <div className="dec-resumo-linha">
            <dt>Orçamento base</dt>
            <dd>{orcamentoBase > 0 ? formatarMoeda(orcamentoBase) : 'Não informado'}</dd>
          </div>
          <div className="dec-resumo-linha">
            <dt>Aditivos aprovados</dt>
            <dd>{aditivosAprovados > 0 ? `+${formatarMoeda(aditivosAprovados)}` : formatarMoeda(0)}</dd>
          </div>
          {supressivosAprovados > 0 && (
            <div className="dec-resumo-linha">
              <dt>Supressivos aprovados</dt>
              <dd>-{formatarMoeda(Math.abs(supressivosAprovados))}</dd>
            </div>
          )}
          <div className="dec-resumo-linha dec-resumo-linha--total">
            <dt>Investimento atualizado</dt>
            <dd>{temValorContrato ? formatarMoeda(totalInvestimento) : 'A definir'}</dd>
          </div>
          {(aditivosPendentes > 0 || supressivosPendentes > 0) && (
            <div className="dec-resumo-linha">
              <dt>Em análise</dt>
              <dd>
                {aditivosPendentes > 0 && <span>+{formatarMoeda(aditivosPendentes)}</span>}
                {aditivosPendentes > 0 && supressivosPendentes > 0 && <span> e </span>}
                {supressivosPendentes > 0 && <span>-{formatarMoeda(Math.abs(supressivosPendentes))}</span>}
              </dd>
            </div>
          )}
        </dl>
      )}

      {/* Filtros em Pílula (Versão Desktop Inalterada) */}
      {decisoes.length > 0 && (
        <div className="decisoes-pills-desktop" style={{ gap: 8, marginBottom: 20 }}>
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

      {/* Conteúdo: lista de decisões ou estado vazio (a ação está só no cabeçalho) */}
      {decisoesFiltradas.length === 0 ? (
        decisoes.length === 0 ? (
          <EmptyState icon={Scales} title="Nenhuma decisão registrada." />
        ) : (
          <EmptyState
            icon={Scales}
            variant="filtered"
            title="Nenhuma decisão neste filtro."
            action={{ label: 'Limpar filtros', onClick: () => setFilter('todas') }}
          />
        )
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
                      <PenNib size={16} weight="bold" />
                    )}
                  </div>

                  {/* Conteúdo do Cartão da Decisão */}
                  <div className="timeline-entry-content">
                    {/* Versão Desktop (Inalterada, sempre expandida) */}
                    <div className="decisao-card-desktop">
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 'var(--radius-md)',
                          padding: '20px 22px',
                          boxShadow: 'var(--shadow-subtle)',
                          transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                      {/* Top Bar do Card */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          {/* Badge de Categoria (opcional/legado) */}
                          {decisao.categoria && decisao.categoria !== 'outro' && (
                            <>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  padding: '3px 9px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--dark-coffee-100)',
                                  color: 'var(--dark-coffee-900)',
                                  letterSpacing: 0.3,
                                }}
                              >
                                <Tag size={13} weight="bold" color="var(--primary-accent)" />
                                {getCategoriaLabel(decisao.categoria)}
                              </span>
                              <span style={{ color: 'var(--border-hairline)', fontSize: '0.8rem' }}>•</span>
                            </>
                          )}

                          {/* Autor identificado */}
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: '0.80rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <User size={14} weight="bold" color="var(--dark-coffee-600)" />
                            <span>
                              Proposto por <strong style={{ color: 'var(--text-main)' }}>{decisao.criadorNome}</strong>
                            </span>
                            <span
                              style={{
                                fontSize: '0.70rem',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'var(--dark-coffee-50)',
                                border: '1px solid var(--border-hairline)',
                                color: 'var(--dark-coffee-700)',
                              }}
                            >
                              {decisao.criadaPor === 'construtor' ? 'Construtor' : 'Cliente'}
                            </span>
                          </span>

                          {/* Divisor */}
                          <span style={{ color: 'var(--border-hairline)', fontSize: '0.8rem' }}>•</span>

                          {/* Data e Hora */}
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: '0.80rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <CalendarBlank size={14} weight="bold" color="var(--dark-coffee-600)" />
                            <span>{formatarDataHora(decisao.criadaEm)}</span>
                          </span>
                        </div>

                        {/* Badge de Status e Botão WhatsApp */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {isPendente && (
                            <a
                              href={gerarLinkWhatsAppDecisao(decisao)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary"
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.76rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                color: '#15803d',
                                borderColor: '#bbf7d0',
                                background: '#f0fdf4',
                                textDecoration: 'none',
                                fontWeight: 600,
                              }}
                              title="Avisar ou cobrar manifestação da contraparte no WhatsApp"
                            >
                              <WhatsappLogo size={15} weight="bold" color="#16a34a" />
                              <span>Avisar no WhatsApp</span>
                            </a>
                          )}

                          {isAprovada ? (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#16a34a',
                                background: '#dcfce7',
                                padding: '3px 10px',
                                borderRadius: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <CheckCircle size={14} weight="bold" />
                              Assinada por Ambos
                            </span>
                          ) : isRecusada ? (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#dc2626',
                                background: '#fee2e2',
                                padding: '3px 10px',
                                borderRadius: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <XCircle size={14} weight="bold" />
                              Recusada
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--primary-accent)',
                                background: 'var(--coral-glow-100)',
                                padding: '3px 10px',
                                borderRadius: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <Clock size={14} weight="bold" />
                              Aguardando {decisao.criadaPor === 'construtor' ? 'Cliente' : 'Construtor'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Título */}
                      <h3
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          margin: '0 0 8px 0',
                          lineHeight: 1.3,
                        }}
                      >
                        {decisao.titulo}
                      </h3>

                      {/* Descrição */}
                      <p
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--text-main)',
                          margin: '0 0 14px 0',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {decisao.descricao}
                      </p>

                      {/* Impactos de Custo e Prazo (se existirem) */}
                      {(impactoDaDecisao(decisao).temImpactoFinanceiro || decisao.impactoPrazoDias !== undefined) && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                          {renderValorBadge(decisao, 'regular')}

                          {decisao.impactoPrazoDias !== undefined && (
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--primary-accent)',
                                background: 'var(--coral-glow-50)',
                                padding: '4px 10px',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <CalendarBlank size={15} weight="bold" />
                              {textoPrazo(decisao.impactoPrazoDias)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Fotos / Amostras */}
                      {decisao.fotos && decisao.fotos.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              display: 'block',
                              marginBottom: 6,
                            }}
                          >
                            Amostras de Referência:
                          </span>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {decisao.fotos.map((foto, fIdx) => (
                              <div
                                key={fIdx}
                                onClick={() => setLightboxFoto(foto)}
                                style={{
                                  width: 80,
                                  height: 80,
                                  borderRadius: 'var(--radius-sm)',
                                  overflow: 'hidden',
                                  border: '1px solid var(--border-hairline)',
                                  cursor: 'pointer',
                                  position: 'relative',
                                }}
                              >
                                <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(30,24,6,0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.15s ease',
                                    color: '#ffffff',
                                  }}
                                  className="thumb-hover-overlay"
                                >
                                  <ArrowsOut size={16} weight="bold" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Box de Assinaturas Digitais (Auditoria e Validade) */}
                      <div
                        style={{
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '14px 16px',
                          marginTop: 6,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 10,
                            paddingBottom: 8,
                            borderBottom: '1px solid var(--border-hairline)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              color: 'var(--text-muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <ShieldCheck size={16} color="var(--primary-accent)" />
                            Termo de Aceite & Assinatura Digital
                          </span>
                        </div>

                        {/* Grid com as duas assinaturas */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 12,
                          }}
                        >
                          {/* Assinatura 1: Criador */}
                          <div
                            style={{
                              background: '#ffffff',
                              border: '1px solid var(--border-hairline)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '10px 12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                Propositor ({decisao.assinaturaCriador.autor === 'construtor' ? 'Construtor' : 'Cliente'})
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Check size={12} weight="bold" /> Assinado
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {decisao.assinaturaCriador.nomeSignatario}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              Carimbo: {formatarDataHora(decisao.assinaturaCriador.assinadoEm)}
                            </div>
                          </div>

                          {/* Assinatura 2: Contraparte */}
                          <div
                            style={{
                              background: '#ffffff',
                              border: '1px solid var(--border-hairline)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '10px 12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                Contraparte ({decisao.criadaPor === 'construtor' ? 'Cliente' : 'Construtor'})
                              </span>

                              {decisao.assinaturaContraparte ? (
                                <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <Check size={12} weight="bold" /> Assinado
                                </span>
                              ) : isRecusada ? (
                                <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <XCircle size={13} weight="bold" />
                                  <span>Recusado</span>
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--primary-accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={13} weight="bold" />
                                  <span>Pendente</span>
                                </span>
                              )}
                            </div>

                            {decisao.assinaturaContraparte ? (
                              <>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                  {decisao.assinaturaContraparte.nomeSignatario}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                  Carimbo: {formatarDataHora(decisao.assinaturaContraparte.assinadoEm)}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                                Aguardando manifestação e assinatura digital.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CTA de Ação se estiver pendente para o perfil logado */}
                        {pendenteParaMim && (
                          <div
                            style={{
                              marginTop: 14,
                              paddingTop: 12,
                              borderTop: '1px solid var(--border-hairline)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ fontSize: '0.82rem', color: 'var(--coral-glow-700)', fontWeight: 600 }}>
                              Esta decisão aguarda sua validação formal.
                            </span>

                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => setConfirmRecusarDecisao(decisao)}
                                className="btn-secondary"
                                style={{
                                  padding: '7px 12px',
                                  fontSize: '0.8rem',
                                  color: 'var(--coral-glow-700)',
                                }}
                              >
                                Recusar
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfirmSignDecisao(decisao)}
                                className="btn-primary"
                                style={{ padding: '7px 16px', fontSize: '0.82rem' }}
                              >
                                <PenNib size={14} weight="bold" />
                                <span>Concordar e Assinar Decisão</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Versão Mobile: linha hairline com accordion (título + status + valor) */}
                  <div className="decisao-card-mobile">
                    <div className="dec-row">
                      <button
                        type="button"
                        className="dec-row-head"
                        onClick={() => toggleMobileExpand(decisao.id)}
                        aria-expanded={Boolean(expandedMobileIds[decisao.id])}
                      >
                        <span className="dec-row-main">
                          <span className="dec-row-title">{decisao.titulo}</span>
                          <span className="dec-row-meta">
                            {renderStatusBadge(decisao, pendenteParaMim)}
                            {renderValorTexto(decisao)}
                          </span>
                        </span>
                        <CaretDown
                          size={16}
                          weight="bold"
                          className="dec-caret"
                          data-open={Boolean(expandedMobileIds[decisao.id])}
                        />
                      </button>

                      {expandedMobileIds[decisao.id] && (
                        <div className="dec-row-body">
                          <div className="dec-autor">
                            <span>
                              {decisao.criadorNome} ({decisao.criadaPor === 'construtor' ? 'Construtor' : 'Cliente'}) · {formatarDataHora(decisao.criadaEm)}
                            </span>
                            {isPendente && (
                              <a
                                href={gerarLinkWhatsAppDecisao(decisao)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-icon dec-whats"
                                title="Avisar no WhatsApp"
                                aria-label="Avisar no WhatsApp"
                              >
                                <WhatsappLogo size={20} weight="bold" />
                              </a>
                            )}
                          </div>

                          <p className="dec-descricao">{decisao.descricao}</p>

                          <p className="dec-prazo">
                            <CalendarBlank size={14} weight="bold" />
                            <span>{textoPrazo(decisao.impactoPrazoDias)}</span>
                          </p>

                          {decisao.fotos && decisao.fotos.length > 0 && (
                            <div className="dec-fotos">
                              {decisao.fotos.map((foto, fIdx) => (
                                <button
                                  key={fIdx}
                                  type="button"
                                  className="dec-foto"
                                  onClick={() => setLightboxFoto(foto)}
                                  aria-label={`Ampliar foto ${fIdx + 1}`}
                                >
                                  <img src={foto} alt="" />
                                </button>
                              ))}
                            </div>
                          )}

                          {renderAssinaturas(decisao)}

                          {pendenteParaMim && (
                            <div className="dec-acoes">
                              <button type="button" onClick={() => setConfirmRecusarDecisao(decisao)} className="btn-secondary">
                                Recusar
                              </button>
                              <button type="button" onClick={() => setConfirmSignDecisao(decisao)} className="btn-primary">
                                <PenNib size={16} weight="bold" />
                                <span>Concordar e assinar</span>
                              </button>
                            </div>
                          )}
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
        dataPrevistaObra={obra.dataPrevista}
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
      {lightboxFoto && <Lightbox src={lightboxFoto} onClose={() => setLightboxFoto(null)} />}
    </div>
  );
};
