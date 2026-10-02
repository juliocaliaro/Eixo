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
  Check,
  User,
  Tag,
  WhatsappLogo,
  CurrencyDollar,
  TrendUp,
  CaretDown,
  Funnel,
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
  const [filter, setFilter] = useState<'todas' | 'pendentes' | 'aprovadas' | 'recusadas'>('todas');
  const [lightboxFoto, setLightboxFoto] = useState<string | null>(null);
  const [confirmSignDecisao, setConfirmSignDecisao] = useState<Decisao | null>(null);
  const [confirmRecusarDecisao, setConfirmRecusarDecisao] = useState<Decisao | null>(null);
  const [expandedMobileIds, setExpandedMobileIds] = useState<Record<string, boolean>>({});
  const [isPainelFinanceiroOpenMobile, setIsPainelFinanceiroOpenMobile] = useState(false);

  const toggleMobileExpand = (id: string) => {
    setExpandedMobileIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const decisoes = obra.decisoes || [];

  // Cálculos Financeiros de Aditivos e Supressivos
  const orcamentoBase = obra.orcamentoInicial || 0;
  const aditivosAprovados = decisoes
    .filter((d) => d.status === 'aprovada')
    .reduce((acc, d) => {
      const val = d.valorAditivo !== undefined ? d.valorAditivo : (typeof d.impactoFinanceiro === 'number' && d.impactoFinanceiro > 0 ? d.impactoFinanceiro : 0);
      return acc + val;
    }, 0);
  const supressivosAprovados = decisoes
    .filter((d) => d.status === 'aprovada')
    .reduce((acc, d) => {
      const val = d.valorSupressivo !== undefined ? -Math.abs(d.valorSupressivo) : (typeof d.impactoFinanceiro === 'number' && d.impactoFinanceiro < 0 ? d.impactoFinanceiro : 0);
      return acc + val;
    }, 0);
  const saldoAprovados = aditivosAprovados + supressivosAprovados;

  const aditivosPendentes = decisoes
    .filter((d) => d.status === 'pendente')
    .reduce((acc, d) => {
      const val = d.valorAditivo !== undefined ? d.valorAditivo : (typeof d.impactoFinanceiro === 'number' && d.impactoFinanceiro > 0 ? d.impactoFinanceiro : 0);
      return acc + val;
    }, 0);
  const supressivosPendentes = decisoes
    .filter((d) => d.status === 'pendente')
    .reduce((acc, d) => {
      const val = d.valorSupressivo !== undefined ? -Math.abs(d.valorSupressivo) : (typeof d.impactoFinanceiro === 'number' && d.impactoFinanceiro < 0 ? d.impactoFinanceiro : 0);
      return acc + val;
    }, 0);

  const totalInvestimento = orcamentoBase + saldoAprovados;

  const formatarMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  const gerarLinkWhatsAppDecisao = (decisao: Decisao) => {
    const urlObra = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?obra=${obra.id}&perfil=${decisao.criadaPor === 'construtor' ? 'cliente' : 'construtor'}&tab=decisoes`
      : '';

    let msg = `*Eixo - Decisão de Obra Pendente*\n\n`;
    msg += `Olá! Há uma decisão aguardando validação e assinatura digital na obra *${obra.nome}*:\n\n`;
    msg += `📌 *${decisao.titulo}*\n`;
    if (decisao.descricao) {
      const resumo = decisao.descricao.length > 140 ? decisao.descricao.substring(0, 137) + '...' : decisao.descricao;
      msg += `📝 _"${resumo}"_\n`;
    }
    const temAditivo = (decisao.valorAditivo !== undefined && decisao.valorAditivo > 0) || (decisao.impactoFinanceiro !== undefined && decisao.impactoFinanceiro > 0 && decisao.valorSupressivo === undefined);
    const temSupressivo = (decisao.valorSupressivo !== undefined && decisao.valorSupressivo > 0) || (decisao.impactoFinanceiro !== undefined && decisao.impactoFinanceiro < 0 && decisao.valorAditivo === undefined);

    if (decisao.valorAditivo !== undefined && decisao.valorSupressivo !== undefined) {
      const saldo = decisao.valorAditivo - decisao.valorSupressivo;
      const saldoStr = saldo > 0
        ? `+${saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
        : saldo < 0
        ? `-${Math.abs(saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
        : 'R$ 0,00';
      msg += `💰 Impacto Financeiro: *+${decisao.valorAditivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Aditivo) / -${decisao.valorSupressivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Supressivo)* [Saldo: *${saldoStr}*]\n`;
    } else if (temAditivo) {
      const val = decisao.valorAditivo ?? (decisao.impactoFinanceiro || 0);
      msg += `💰 Impacto Financeiro: *+${val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Aditivo)*\n`;
    } else if (temSupressivo) {
      const val = decisao.valorSupressivo ?? Math.abs(decisao.impactoFinanceiro || 0);
      msg += `💰 Impacto Financeiro: *-${val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (Supressivo / Redução)*\n`;
    }
    if (decisao.impactoPrazoDias && decisao.impactoPrazoDias > 0) {
      msg += `⏱️ Impacto no Prazo: *+${decisao.impactoPrazoDias} dias*\n`;
    }
    if (urlObra) {
      msg += `\nPara analisar os detalhes e assinar formalmente, acesse:\n👉 ${urlObra}`;
    }

    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const formatarDataHora = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const data = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const hora = d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${data} às ${hora}`;
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
    if (filter === 'recusadas') return d.status === 'recusada';
    return true;
  });

  const renderStatusBadge = (decisao: Decisao) => {
    const isAprovada = decisao.status === 'aprovada';
    const isRecusada = decisao.status === 'recusada';

    if (isAprovada) {
      return (
        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#16a34a',
            background: '#dcfce7',
            padding: '3px 9px',
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <CheckCircle size={13} weight="bold" />
          Assinada por Ambos
        </span>
      );
    }

    if (isRecusada) {
      return (
        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#dc2626',
            background: '#fee2e2',
            padding: '3px 9px',
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <XCircle size={13} weight="bold" />
          Recusada
        </span>
      );
    }

    return (
      <span
        style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          color: 'var(--primary-accent)',
          background: 'var(--coral-glow-100)',
          padding: '3px 9px',
          borderRadius: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <Clock size={13} weight="bold" />
        Aguardando {decisao.criadaPor === 'construtor' ? 'Cliente' : 'Construtor'}
      </span>
    );
  };

  const renderValorBadge = (decisao: Decisao) => {
    if (decisao.valorAditivo !== undefined && decisao.valorSupressivo !== undefined) {
      return (
        <>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--cinnamon-wood-700)',
              background: 'var(--cinnamon-wood-50)',
              border: '1px solid var(--cinnamon-wood-200)',
              padding: '3px 8px',
              borderRadius: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Money size={13} weight="bold" />
            Aditivo: +R$ {decisao.valorAditivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#15803d',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              padding: '3px 8px',
              borderRadius: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Money size={13} weight="bold" />
            Supressivo: -R$ {decisao.valorSupressivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </>
      );
    }

    if (decisao.impactoFinanceiro !== undefined || decisao.valorAditivo !== undefined || decisao.valorSupressivo !== undefined) {
      const isAditivo = (decisao.valorAditivo !== undefined && decisao.valorAditivo > 0) || (decisao.impactoFinanceiro !== undefined && decisao.impactoFinanceiro > 0);
      const isSupressivo = (decisao.valorSupressivo !== undefined && decisao.valorSupressivo > 0) || (decisao.impactoFinanceiro !== undefined && decisao.impactoFinanceiro < 0);
      const valor = decisao.valorAditivo ?? (decisao.valorSupressivo ?? Math.abs(decisao.impactoFinanceiro || 0));

      if (valor === 0 && !isAditivo && !isSupressivo) return null;

      return (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isAditivo ? 'var(--cinnamon-wood-700)' : isSupressivo ? '#15803d' : 'var(--text-muted)',
            background: isAditivo ? 'var(--cinnamon-wood-50)' : isSupressivo ? '#dcfce7' : 'var(--dark-coffee-50)',
            border: `1px solid ${isAditivo ? 'var(--cinnamon-wood-200)' : isSupressivo ? '#bbf7d0' : 'var(--border-hairline)'}`,
            padding: '3px 8px',
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Money size={13} weight="bold" />
          {isAditivo
            ? `Aditivo: +R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : isSupressivo
            ? `Supressivo: -R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : 'Sem impacto'}
        </span>
      );
    }

    return null;
  };

  const renderBlocoAssinaturas = (decisao: Decisao, pendenteParaMim: boolean, isRecusada: boolean) => (
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

        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          ID: {decisao.id}
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

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
  );

  return (
    <div className="decisoes-tab-container">
      {/* Cabeçalho da Aba */}
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Decisões e Aprovações
        </h2>
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
          {supressivosAprovados < 0 && (
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
              {orcamentoBase > 0 || aditivosAprovados > 0 || supressivosAprovados < 0 ? formatarMoeda(totalInvestimento) : 'A definir'}
            </div>
          </div>

          {/* Propostas em Análise */}
          {(aditivosPendentes > 0 || supressivosPendentes < 0) && (
            <div style={{ padding: '12px 14px', background: '#fef3c7', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#b45309', fontWeight: 700, display: 'block' }}>
                Propostas em Análise
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b45309', marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {aditivosPendentes > 0 && <span>+{formatarMoeda(aditivosPendentes)}</span>}
                {aditivosPendentes > 0 && supressivosPendentes < 0 && <span style={{ color: '#d97706' }}>|</span>}
                {supressivosPendentes < 0 && <span style={{ color: '#15803d' }}>-{formatarMoeda(Math.abs(supressivosPendentes))}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Painel Financeiro de Aditivos Contratuais - Versão Mobile (Accordion Fechado por Padrão) */}
      <div
        className="painel-financeiro-mobile"
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: 20,
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        {/* Cabeçalho Clicável do Accordion */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isPainelFinanceiroOpenMobile}
          onClick={() => setIsPainelFinanceiroOpenMobile((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsPainelFinanceiroOpenMobile((prev) => !prev);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
            outline: 'none',
            minHeight: '44px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0, paddingRight: 8 }}>
            <CurrencyDollar
              size={20}
              weight="bold"
              color="var(--primary-accent)"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.25 }}>
                Painel Financeiro & Aditivos Contratuais
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                Consolidação de orçamento base e alterações aprovadas
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: isPainelFinanceiroOpenMobile ? 'var(--dark-coffee-50)' : 'transparent',
              flexShrink: 0,
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <CaretDown
              size={16}
              weight="bold"
              style={{
                color: 'var(--text-muted)',
                transform: isPainelFinanceiroOpenMobile ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </div>

        {/* Conteúdo Expandido com os 4 Cartões Financeiros */}
        {isPainelFinanceiroOpenMobile && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--border-hairline)',
              animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Orçamento Base */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
                Orçamento Base
              </span>
              <div style={{ fontSize: '1.10rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
                {orcamentoBase > 0 ? formatarMoeda(orcamentoBase) : 'Não informado'}
              </div>
            </div>

            {/* Aditivos Aprovados */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--cinnamon-wood-700)', fontWeight: 700, display: 'block' }}>
                Aditivos Aprovados
              </span>
              <div style={{ fontSize: '1.10rem', fontWeight: 800, color: aditivosAprovados > 0 ? 'var(--cinnamon-wood-700)' : 'var(--text-main)', marginTop: 4 }}>
                {aditivosAprovados > 0 ? `+${formatarMoeda(aditivosAprovados)}` : 'R$ 0,00'}
              </div>
            </div>

            {/* Supressivos Aprovados */}
            {supressivosAprovados < 0 && (
              <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#15803d', fontWeight: 700, display: 'block' }}>
                  Supressivos Aprovados
                </span>
                <div style={{ fontSize: '1.10rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                  -{formatarMoeda(Math.abs(supressivosAprovados))}
                </div>
              </div>
            )}

            {/* Total Investimento */}
            <div style={{ padding: '12px 14px', background: 'var(--coral-glow-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--coral-glow-200)' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--primary-accent)', fontWeight: 700, display: 'block' }}>
                Investimento Atualizado
              </span>
              <div style={{ fontSize: '1.10rem', fontWeight: 800, color: 'var(--primary-accent)', marginTop: 4 }}>
                {orcamentoBase > 0 || aditivosAprovados > 0 || supressivosAprovados < 0 ? formatarMoeda(totalInvestimento) : 'A definir'}
              </div>
            </div>

            {/* Propostas em Análise */}
            {(aditivosPendentes > 0 || supressivosPendentes < 0) && (
              <div style={{ padding: '12px 14px', background: '#fef3c7', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#b45309', fontWeight: 700, display: 'block' }}>
                  Propostas em Análise
                </span>
                <div style={{ fontSize: '1.10rem', fontWeight: 800, color: '#b45309', marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {aditivosPendentes > 0 && <span>+{formatarMoeda(aditivosPendentes)}</span>}
                  {aditivosPendentes > 0 && supressivosPendentes < 0 && <span style={{ color: '#d97706' }}>|</span>}
                  {supressivosPendentes < 0 && <span style={{ color: '#15803d' }}>-{formatarMoeda(Math.abs(supressivosPendentes))}</span>}
                </div>
              </div>
            )}
          </div>
        )}
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
                {pendenciasUsuario.length} {pendenciasUsuario.length > 1 ? 'decisões' : 'decisão'} aguardando sua assinatura digital!
              </strong>
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

      {/* Barra de Filtro e Nova Proposta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {/* Campo de Filtro */}
          {decisoes.length > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '0 12px',
                height: '38px',
                boxShadow: 'var(--shadow-subtle)',
                minWidth: '220px',
                maxWidth: '340px',
                flex: '1 1 240px',
              }}
            >
              <Funnel size={16} color="var(--primary-accent)" weight="bold" style={{ flexShrink: 0 }} />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'todas' | 'pendentes' | 'aprovadas' | 'recusadas')}
                className="form-input"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  padding: 0,
                  height: '100%',
                  appearance: 'auto',
                }}
                title="Filtrar decisões por status"
              >
                <option value="todas">Todas as Decisões ({decisoes.length})</option>
                <option value="pendentes">
                  Pendentes ({decisoes.filter((d) => d.status === 'pendente').length})
                </option>
                <option value="aprovadas">
                  Aprovadas por Ambos ({decisoes.filter((d) => d.status === 'aprovada').length})
                </option>
                {decisoes.some((d) => d.status === 'recusada') && (
                  <option value="recusadas">
                    Recusadas ({decisoes.filter((d) => d.status === 'recusada').length})
                  </option>
                )}
              </select>
            </div>
          )}

          {/* Botão Nova Proposta (ao lado do filtro e alinhado) */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
            style={{
              height: '38px',
              padding: '0 16px',
              fontSize: '0.86rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 'var(--radius-sm)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={16} weight="bold" />
            <span>Nova Proposta</span>
          </button>
        </div>

        {/* Indicador de itens filtrados */}
        {filter !== 'todas' && decisoes.length > 0 && (
          <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            Exibindo <strong>{decisoesFiltradas.length}</strong> de {decisoes.length} {decisoes.length === 1 ? 'decisão' : 'decisões'}
          </span>
        )}
      </div>

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
            <span>Nova Proposta</span>
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
                      {(decisao.impactoFinanceiro !== undefined || decisao.valorAditivo !== undefined || decisao.valorSupressivo !== undefined || decisao.impactoPrazoDias !== undefined) && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                          {decisao.valorAditivo !== undefined && decisao.valorSupressivo !== undefined ? (
                            <>
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: 'var(--cinnamon-wood-700)',
                                  background: 'var(--cinnamon-wood-50)',
                                  border: '1px solid var(--cinnamon-wood-200)',
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                              >
                                <Money size={15} weight="bold" />
                                Aditivo: +R$ {decisao.valorAditivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>

                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: '#15803d',
                                  background: '#dcfce7',
                                  border: '1px solid #bbf7d0',
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                              >
                                <Money size={15} weight="bold" />
                                Supressivo: -R$ {decisao.valorSupressivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>

                              {decisao.impactoFinanceiro !== undefined && (
                                <span
                                  style={{
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: decisao.impactoFinanceiro > 0 ? 'var(--cinnamon-wood-700)' : decisao.impactoFinanceiro < 0 ? '#15803d' : 'var(--text-muted)',
                                    background: 'var(--dark-coffee-50)',
                                    border: '1px solid var(--border-hairline)',
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                  }}
                                >
                                  Saldo: {decisao.impactoFinanceiro > 0 ? `+R$ ${decisao.impactoFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : decisao.impactoFinanceiro < 0 ? `-R$ ${Math.abs(decisao.impactoFinanceiro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                                </span>
                              )}
                            </>
                          ) : (decisao.impactoFinanceiro !== undefined || decisao.valorAditivo !== undefined || decisao.valorSupressivo !== undefined) ? (
                            (() => {
                              const isAditivo = (decisao.valorAditivo !== undefined && decisao.valorAditivo > 0) || (decisao.impactoFinanceiro !== undefined && decisao.impactoFinanceiro > 0);
                              const isSupressivo = (decisao.valorSupressivo !== undefined && decisao.valorSupressivo > 0) || (decisao.impactoFinanceiro !== undefined && decisao.impactoFinanceiro < 0);
                              const valor = decisao.valorAditivo ?? (decisao.valorSupressivo ?? Math.abs(decisao.impactoFinanceiro || 0));

                              return (
                                <span
                                  style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: isAditivo ? 'var(--cinnamon-wood-700)' : isSupressivo ? '#15803d' : 'var(--text-muted)',
                                    background: isAditivo ? 'var(--cinnamon-wood-50)' : isSupressivo ? '#dcfce7' : 'var(--dark-coffee-50)',
                                    border: `1px solid ${isAditivo ? 'var(--cinnamon-wood-200)' : isSupressivo ? '#bbf7d0' : 'var(--border-hairline)'}`,
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                  }}
                                >
                                  <Money size={15} weight="bold" />
                                  {isAditivo
                                    ? `Aditivo: +R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    : isSupressivo
                                    ? `Supressivo: -R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    : 'Sem impacto financeiro'}
                                </span>
                              );
                            })()
                          ) : null}

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
                              {decisao.impactoPrazoDias > 0
                                ? `Prazo: +${decisao.impactoPrazoDias} dias úteis`
                                : 'Sem alteração no prazo previsto'}
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

                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            ID: {decisao.id}
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

                  {/* Versão Mobile (Accordion / Collapse Exclusivo no Mobile) */}
                  <div className="decisao-card-mobile">
                    <div className="decisao-card-mobile-container">
                      {/* 1. Estado Minimizado (Mobile): Título, Tag de Status, Valor e Chevron à direita */}
                      <div
                        role="button"
                        tabIndex={0}
                        className="decisao-card-mobile-header"
                        onClick={() => toggleMobileExpand(decisao.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleMobileExpand(decisao.id);
                          }
                        }}
                        aria-expanded={Boolean(expandedMobileIds[decisao.id])}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          {/* Título */}
                          <h3
                            style={{
                              fontSize: '0.98rem',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                              margin: 0,
                              lineHeight: 1.35,
                              flex: 1,
                            }}
                          >
                            {decisao.titulo}
                          </h3>

                          {/* Ícone de Seta (Chevron) indicando expansão no canto direito */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: expandedMobileIds[decisao.id] ? 'var(--dark-coffee-100)' : 'var(--dark-coffee-50)',
                              color: 'var(--text-main)',
                              flexShrink: 0,
                              transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s ease',
                              transform: expandedMobileIds[decisao.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          >
                            <CaretDown size={16} weight="bold" />
                          </div>
                        </div>

                        {/* Badges de Status e Valor */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {renderStatusBadge(decisao)}
                          {renderValorBadge(decisao)}
                        </div>
                      </div>

                      {/* 2. Estado Expandido (Mobile): Oculto no minimizado, visível apenas ao clicar */}
                      {expandedMobileIds[decisao.id] && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-hairline)' }}>
                          {/* Autor e Data */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 8,
                              marginBottom: 12,
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: '0.78rem',
                                color: 'var(--text-muted)',
                              }}
                            >
                              <User size={13} weight="bold" color="var(--dark-coffee-600)" />
                              <span>
                                Proposto por <strong style={{ color: 'var(--text-main)' }}>{decisao.criadorNome}</strong>
                              </span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: 'var(--dark-coffee-50)',
                                  border: '1px solid var(--border-hairline)',
                                  color: 'var(--dark-coffee-700)',
                                }}
                              >
                                {decisao.criadaPor === 'construtor' ? 'Construtor' : 'Cliente'}
                              </span>
                            </span>

                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.76rem',
                                color: 'var(--text-muted)',
                              }}
                            >
                              <CalendarBlank size={13} weight="bold" color="var(--dark-coffee-600)" />
                              <span>{formatarDataHora(decisao.criadaEm)}</span>
                            </span>
                          </div>

                          {/* Descrição */}
                          <p
                            style={{
                              fontSize: '0.88rem',
                              color: 'var(--text-main)',
                              margin: '0 0 12px 0',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {decisao.descricao}
                          </p>

                          {/* Impacto no Prazo (se houver) */}
                          {decisao.impactoPrazoDias !== undefined && (
                            <div style={{ marginBottom: 12 }}>
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  color: 'var(--primary-accent)',
                                  background: 'var(--coral-glow-50)',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                              >
                                <CalendarBlank size={14} weight="bold" />
                                {decisao.impactoPrazoDias > 0
                                  ? `Prazo: +${decisao.impactoPrazoDias} dias úteis`
                                  : 'Sem alteração no prazo previsto'}
                              </span>
                            </div>
                          )}

                          {/* Amostras / Fotos (se houver) */}
                          {decisao.fotos && decisao.fotos.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
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
                                      width: 70,
                                      height: 70,
                                      borderRadius: 'var(--radius-sm)',
                                      overflow: 'hidden',
                                      border: '1px solid var(--border-hairline)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Botão WhatsApp */}
                          {isPendente && (
                            <div style={{ marginBottom: 14 }}>
                              <a
                                href={gerarLinkWhatsAppDecisao(decisao)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '0.8rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  color: '#15803d',
                                  borderColor: '#bbf7d0',
                                  background: '#f0fdf4',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                }}
                                title="Avisar ou cobrar manifestação da contraparte no WhatsApp"
                              >
                                <WhatsappLogo size={16} weight="bold" color="#16a34a" />
                                <span>Avisar no WhatsApp</span>
                              </a>
                            </div>
                          )}

                          {/* Bloco de Assinatura Digital e Ações Finais */}
                          {renderBlocoAssinaturas(decisao, pendenteParaMim, isRecusada)}
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
