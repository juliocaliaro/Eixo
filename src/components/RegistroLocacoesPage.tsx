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
} from '@phosphor-icons/react';
import { Obra, RegistroLocacao, PerfilUsuario } from '../types/obra';
import { ModalRegistroLocacao, NovaLocacaoData } from './ModalRegistroLocacao';
import { ModalConfirm } from './ModalConfirm';
import { generateUUID } from '../utils/uuid';

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

    const updatedObra: Obra = {
      ...obraAlvo,
      locacoes: (obraAlvo.locacoes || []).filter((l) => l.id !== locacaoId),
    };

    onUpdateObra(updatedObra);
    setDeleteTarget(null);

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
      {/* Barra de Topo Executiva */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Registro de Locação
              </h1>
            </div>
            <p
              style={{
                fontSize: '0.84rem',
                color: 'var(--text-muted)',
                margin: '2px 0 0 0',
              }}
            >
              Rastreamento de maquinários, ferramentas e equipamentos locados por obra
            </p>
          </div>
        </div>

        {/* Botão de Criação */}
        {perfilAtivo === 'construtor' && (
          <button
            type="button"
            onClick={() => handleOpenAdd(filtroObraId !== 'todas' ? filtroObraId : undefined)}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              minHeight: 44,
              fontSize: '0.9rem',
              borderRadius: '6px',
              fontWeight: 600,
            }}
          >
            <Plus size={18} weight="bold" />
            <span>Nova Locação</span>
          </button>
        )}
      </div>

      {/* KPI Cards / Indicadores Rápidos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total de Locações
          </span>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {kpis.total}
          </span>
        </div>

        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Ativos no Canteiro
          </span>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--coral-glow-500, #e05a47)' }}>
            {kpis.ativos}
          </span>
        </div>

        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Vencidos / Atenção
          </span>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: kpis.vencidos > 0 ? '#b91c1c' : 'var(--text-main)' }}>
            {kpis.vencidos}
          </span>
        </div>

        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Devolvidos
          </span>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#15803d' }}>
            {kpis.devolvidos}
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: '#ffffff',
          padding: '16px 20px',
          borderRadius: '8px',
          border: '1px solid var(--border-hairline)',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Seletor de Obra */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 260, flex: '1 1 280px' }}>
            <BuildingApartment size={18} color="var(--text-muted)" />
            <select
              value={filtroObraId}
              onChange={(e) => setFiltroObraId(e.target.value)}
              className="form-select"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-hairline)',
                fontSize: '0.88rem',
                backgroundColor: '#ffffff',
                color: 'var(--text-main)',
                outline: 'none',
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

          {/* Campo de Busca Livre */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--border-hairline)',
              borderRadius: '6px',
              padding: '8px 12px',
              backgroundColor: '#ffffff',
              minWidth: 240,
              flex: '1 1 240px',
            }}
          >
            <MagnifyingGlass size={16} color="var(--text-muted)" />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar item, locadora, obra..."
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.88rem',
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
                  padding: 0,
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Abas Rápidas de Status */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingTop: 4,
          }}
        >
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'ativos', label: 'Ativos' },
              { id: 'vencidos', label: 'Vencidos / Próximos' },
              { id: 'devolvidos', label: 'Devolvidos' },
            ] as const
          ).map((tab) => {
            const isActive = filtroStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFiltroStatus(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: isActive ? '1px solid var(--coral-glow-500, #e05a47)' : '1px solid var(--border-hairline)',
                  backgroundColor: isActive ? 'var(--dark-coffee-50, #fcfaf8)' : '#ffffff',
                  color: isActive ? 'var(--coral-glow-500, #e05a47)' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {locacoesFiltradas.map(({ locacao, obra }) => {
            const statusInfo = calcularStatusVencimento(locacao.dataVencimento, locacao.status);
            const primeiraFoto = (locacao.fotos && locacao.fotos.length > 0) ? locacao.fotos[0] : null;

            return (
              <div
                key={locacao.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid var(--border-hairline)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'border-color 0.15s ease',
                  opacity: locacao.status === 'devolvido' ? 0.8 : 1,
                }}
              >
                {/* Linha Principal: Foto + Informações + Ações */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: '1 1 300px' }}>
                    {/* Foto do Equipamento ou Placeholder */}
                    {primeiraFoto ? (
                      <div
                        onClick={() => setLightboxFoto({ url: primeiraFoto, titulo: locacao.itemLocado })}
                        style={{
                          width: 68,
                          height: 68,
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-hairline)',
                          cursor: 'pointer',
                          flexShrink: 0,
                          position: 'relative',
                          backgroundColor: '#f1f1f1',
                        }}
                        title="Clique para ampliar foto"
                      >
                        <img
                          src={primeiraFoto}
                          alt={locacao.itemLocado}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            right: 4,
                            bottom: 4,
                            backgroundColor: 'rgba(0, 0, 0, 0.65)',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <ArrowsOut size={11} weight="bold" />
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 68,
                          height: 68,
                          borderRadius: '6px',
                          backgroundColor: 'var(--dark-coffee-50, #fcfaf8)',
                          border: '1px solid var(--border-hairline)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                        }}
                      >
                        <Wrench size={24} />
                      </div>
                    )}

                    {/* Descrição do Item, Obra e Tags */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <h4
                          style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            margin: 0,
                            textDecoration: locacao.status === 'devolvido' ? 'line-through' : 'none',
                          }}
                        >
                          {locacao.itemLocado}
                        </h4>

                        {/* Badge de Vencimento */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            backgroundColor: statusInfo.badgeBg,
                            color: statusInfo.badgeColor,
                            border: `1px solid ${statusInfo.badgeBorder}`,
                          }}
                        >
                          {statusInfo.tipo === 'vencido' || statusInfo.tipo === 'hoje' ? (
                            <Warning size={13} weight="fill" />
                          ) : statusInfo.tipo === 'devolvido' ? (
                            <CheckCircle size={13} weight="fill" />
                          ) : (
                            <Clock size={13} />
                          )}
                          <span>{statusInfo.label}</span>
                        </span>

                        {/* Badge de Período (Diária, Semanal, Quinzenal, Mensal) */}
                        {locacao.periodo && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              backgroundColor: 'var(--pitch-black-50, #f6f3eb)',
                              color: 'var(--text-main)',
                              border: '1px solid var(--border-hairline)',
                            }}
                          >
                            <Clock size={13} />
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
                        )}

                        {/* Badge de Renovação (se renovado após vencimento) */}
                        {locacao.renovado && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                            }}
                            title={
                              locacao.vencimentoOriginal
                                ? `Vencimento programado anterior: ${formatarData(locacao.vencimentoOriginal)}`
                                : 'Locação renovada'
                            }
                          >
                            <ArrowsClockwise size={13} weight="bold" />
                            <span>Renovado</span>
                          </span>
                        )}
                      </div>

                      {/* Obra Vinculada e Fornecedor */}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            backgroundColor: 'var(--pitch-black-50, #f6f3eb)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          <BuildingApartment size={13} />
                          <span>{obra.nome}</span>
                        </span>

                        {locacao.fornecedor && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <Storefront size={13} />
                            <span>{locacao.fornecedor}</span>
                          </span>
                        )}

                        {locacao.vencimentoOriginal && (
                          <span
                            style={{
                              fontSize: '0.76rem',
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                            }}
                          >
                            (Vencimento inicial: {formatarData(locacao.vencimentoOriginal)})
                          </span>
                        )}
                      </div>

                      {/* Galeria de Fotos Secundárias */}
                      {locacao.fotos && locacao.fotos.length > 1 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          {locacao.fotos.slice(1).map((foto, idx) => (
                            <div
                              key={idx}
                              onClick={() => setLightboxFoto({ url: foto, titulo: `${locacao.itemLocado} (Foto ${idx + 2})` })}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: '1px solid var(--border-hairline)',
                                cursor: 'pointer',
                              }}
                            >
                              <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas à Direita */}
                  {perfilAtivo === 'construtor' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        alignSelf: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Botão de Marcar Devolvido / Reativar */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(obra.id, locacao.id)}
                        className="btn-secondary"
                        style={{
                          padding: '6px 12px',
                          minHeight: 36,
                          fontSize: '0.82rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600,
                          color: locacao.status === 'devolvido' ? 'var(--text-muted)' : '#15803d',
                        }}
                        title={locacao.status === 'devolvido' ? 'Reativar locação' : 'Marcar equipamento como devolvido'}
                      >
                        {locacao.status === 'devolvido' ? (
                          <>
                            <ClockCounterClockwise size={15} />
                            <span>Reativar</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={15} weight="bold" />
                            <span>Devolver</span>
                          </>
                        )}
                      </button>

                      {/* Botão Excluir */}
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
                          width: 36,
                          height: 36,
                          borderRadius: '6px',
                          border: '1px solid var(--border-hairline)',
                          background: '#ffffff',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.15s ease, border-color 0.15s ease',
                        }}
                        title="Excluir registro de locação"
                        aria-label="Excluir locação"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#b91c1c';
                          e.currentTarget.style.borderColor = '#fca5a5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-muted)';
                          e.currentTarget.style.borderColor = 'var(--border-hairline)';
                        }}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Opção de Renovação / Prolongamento: no card já criado */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: locacao.renovado ? 'var(--dark-coffee-50, #fcfaf8)' : '#fafafa',
                    border: locacao.renovado
                      ? '1px solid var(--coral-glow-500, #e05a47)'
                      : '1px dashed var(--border-hairline)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: perfilAtivo === 'construtor' ? 'pointer' : 'default',
                        userSelect: 'none',
                        flex: '1 1 280px',
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
                          width: 18,
                          height: 18,
                          accentColor: 'var(--coral-glow-500, #e05a47)',
                          cursor: perfilAtivo === 'construtor' ? 'pointer' : 'default',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            lineHeight: 1.25,
                          }}
                        >
                          Renovei a locação após o vencimento programado
                        </span>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: 'var(--text-muted)',
                            marginTop: 2,
                          }}
                        >
                          Marque se este equipamento teve o contrato estendido além do prazo inicial
                        </span>
                      </div>
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
                          gap: 6,
                          padding: '6px 12px',
                          minHeight: 34,
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          color: locacao.renovado ? 'var(--coral-glow-500, #e05a47)' : 'var(--text-main)',
                        }}
                        title={locacao.renovado ? 'Alterar nova data estendida' : 'Prolongar prazo de vencimento'}
                      >
                        <ArrowsClockwise size={15} weight="bold" />
                        <span>
                          {locacao.renovado
                            ? (prolongandoLocacaoId === locacao.id ? 'Fechar Edição' : 'Prolongar Mais / Alterar Data')
                            : (prolongandoLocacaoId === locacao.id ? 'Cancelar' : 'Prolongar')}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Painel Inline de Prolongamento / Nova Data de Vencimento */}
                  {prolongandoLocacaoId === locacao.id && perfilAtivo === 'construtor' && (
                    <div
                      style={{
                        borderTop: '1px solid var(--border-hairline)',
                        paddingTop: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        backgroundColor: '#ffffff',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {locacao.renovado ? 'Alterar prazo estendido:' : 'Definir novo vencimento da locação:'}
                        </span>
                        {locacao.dataVencimento && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Vencimento atual: <strong>{formatarData(locacao.dataVencimento)}</strong>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <input
                            type="date"
                            value={novaDataProlongada}
                            onChange={(e) => setNovaDataProlongada(e.target.value)}
                            className="form-input"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-hairline)',
                              fontSize: '0.88rem',
                              outline: 'none',
                            }}
                            required
                          />
                        </div>

                        {/* Atalhos Rápidos por Período */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[
                            { dias: 1, label: '+1 dia (Diária)' },
                            { dias: 7, label: '+7 dias (Semanal)' },
                            { dias: 15, label: '+15 dias (Quinzenal)' },
                            { dias: 30, label: '+30 dias (Mensal)' },
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
                                padding: '6px 10px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-hairline)',
                                backgroundColor: 'var(--pitch-black-50, #f6f3eb)',
                                color: 'var(--text-main)',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Ações de Salvar / Cancelar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => setProlongandoLocacaoId(null)}
                          className="btn-secondary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.82rem',
                            borderRadius: '6px',
                            minHeight: 34,
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSalvarProlongamento(obra.id, locacao)}
                          className="btn-primary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            fontSize: '0.82rem',
                            borderRadius: '6px',
                            minHeight: 34,
                            fontWeight: 600,
                          }}
                        >
                          <FloppyDisk size={15} weight="bold" />
                          <span>Confirmar Prolongamento</span>
                        </button>
                      </div>
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
