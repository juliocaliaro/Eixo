import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Wrench,
  Plus,
  Trash,
  BuildingApartment,
  X,
  ArrowsOut,
  CalendarBlank,
  Clock,
  CheckCircle,
  Warning,
  Storefront,
  MagnifyingGlass,
  ClockCounterClockwise,
  ArrowsClockwise,
  FloppyDisk,
  CircleNotch,
} from '@phosphor-icons/react';
import { Obra, RegistroLocacao, PerfilUsuario } from '../types/obra';
import { ModalRegistroLocacao, NovaLocacaoData } from './ModalRegistroLocacao';
import { ModalConfirm } from './ModalConfirm';
import { generateUUID } from '../utils/uuid';
import { locacoesApi } from '../services/api';

interface RegistroLocacoesPageProps {
  obras: Obra[];
  onUpdateObra: (obra: Obra) => void;
  onBack: () => void;
  showToast: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
  perfilAtivo?: PerfilUsuario;
}

export const RegistroLocacoesPage: React.FC<RegistroLocacoesPageProps> = ({
  obras,
  onUpdateObra,
  onBack,
  showToast,
  perfilAtivo = 'construtor',
}) => {
  const [filtroObraId, setFiltroObraId] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'vencidos' | 'devolvidos'>('todos');
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [isModalLocacaoOpen, setIsModalLocacaoOpen] = useState(false);
  const [selectedObraIdForModal, setSelectedObraIdForModal] = useState<string | undefined>(undefined);

  // Lightbox de foto
  const [lightboxFoto, setLightboxFoto] = useState<{ url: string; titulo?: string } | null>(null);

  // Prolongamento / Renovação inline de locação no card
  const [prolongandoLocacaoId, setProlongandoLocacaoId] = useState<string | null>(null);
  const [novaDataProlongada, setNovaDataProlongada] = useState<string>('');
  const [isSavingProlongamento, setIsSavingProlongamento] = useState(false);

  // Confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<{
    obraId: string;
    locacaoId: string;
    itemLocado: string;
  } | null>(null);

  // Fechar lightbox com Escape
  useEffect(() => {
    if (!lightboxFoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxFoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxFoto]);

  // Coleta todas as locações de todas as obras ou da obra filtrada
  const todasLocacoes = useMemo(() => {
    const lista: { locacao: RegistroLocacao; obra: Obra }[] = [];
    obras.forEach((obra) => {
      (obra.locacoes || []).forEach((loc) => {
        lista.push({ locacao: loc, obra });
      });
    });
    // Ordena por data de vencimento crescente
    return lista.sort((a, b) => {
      const dataA = a.locacao.dataVencimento || '';
      const dataB = b.locacao.dataVencimento || '';
      return dataA.localeCompare(dataB);
    });
  }, [obras]);

  // Data atual de referência sem horas (YYYY-MM-DD)
  const hojeStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Formatação de data (YYYY-MM-DD para DD/MM/AAAA)
  const formatarData = (isoDate?: string) => {
    if (!isoDate) return '';
    try {
      const [ano, mes, dia] = isoDate.split('T')[0].split('-');
      if (ano && mes && dia) {
        return `${dia}/${mes}/${ano}`;
      }
      return isoDate;
    } catch {
      return isoDate;
    }
  };

  // Cálculo do status de vencimento
  const calcularStatusVencimento = (dataVencimento: string, status?: string) => {
    if (status === 'devolvido') {
      return {
        tipo: 'devolvido' as const,
        label: 'Devolvido',
        badgeBg: '#f3f4f6',
        badgeColor: '#4b5563',
        badgeBorder: '#e5e7eb',
        dias: 0,
      };
    }

    if (!dataVencimento) {
      return {
        tipo: 'ativo' as const,
        label: 'Em Aberto',
        badgeBg: '#f3f4f6',
        badgeColor: '#374151',
        badgeBorder: '#e5e7eb',
        dias: 0,
      };
    }

    const hoje = new Date(hojeStr);
    const venc = new Date(dataVencimento.split('T')[0]);
    const diffMs = venc.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return {
        tipo: 'vencido' as const,
        label: `Vencido há ${Math.abs(diffDias)} ${Math.abs(diffDias) === 1 ? 'dia' : 'dias'}`,
        badgeBg: '#fef2f2',
        badgeColor: '#b91c1c',
        badgeBorder: '#fecaca',
        dias: diffDias,
      };
    }

    if (diffDias === 0) {
      return {
        tipo: 'hoje' as const,
        label: 'Vence Hoje!',
        badgeBg: '#fff7ed',
        badgeColor: '#c2410c',
        badgeBorder: '#ffedd5',
        dias: diffDias,
      };
    }

    if (diffDias <= 3) {
      return {
        tipo: 'urgente' as const,
        label: `Vence em ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`,
        badgeBg: '#fffbeb',
        badgeColor: '#b45309',
        badgeBorder: '#fef3c7',
        dias: diffDias,
      };
    }

    return {
      tipo: 'em_dia' as const,
      label: `Vence em ${diffDias} dias (${formatarData(dataVencimento)})`,
      badgeBg: '#f8fafc',
      badgeColor: '#334155',
      badgeBorder: '#e2e8f0',
      dias: diffDias,
    };
  };

  // KPIs
  const kpis = useMemo(() => {
    let total = 0;
    let ativos = 0;
    let vencidos = 0;
    let devolvidos = 0;

    todasLocacoes.forEach(({ locacao }) => {
      total++;
      if (locacao.status === 'devolvido') {
        devolvidos++;
      } else {
        ativos++;
        const info = calcularStatusVencimento(locacao.dataVencimento, locacao.status);
        if (info.tipo === 'vencido' || info.tipo === 'hoje') {
          vencidos++;
        }
      }
    });

    return { total, ativos, vencidos, devolvidos };
  }, [todasLocacoes, hojeStr]);

  // Filtragem
  const locacoesFiltradas = useMemo(() => {
    return todasLocacoes.filter(({ locacao, obra }) => {
      // Filtro por obra
      if (filtroObraId !== 'todas' && obra.id !== filtroObraId) {
        return false;
      }

      // Filtro por status
      const info = calcularStatusVencimento(locacao.dataVencimento, locacao.status);
      if (filtroStatus === 'ativos' && locacao.status === 'devolvido') return false;
      if (filtroStatus === 'devolvidos' && locacao.status !== 'devolvido') return false;
      if (filtroStatus === 'vencidos') {
        if (locacao.status === 'devolvido') return false;
        if (info.tipo !== 'vencido' && info.tipo !== 'hoje') return false;
      }

      // Filtro por busca textual
      if (termoBusca.trim()) {
        const query = termoBusca.toLowerCase().trim();
        const noItem = locacao.itemLocado.toLowerCase().includes(query);
        const naObra = obra.nome.toLowerCase().includes(query);
        const noFornecedor = (locacao.fornecedor || '').toLowerCase().includes(query);
        if (!noItem && !naObra && !noFornecedor) return false;
      }

      return true;
    });
  }, [todasLocacoes, filtroObraId, filtroStatus, termoBusca, hojeStr]);

  // Abertura do modal para adicionar locação
  const handleOpenAdd = (obraId?: string) => {
    setSelectedObraIdForModal(obraId);
    setIsModalLocacaoOpen(true);
  };

  // Salvar nova locação
  const handleSaveLocacao = (dados: NovaLocacaoData) => {
    const obraAlvo = obras.find((o) => o.id === dados.obraId);
    if (!obraAlvo) return;

    const novaLocacao: RegistroLocacao = {
      id: generateUUID(),
      obraId: dados.obraId,
      itemLocado: dados.itemLocado,
      periodo: dados.periodo,
      dataVencimento: dados.dataVencimento,
      fotos: dados.fotos,
      fornecedor: dados.fornecedor,
      status: 'ativo',
      renovado: false,
      criadoEm: new Date().toISOString(),
    };

    const updatedObra: Obra = {
      ...obraAlvo,
      locacoes: [novaLocacao, ...(obraAlvo.locacoes || [])],
    };

    onUpdateObra(updatedObra);
    setIsModalLocacaoOpen(false);

    showToast(
      'Locação Registrada!',
      `O equipamento "${dados.itemLocado}" foi vinculado à obra "${obraAlvo.nome}".`,
      'success'
    );
  };

  // Iniciar fluxo para prolongar o prazo no card
  const handleIniciarProlongamento = (locacao: RegistroLocacao) => {
    const base = locacao.dataVencimento
      ? new Date(locacao.dataVencimento.split('T')[0])
      : new Date();
    base.setDate(base.getDate() + 30);
    setNovaDataProlongada(base.toISOString().split('T')[0]);
    setProlongandoLocacaoId(locacao.id);
  };

  // Desfazer renovação (desmarcar checkbox)
  const handleDesfazerRenovacao = (obraId: string, locacao: RegistroLocacao) => {
    const obraAlvo = obras.find((o) => o.id === obraId);
    if (!obraAlvo) return;

    const dataRestaurada = locacao.vencimentoOriginal || locacao.dataVencimento;
    const updatedLocacoes = (obraAlvo.locacoes || []).map((l) => {
      if (l.id === locacao.id) {
        return {
          ...l,
          renovado: false,
          renovadoEm: undefined,
          dataVencimento: dataRestaurada,
        };
      }
      return l;
    });

    onUpdateObra({
      ...obraAlvo,
      locacoes: updatedLocacoes,
    });
    setProlongandoLocacaoId(null);

    showToast(
      'Renovação Desfeita',
      `A locação de "${locacao.itemLocado}" retornou para o vencimento original (${formatarData(dataRestaurada)}).`,
      'info'
    );
  };

  // Salvar novo prazo prolongado
  const handleSalvarProlongamento = (obraId: string, locacao: RegistroLocacao) => {
    if (!novaDataProlongada.trim()) return;

    const obraAlvo = obras.find((o) => o.id === obraId);
    if (!obraAlvo) return;

    setIsSavingProlongamento(true);
    try {
      const vencimentoOriginal = locacao.vencimentoOriginal || locacao.dataVencimento;

      const updatedLocacoes = (obraAlvo.locacoes || []).map((l) => {
        if (l.id === locacao.id) {
          return {
            ...l,
            dataVencimento: novaDataProlongada.trim(),
            vencimentoOriginal,
            renovado: true,
            renovadoEm: new Date().toISOString(),
            status: 'ativo' as const, // reativa caso estivesse devolvido
          };
        }
        return l;
      });

      onUpdateObra({
        ...obraAlvo,
        locacoes: updatedLocacoes,
      });
      setProlongandoLocacaoId(null);

      showToast(
        'Locação Prolongada!',
        `O prazo de "${locacao.itemLocado}" foi estendido para ${formatarData(novaDataProlongada)}.`,
        'success'
      );
    } finally {
      setIsSavingProlongamento(false);
    }
  };

  // Alternar status da locação (ativo <-> devolvido)
  const handleToggleStatus = (obraId: string, locacaoId: string) => {
    const obraAlvo = obras.find((o) => o.id === obraId);
    if (!obraAlvo) return;

    const locacaoExistente = (obraAlvo.locacoes || []).find((l) => l.id === locacaoId);
    if (!locacaoExistente) return;

    const novoStatus: 'ativo' | 'devolvido' = locacaoExistente.status === 'devolvido' ? 'ativo' : 'devolvido';

    const updatedLocacoes = (obraAlvo.locacoes || []).map((l) => {
      if (l.id === locacaoId) {
        return { ...l, status: novoStatus };
      }
      return l;
    });

    const updatedObra: Obra = {
      ...obraAlvo,
      locacoes: updatedLocacoes,
    };

    onUpdateObra(updatedObra);

    showToast(
      novoStatus === 'devolvido' ? 'Equipamento Devolvido' : 'Locação Reativada',
      novoStatus === 'devolvido'
        ? `"${locacaoExistente.itemLocado}" foi marcado como devolvido.`
        : `"${locacaoExistente.itemLocado}" retornou para locações ativas.`,
      'info'
    );
  };

  // Confirmar exclusão
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { obraId, locacaoId, itemLocado } = deleteTarget;
    const obraAlvo = obras.find((o) => o.id === obraId);
    if (!obraAlvo) return;

    const locacaoAlvo = (obraAlvo.locacoes || []).find((l) => l.id === locacaoId);

    const updatedObra: Obra = {
      ...obraAlvo,
      locacoes: (obraAlvo.locacoes || []).filter((l) => l.id !== locacaoId),
    };

    onUpdateObra(updatedObra);
    setDeleteTarget(null);

    // Remove do Supabase no servidor e do Storage
    locacoesApi.delete(locacaoId, locacaoAlvo?.fotos);

    showToast('Locação Removida', `"${itemLocado}" foi excluído com sucesso.`, 'info');
  };

  return (
    <div
      style={{
        maxWidth: 1140,
        margin: '0 auto',
        padding: '24px 20px 80px',
        width: '100%',
      }}
    >
      {/* 1. Barra de Ações Superior (Voltar e Nova Locação em cima) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            minHeight: 40,
            fontSize: '0.88rem',
            borderRadius: '6px',
            fontWeight: 600,
          }}
          title="Voltar para a página anterior"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Voltar</span>
        </button>

        {perfilAtivo === 'construtor' && (
          <button
            type="button"
            onClick={() => handleOpenAdd(filtroObraId !== 'todas' ? filtroObraId : undefined)}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              minHeight: 40,
              fontSize: '0.88rem',
              borderRadius: '6px',
              fontWeight: 600,
            }}
          >
            <Plus size={18} weight="bold" />
            <span>Nova Locação</span>
          </button>
        )}
      </div>

      {/* 2. Título de Texto do Registro */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              background: 'var(--pitch-black-50, #f6f3eb)',
              color: 'var(--coral-glow-500, #e05a47)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Wrench size={22} weight="bold" />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.42rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              Registro de Locação
            </h1>
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                margin: '3px 0 0 0',
              }}
            >
              Rastreamento de maquinários, ferramentas e prazos de devolução por obra
            </p>
          </div>
        </div>
      </div>

      {/* 3. Contadores Rápidos (2 por Linha Alinhados) */}
      <div className="locacoes-kpis-grid">
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total de Locações
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {kpis.total}
          </span>
        </div>

        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Ativos no Canteiro
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--coral-glow-500, #e05a47)' }}>
            {kpis.ativos}
          </span>
        </div>

        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Vencidos / Atenção
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 700, color: kpis.vencidos > 0 ? '#b91c1c' : 'var(--text-main)' }}>
            {kpis.vencidos}
          </span>
        </div>

        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Devolvidos
          </span>
          <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#15803d' }}>
            {kpis.devolvidos}
          </span>
        </div>
      </div>

      {/* 4. Card Organizado: Seleção de Obra, Busca e Filtros de Status */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: '#ffffff',
          padding: '14px 16px',
          borderRadius: '10px',
          border: '1px solid var(--border-hairline)',
          marginBottom: 20,
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        {/* Linha 1: Seleção de Obra e Busca */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
          }}
        >
          {/* Seletor de Obra */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--border-hairline)',
              borderRadius: '7px',
              padding: '0 10px',
              backgroundColor: 'var(--dark-coffee-50, #fcfaf8)',
              height: 40,
            }}
          >
            <BuildingApartment size={18} color="var(--coral-glow-500, #e05a47)" style={{ flexShrink: 0 }} />
            <select
              value={filtroObraId}
              onChange={(e) => setFiltroObraId(e.target.value)}
              className="form-select"
              style={{
                width: '100%',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '0.86rem',
                color: 'var(--text-main)',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="todas">Todas as Obras ({obras.length})</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Campo de Busca */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--border-hairline)',
              borderRadius: '7px',
              padding: '0 10px',
              backgroundColor: '#ffffff',
              height: 40,
            }}
          >
            <MagnifyingGlass size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar equipamento, locadora..."
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.86rem',
                width: '100%',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
              }}
            />
            {termoBusca && (
              <button
                type="button"
                onClick={() => setTermoBusca('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Limpar busca"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Linha 2: Chips de Status com Rolagem Suave */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflowX: 'auto',
            paddingTop: 8,
            borderTop: '1px solid var(--border-hairline)',
            scrollbarWidth: 'none',
          }}
        >
          {(
            [
              { id: 'todos', label: 'Todos', count: kpis.total },
              { id: 'ativos', label: 'Ativos', count: kpis.ativos },
              { id: 'vencidos', label: 'Vencidos / Atenção', count: kpis.vencidos },
              { id: 'devolvidos', label: 'Devolvidos', count: kpis.devolvidos },
            ] as const
          ).map((tab) => {
            const isActive = filtroStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFiltroStatus(tab.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '20px',
                  border: isActive ? '1px solid var(--coral-glow-500, #e05a47)' : '1px solid var(--border-hairline)',
                  backgroundColor: isActive ? 'var(--dark-coffee-50, #fcfaf8)' : '#ffffff',
                  color: isActive ? 'var(--coral-glow-500, #e05a47)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.70rem',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'var(--coral-glow-500, #e05a47)' : 'var(--dark-coffee-100, #f1e7da)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Registros */}
      {locacoesFiltradas.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--dark-coffee-50, #fcfaf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Wrench size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              Nenhuma locação encontrada
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, maxWidth: 360 }}>
              {termoBusca || filtroStatus !== 'todos' || filtroObraId !== 'todas'
                ? 'Nenhum equipamento corresponde aos filtros aplicados.'
                : 'Você ainda não registrou nenhum maquinário ou equipamento locado.'}
            </p>
          </div>
          {perfilAtivo === 'construtor' && (
            <button
              type="button"
              onClick={() => handleOpenAdd(filtroObraId !== 'todas' ? filtroObraId : undefined)}
              className="btn-primary"
              style={{
                marginTop: 6,
                padding: '9px 16px',
                fontSize: '0.88rem',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Plus size={16} weight="bold" />
              <span>Cadastrar Primeira Locação</span>
            </button>
          )}
        </div>
      ) : (
        <div className="locacoes-cards-grid">
          {locacoesFiltradas.map(({ locacao, obra }) => {
            const statusInfo = calcularStatusVencimento(locacao.dataVencimento, locacao.status);
            const primeiraFoto = (locacao.fotos && locacao.fotos.length > 0) ? locacao.fotos[0] : null;

            return (
              <div
                key={locacao.id}
                className="locacao-card"
                style={{
                  opacity: locacao.status === 'devolvido' ? 0.78 : 1,
                  borderLeft: statusInfo.tipo === 'vencido' || statusInfo.tipo === 'hoje'
                    ? '3px solid #b91c1c'
                    : locacao.status === 'devolvido'
                    ? '3px solid #15803d'
                    : '1px solid var(--border-hairline)',
                }}
              >
                {/* 1. Mídia / Imagem no Topo com Badges Flutuantes */}
                <div
                  className="locacao-card-media"
                  onClick={() => primeiraFoto && setLightboxFoto({ url: primeiraFoto, titulo: locacao.itemLocado })}
                  title={primeiraFoto ? 'Clique para ampliar foto' : undefined}
                >
                  {primeiraFoto ? (
                    <>
                      <img
                        src={primeiraFoto}
                        alt={locacao.itemLocado}
                        className="locacao-card-img"
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          right: 6,
                          backgroundColor: 'rgba(0, 0, 0, 0.65)',
                          borderRadius: '4px',
                          padding: '2px 5px',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '0.68rem',
                          zIndex: 2,
                        }}
                      >
                        <ArrowsOut size={11} weight="bold" />
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        background: 'linear-gradient(135deg, var(--pitch-black-50, #f6f3eb) 0%, var(--dark-coffee-50, #f8f3ed) 100%)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Wrench size={26} weight="duotone" />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Sem foto
                      </span>
                    </div>
                  )}

                  {/* Badge de Status de Vencimento Sobreposto */}
                  <div className="locacao-card-badge-status">
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        backgroundColor: statusInfo.badgeBg,
                        color: statusInfo.badgeColor,
                        border: `1px solid ${statusInfo.badgeBorder}`,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                      }}
                    >
                      {statusInfo.tipo === 'vencido' || statusInfo.tipo === 'hoje' ? (
                        <Warning size={11} weight="fill" />
                      ) : statusInfo.tipo === 'devolvido' ? (
                        <CheckCircle size={11} weight="fill" />
                      ) : (
                        <Clock size={11} />
                      )}
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  {/* Badge de Período Sobreposto */}
                  {locacao.periodo && (
                    <div className="locacao-card-badge-periodo">
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          color: 'var(--text-main)',
                          border: '1px solid var(--border-hairline)',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                        }}
                      >
                        <span>
                          {locacao.periodo === 'diaria'
                            ? 'Diária'
                            : locacao.periodo === 'semanal'
                            ? 'Semanal'
                            : locacao.periodo === 'quinzenal'
                            ? 'Quinzenal'
                            : 'Mensal'}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Conteúdo e Metadados do Card */}
                <div className="locacao-card-content">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <h4
                      className="locacao-card-title"
                      style={{
                        textDecoration: locacao.status === 'devolvido' ? 'line-through' : 'none',
                      }}
                      title={locacao.itemLocado}
                    >
                      {locacao.itemLocado}
                    </h4>

                    {locacao.renovado && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '2px 5px',
                          borderRadius: '4px',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          flexShrink: 0,
                        }}
                        title={
                          locacao.vencimentoOriginal
                            ? `Vencimento inicial: ${formatarData(locacao.vencimentoOriginal)}`
                            : 'Locação renovada'
                        }
                      >
                        <ArrowsClockwise size={11} weight="bold" />
                        <span>Renovado</span>
                      </span>
                    )}
                  </div>

                  {/* Informações de Obra e Fornecedor */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                    <div className="locacao-card-meta">
                      <BuildingApartment size={13} color="var(--coral-glow-500, #e05a47)" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{obra.nome}</span>
                    </div>
                    {locacao.fornecedor && (
                      <div className="locacao-card-meta">
                        <Storefront size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        <span>{locacao.fornecedor}</span>
                      </div>
                    )}
                    {locacao.vencimentoOriginal && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 1 }}>
                        Início: {formatarData(locacao.vencimentoOriginal)}
                      </span>
                    )}
                  </div>

                  {/* Fotos extras miniaturas (se houver mais de 1) */}
                  {locacao.fotos && locacao.fotos.length > 1 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {locacao.fotos.slice(1, 4).map((foto, idx) => (
                        <div
                          key={idx}
                          onClick={() => setLightboxFoto({ url: foto, titulo: `${locacao.itemLocado} (Foto ${idx + 2})` })}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-hairline)',
                            cursor: 'pointer',
                          }}
                        >
                          <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                      {locacao.fotos.length > 4 && (
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                          +{locacao.fotos.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Ações Rápidas (Devolver / Excluir) */}
                {perfilAtivo === 'construtor' && (
                  <div className="locacao-card-footer">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(obra.id, locacao.id)}
                      className="btn-secondary"
                      style={{
                        padding: '5px 8px',
                        minHeight: 30,
                        fontSize: '0.74rem',
                        borderRadius: '5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 600,
                        color: locacao.status === 'devolvido' ? 'var(--text-muted)' : '#15803d',
                        flex: 1,
                        justifyContent: 'center',
                      }}
                      title={locacao.status === 'devolvido' ? 'Reativar locação' : 'Marcar equipamento como devolvido'}
                    >
                      {locacao.status === 'devolvido' ? (
                        <>
                          <ClockCounterClockwise size={13} />
                          <span>Reativar</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={13} weight="bold" />
                          <span>Devolver</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          obraId: obra.id,
                          locacaoId: locacao.id,
                          itemLocado: locacao.itemLocado,
                        })
                      }
                      className="btn-icon"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '5px',
                        border: '1px solid var(--border-hairline)',
                        background: '#ffffff',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      title="Excluir locação"
                      aria-label="Excluir locação"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                )}

                {/* 4. Bloco de Renovação / Prolongamento no Card */}
                <div
                  style={{
                    padding: '8px 10px',
                    borderTop: '1px solid var(--border-hairline)',
                    backgroundColor: locacao.renovado ? 'var(--dark-coffee-50, #fcfaf8)' : '#fafafa',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: perfilAtivo === 'construtor' ? 'pointer' : 'default',
                        userSelect: 'none',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(locacao.renovado)}
                        disabled={perfilAtivo !== 'construtor'}
                        onChange={() => {
                          if (locacao.renovado) {
                            handleDesfazerRenovacao(obra.id, locacao);
                          } else {
                            handleIniciarProlongamento(locacao);
                          }
                        }}
                        style={{
                          width: 15,
                          height: 15,
                          accentColor: 'var(--coral-glow-500, #e05a47)',
                          cursor: perfilAtivo === 'construtor' ? 'pointer' : 'default',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          lineHeight: 1.15,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title="Renovei a locação após o vencimento programado"
                      >
                        {locacao.renovado ? 'Renovado' : 'Renovar'}
                      </span>
                    </label>

                    {perfilAtivo === 'construtor' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (prolongandoLocacaoId === locacao.id) {
                            setProlongandoLocacaoId(null);
                          } else {
                            handleIniciarProlongamento(locacao);
                          }
                        }}
                        className="btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 7px',
                          minHeight: 26,
                          fontSize: '0.72rem',
                          borderRadius: '4px',
                          fontWeight: 600,
                          color: locacao.renovado ? 'var(--coral-glow-500, #e05a47)' : 'var(--text-main)',
                          flexShrink: 0,
                        }}
                      >
                        <ArrowsClockwise size={12} weight="bold" />
                        <span>{prolongandoLocacaoId === locacao.id ? 'Fechar' : 'Prolongar'}</span>
                      </button>
                    )}
                  </div>

                  {/* Painel Inline de Prolongamento */}
                  {prolongandoLocacaoId === locacao.id && perfilAtivo === 'construtor' && (
                    <div
                      style={{
                        borderTop: '1px solid var(--border-hairline)',
                        paddingTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        backgroundColor: '#ffffff',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Nova data de vencimento:
                      </span>

                      <input
                        type="date"
                        value={novaDataProlongada}
                        onChange={(e) => setNovaDataProlongada(e.target.value)}
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-hairline)',
                          fontSize: '0.78rem',
                          outline: 'none',
                        }}
                        required
                      />

                      {/* Atalhos Rápidos por Período */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                        {[
                          { dias: 1, label: '+1d (Diária)' },
                          { dias: 7, label: '+7d (Semanal)' },
                          { dias: 15, label: '+15d (Quinzenal)' },
                          { dias: 30, label: '+30d (Mensal)' },
                        ].map((btn) => (
                          <button
                            key={btn.dias}
                            type="button"
                            onClick={() => {
                              const base = locacao.dataVencimento
                                ? new Date(locacao.dataVencimento.split('T')[0])
                                : new Date();
                              base.setDate(base.getDate() + btn.dias);
                              setNovaDataProlongada(base.toISOString().split('T')[0]);
                            }}
                            style={{
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-hairline)',
                              backgroundColor: 'var(--pitch-black-50, #f6f3eb)',
                              color: 'var(--text-main)',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>

                      {/* Botão de Salvar */}
                      <button
                        type="button"
                        onClick={() => handleSalvarProlongamento(obra.id, locacao)}
                        disabled={isSavingProlongamento}
                        className="btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          padding: '6px 10px',
                          fontSize: '0.74rem',
                          borderRadius: '5px',
                          minHeight: 28,
                          fontWeight: 600,
                          marginTop: 2,
                          opacity: isSavingProlongamento ? 0.75 : 1,
                        }}
                      >
                        {isSavingProlongamento ? (
                          <>
                            <CircleNotch size={13} className="spin-animate" weight="bold" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <FloppyDisk size={13} weight="bold" />
                            <span>Salvar Prazo</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação de Locação */}
      <ModalRegistroLocacao
        isOpen={isModalLocacaoOpen}
        onClose={() => setIsModalLocacaoOpen(false)}
        obras={obras}
        preselectedObraId={selectedObraIdForModal}
        onSave={handleSaveLocacao}
      />



      {/* Modal de Confirmação de Exclusão */}
      <ModalConfirm
        isOpen={Boolean(deleteTarget)}
        title="Excluir Registro de Locação?"
        message={`Tem certeza que deseja remover o registro "${deleteTarget?.itemLocado}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Lightbox de Foto */}
      {lightboxFoto && (
        <div
          onClick={() => setLightboxFoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => setLightboxFoto(null)}
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.88rem',
              }}
            >
              <span>Fechar</span>
              <X size={20} weight="bold" />
            </button>
            <img
              src={lightboxFoto.url}
              alt={lightboxFoto.titulo || 'Foto ampliada'}
              style={{
                maxWidth: '100%',
                maxHeight: '82vh',
                objectFit: 'contain',
                borderRadius: '6px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            />
            {lightboxFoto.titulo && (
              <span
                style={{
                  color: '#ffffff',
                  marginTop: 10,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                {lightboxFoto.titulo}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
