import React, { useState, useMemo, useRef } from 'react';
import {
  Wrench,
  Plus,
  Trash,
  X,
  Clock,
  CheckCircle,
  Warning,
  MagnifyingGlass,
  ClockCounterClockwise,
  ArrowsClockwise,
  ArrowUUpLeft,
  Funnel,
  FilePdf,
  CircleNotch,
} from '@phosphor-icons/react';
import { Obra, RegistroLocacao, PerfilUsuario } from '../types/obra';
import { ModalRegistroLocacao, NovaLocacaoData } from './ModalRegistroLocacao';
import { ModalConfirm } from './ModalConfirm';
import { PageHeader } from './PageHeader';
import { OverflowMenu, OverflowItem } from './OverflowMenu';
import { EmptyState } from './EmptyState';
import { DatePickerInput } from './DatePickerInput';
import { generateUUID } from '../utils/uuid';
import { locacoesApi } from '../services/api';
import { isPdfUrl } from '../utils/fileUtils';
import { GalleryLightbox } from './Lightbox';
import { somarDiasData, formatarDataBR } from '../utils/data';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { usePopoverDismiss } from '../hooks/usePopoverDismiss';
import {
  hojeLocal,
  statusLocacao,
  mapaStatusLocacoes,
  contarKpis,
  filtrarLocacoes,
  sugerirNovoVencimento,
  renovarLocacao,
  desfazerRenovacao,
  alternarDevolucao,
  atualizarLocacaoNaLista,
  resumoKpisTexto,
  type FiltroStatusLocacao,
} from '../utils/locacao';
import '../styles/registros-modelos.css';

interface RegistroLocacoesPageProps {
  obras: Obra[];
  onUpdateObra: (obra: Obra) => void;
  onBack: () => void;
  showToast: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
  perfilAtivo?: PerfilUsuario;
}

const OPCOES_STATUS: { id: FiltroStatusLocacao; label: string }[] = [
  { id: 'ativos', label: 'Ativos' },
  { id: 'vencidos', label: 'Vencidos' },
  { id: 'devolvidos', label: 'Devolvidos' },
  { id: 'todos', label: 'Todos' },
];

const ATALHOS_PRAZO = [7, 15, 30, 60];

export const RegistroLocacoesPage: React.FC<RegistroLocacoesPageProps> = ({
  obras,
  onUpdateObra,
  onBack,
  showToast,
  perfilAtivo = 'construtor',
}) => {
  const podeEditar = perfilAtivo === 'construtor';

  const [filtroObraId, setFiltroObraId] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusLocacao>('ativos');
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [isBuscaOpen, setIsBuscaOpen] = useState(false);
  const [isFiltroOpen, setIsFiltroOpen] = useState(false);
  const [isModalLocacaoOpen, setIsModalLocacaoOpen] = useState(false);
  const [selectedObraIdForModal, setSelectedObraIdForModal] = useState<string | undefined>(undefined);

  const buscaRef = useRef<HTMLDivElement>(null);
  const filtroRef = useRef<HTMLDivElement>(null);
  usePopoverDismiss(buscaRef, isBuscaOpen, () => setIsBuscaOpen(false), ['mousedown', 'touchstart']);
  usePopoverDismiss(filtroRef, isFiltroOpen, () => setIsFiltroOpen(false), ['mousedown', 'touchstart']);

  // Lightbox de foto com suporte a navegação
  const [lightboxState, setLightboxState] = useState<{
    fotos: string[];
    index: number;
    titulo?: string;
  } | null>(null);

  // Confirmação de devolução
  const [devolverTarget, setDevolverTarget] = useState<{
    obraId: string;
    locacaoId: string;
    itemLocado: string;
  } | null>(null);

  // Prolongamento (renovação) em folha própria
  const [prolongarTarget, setProlongarTarget] = useState<{ obraId: string; locacao: RegistroLocacao } | null>(null);
  const [novaDataProlongada, setNovaDataProlongada] = useState<string>('');
  const [isSavingProlongamento, setIsSavingProlongamento] = useState(false);
  useEscapeKey(() => setProlongarTarget(null), Boolean(prolongarTarget));

  // Confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<{
    obraId: string;
    locacaoId: string;
    itemLocado: string;
  } | null>(null);

  // Coleta todas as locações de todas as obras
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

  // Data atual de referência no calendário LOCAL (YYYY-MM-DD)
  const hoje = useMemo(() => hojeLocal(), []);
  const formatarData = (isoDate?: string) => formatarDataBR(isoDate, '');

  // Status de domínio calculado uma única vez por locação
  const statusPorId = useMemo(
    () => mapaStatusLocacoes(todasLocacoes.map((i) => i.locacao), hoje),
    [todasLocacoes, hoje]
  );

  // Apresentação (texto e tom) a partir do status de domínio
  const apresentarStatus = (locacao: RegistroLocacao) => {
    const s = statusPorId.get(locacao.id) ?? statusLocacao(locacao, hoje);
    const pl = (n: number) => (n === 1 ? 'dia' : 'dias');
    const data = formatarData(locacao.dataVencimento);
    switch (s.tipo) {
      case 'devolvido':
        return { tipo: s.tipo, label: 'Devolvido', Icon: CheckCircle };
      case 'ativo':
        return { tipo: s.tipo, label: 'Em aberto', Icon: Clock };
      case 'vencido':
        return { tipo: s.tipo, label: `Vencido há ${Math.abs(s.dias)} ${pl(Math.abs(s.dias))}`, Icon: Warning };
      case 'hoje':
        return { tipo: s.tipo, label: 'Vence hoje', Icon: Warning };
      case 'urgente':
        return { tipo: s.tipo, label: `Vence em ${s.dias} ${pl(s.dias)}`, Icon: Clock };
      default:
        return { tipo: s.tipo, label: `Vence em ${s.dias} dias${data ? ` · ${data}` : ''}`, Icon: Clock };
    }
  };

  const kpis = useMemo(() => contarKpis(statusPorId.values()), [statusPorId]);
  const resumo = useMemo(() => resumoKpisTexto(kpis), [kpis]);

  const locacoesFiltradas = useMemo(
    () => filtrarLocacoes(todasLocacoes, { obraId: filtroObraId, status: filtroStatus, termo: termoBusca }, statusPorId),
    [todasLocacoes, filtroObraId, filtroStatus, termoBusca, statusPorId]
  );

  const filtroAlterado = filtroStatus !== 'ativos' || filtroObraId !== 'todas';
  const existeFiltro = filtroStatus !== 'todos' || filtroObraId !== 'todas' || termoBusca.trim() !== '';

  const limparFiltros = () => {
    setFiltroStatus('todos');
    setFiltroObraId('todas');
    setTermoBusca('');
  };

  const handleOpenAdd = (obraId?: string) => {
    setSelectedObraIdForModal(obraId);
    setIsModalLocacaoOpen(true);
  };

  const handleSaveLocacao = (dados: NovaLocacaoData) => {
    const obraAlvo = obras.find((o) => o.id === dados.obraId);
    if (!obraAlvo) return;

    const novaLocacao: RegistroLocacao = {
      id: dados.id ?? generateUUID(),
      obraId: dados.obraId,
      itemLocado: dados.itemLocado,
      quantidade: dados.quantidade,
      periodo: dados.periodo,
      dataVencimento: dados.dataVencimento,
      fotos: dados.fotos,
      fornecedor: dados.fornecedor,
      status: 'ativo',
      renovado: false,
      criadoEm: new Date().toISOString(),
    };

    onUpdateObra({
      ...obraAlvo,
      locacoes: [novaLocacao, ...(obraAlvo.locacoes || [])],
    });
    setIsModalLocacaoOpen(false);

    showToast('Locação registrada', `"${dados.itemLocado}" foi vinculada à obra "${obraAlvo.nome}".`, 'success');
  };

  const handleIniciarProlongamento = (obraId: string, locacao: RegistroLocacao) => {
    setNovaDataProlongada(sugerirNovoVencimento(locacao, hojeLocal()));
    setProlongarTarget({ obraId, locacao });
  };

  const handleDesfazerRenovacao = (obraId: string, locacao: RegistroLocacao) => {
    const obraAlvo = obras.find((o) => o.id === obraId);
    if (!obraAlvo) return;

    const dataRestaurada = locacao.vencimentoOriginal || locacao.dataVencimento;
    onUpdateObra({
      ...obraAlvo,
      locacoes: atualizarLocacaoNaLista(obraAlvo.locacoes || [], locacao.id, desfazerRenovacao),
    });

    showToast(
      'Renovação desfeita',
      `"${locacao.itemLocado}" voltou ao vencimento original (${formatarData(dataRestaurada)}).`,
      'info'
    );
  };

  const handleSalvarProlongamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prolongarTarget || !novaDataProlongada.trim()) return;
    const { obraId, locacao } = prolongarTarget;

    const obraAlvo = obras.find((o) => o.id === obraId);
    if (!obraAlvo) return;

    setIsSavingProlongamento(true);
    try {
      onUpdateObra({
        ...obraAlvo,
        locacoes: atualizarLocacaoNaLista(obraAlvo.locacoes || [], locacao.id, (l) =>
          renovarLocacao(l, { novoVencimento: novaDataProlongada })
        ),
      });
      setProlongarTarget(null);
      showToast(
        'Prazo prolongado',
        `"${locacao.itemLocado}" agora vence em ${formatarData(novaDataProlongada)}.`,
        'success'
      );
    } finally {
      setIsSavingProlongamento(false);
    }
  };

  const handleToggleStatus = (obraId: string, locacaoId: string) => {
    const obraAlvo = obras.find((o) => o.id === obraId);
    if (!obraAlvo) return;

    const locacaoExistente = (obraAlvo.locacoes || []).find((l) => l.id === locacaoId);
    if (!locacaoExistente) return;

    const novoStatus = alternarDevolucao(locacaoExistente).status;

    onUpdateObra({
      ...obraAlvo,
      locacoes: atualizarLocacaoNaLista(obraAlvo.locacoes || [], locacaoId, alternarDevolucao),
    });

    showToast(
      novoStatus === 'devolvido' ? 'Equipamento devolvido' : 'Locação reativada',
      novoStatus === 'devolvido'
        ? `"${locacaoExistente.itemLocado}" foi marcado como devolvido.`
        : `"${locacaoExistente.itemLocado}" voltou para as locações ativas.`,
      'info'
    );
  };

  const handleConfirmDevolver = () => {
    if (!devolverTarget) return;
    handleToggleStatus(devolverTarget.obraId, devolverTarget.locacaoId);
    setDevolverTarget(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { obraId, locacaoId, itemLocado } = deleteTarget;
    const obraAlvo = obras.find((o) => o.id === obraId);
    if (!obraAlvo) return;

    const locacaoAlvo = (obraAlvo.locacoes || []).find((l) => l.id === locacaoId);

    onUpdateObra({
      ...obraAlvo,
      locacoes: (obraAlvo.locacoes || []).filter((l) => l.id !== locacaoId),
    });
    setDeleteTarget(null);

    // Remove do Supabase no servidor e do Storage
    locacoesApi.delete(locacaoId, locacaoAlvo?.fotos);

    showToast('Locação removida', `"${itemLocado}" foi excluída.`, 'info');
  };

  const pedirDevolucao = (obraId: string, locacao: RegistroLocacao) => {
    if (locacao.status === 'devolvido') {
      handleToggleStatus(obraId, locacao.id);
    } else {
      setDevolverTarget({ obraId, locacaoId: locacao.id, itemLocado: locacao.itemLocado });
    }
  };

  const menuItens = (obra: Obra, locacao: RegistroLocacao): OverflowItem[] => {
    const devolvido = locacao.status === 'devolvido';
    const itens: OverflowItem[] = [
      {
        key: 'devolver',
        label: devolvido ? 'Reativar' : 'Devolver',
        icon: devolvido ? <ClockCounterClockwise size={18} aria-hidden="true" /> : <CheckCircle size={18} aria-hidden="true" />,
        onSelect: () => pedirDevolucao(obra.id, locacao),
      },
      {
        key: 'prolongar',
        label: 'Prolongar',
        icon: <ArrowsClockwise size={18} aria-hidden="true" />,
        onSelect: () => handleIniciarProlongamento(obra.id, locacao),
      },
    ];
    if (locacao.renovado) {
      itens.push({
        key: 'desfazer',
        label: 'Desfazer renovação',
        icon: <ArrowUUpLeft size={18} aria-hidden="true" />,
        onSelect: () => handleDesfazerRenovacao(obra.id, locacao),
      });
    }
    itens.push({
      key: 'excluir',
      label: 'Excluir',
      icon: <Trash size={18} aria-hidden="true" />,
      danger: true,
      onSelect: () => setDeleteTarget({ obraId: obra.id, locacaoId: locacao.id, itemLocado: locacao.itemLocado }),
    });
    return itens;
  };

  const baseAtalhos = prolongarTarget?.locacao.dataVencimento
    ? prolongarTarget.locacao.dataVencimento.split('T')[0]
    : hojeLocal();

  return (
    <div className="page rg-page">
      <PageHeader
        backLabel="Voltar"
        onBack={onBack}
        title={<><span className="rg-title-long">Registro de locação</span><span className="rg-title-short">Locações</span></>}
        actions={
          podeEditar ? (
            <button
              type="button"
              className="btn-primary rg-cta"
              onClick={() => handleOpenAdd(filtroObraId !== 'todas' ? filtroObraId : undefined)}
              aria-label="Nova locação"
            >
              <Plus size={18} weight="bold" aria-hidden="true" />
              <span>
                Nova<span className="rg-hide-xs"> locação</span>
              </span>
            </button>
          ) : null
        }
      />

      {todasLocacoes.length > 0 && (
        <div className="toolbar rg-toolbar">
          <p className="toolbar-lead rg-summary" aria-live="polite">
            {resumo.map((parte, i) => (
              <React.Fragment key={parte.chave}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <span className={parte.alerta ? 'rg-summary-alert' : undefined}>{parte.texto}</span>
              </React.Fragment>
            ))}
          </p>

          <div ref={buscaRef}>
            <button
              type="button"
              className="btn-icon"
              aria-label="Buscar locação"
              aria-expanded={isBuscaOpen}
              onClick={() => {
                setIsBuscaOpen((v) => !v);
                setIsFiltroOpen(false);
              }}
            >
              <MagnifyingGlass size={18} aria-hidden="true" />
              {termoBusca && <span className="dot" />}
            </button>
            {isBuscaOpen && (
              <div className="toolbar-popover rg-popover">
                <div className="rg-search">
                  <MagnifyingGlass size={18} aria-hidden="true" />
                  <input
                    type="text"
                    enterKeyHint="search"
                    autoFocus
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    placeholder="Equipamento, obra ou locadora"
                    aria-label="Buscar locação"
                  />
                  {termoBusca && (
                    <button type="button" className="rg-search-clear" onClick={() => setTermoBusca('')} aria-label="Limpar busca">
                      <X size={16} weight="bold" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={filtroRef}>
            <button
              type="button"
              className="btn-icon"
              aria-label="Filtrar locações"
              aria-expanded={isFiltroOpen}
              onClick={() => {
                setIsFiltroOpen((v) => !v);
                setIsBuscaOpen(false);
              }}
            >
              <Funnel size={18} aria-hidden="true" />
              {filtroAlterado && <span className="dot" />}
            </button>
            {isFiltroOpen && (
              <div className="toolbar-popover rg-popover" role="menu">
                <div className="rg-pop-group">Situação</div>
                {OPCOES_STATUS.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    role="menuitemradio"
                    className="option"
                    aria-checked={filtroStatus === op.id}
                    onClick={() => {
                      setFiltroStatus(op.id);
                      setIsFiltroOpen(false);
                    }}
                  >
                    {op.label}
                  </button>
                ))}
                {obras.length > 1 && (
                  <>
                    <div className="rg-pop-group">Obra</div>
                    <button
                      type="button"
                      role="menuitemradio"
                      className="option"
                      aria-checked={filtroObraId === 'todas'}
                      onClick={() => {
                        setFiltroObraId('todas');
                        setIsFiltroOpen(false);
                      }}
                    >
                      Todas as obras
                    </button>
                    {obras.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        role="menuitemradio"
                        className="option"
                        aria-checked={filtroObraId === o.id}
                        onClick={() => {
                          setFiltroObraId(o.id);
                          setIsFiltroOpen(false);
                        }}
                      >
                        <span className="rg-option-text">{o.nome}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {todasLocacoes.length === 0 ? (
        <EmptyState icon={Wrench} title="Nenhuma locação registrada." />
      ) : locacoesFiltradas.length === 0 ? (
        <EmptyState
          icon={Wrench}
          variant="filtered"
          title="Nenhuma locação neste filtro."
          action={existeFiltro ? { label: 'Limpar filtros', onClick: limparFiltros } : undefined}
        />
      ) : (
        <ul className="rg-list">
          {locacoesFiltradas.map(({ locacao, obra }) => {
            const st = apresentarStatus(locacao);
            const primeiraFoto = locacao.fotos && locacao.fotos.length > 0 ? locacao.fotos[0] : null;
            const StIcon = st.Icon;
            const devolvido = locacao.status === 'devolvido';
            const detalhe = [obra.nome, locacao.fornecedor].filter(Boolean).join(' · ');

            return (
              <li key={locacao.id} className={`list-row rg-row${devolvido ? ' rg-row--done' : ''}`}>
                {primeiraFoto ? (
                  <button
                    type="button"
                    className="rg-thumb"
                    onClick={() => setLightboxState({ fotos: locacao.fotos, index: 0, titulo: locacao.itemLocado })}
                    aria-label={`Ampliar foto de ${locacao.itemLocado}`}
                  >
                    {isPdfUrl(primeiraFoto) ? (
                      <FilePdf size={26} weight="fill" aria-hidden="true" />
                    ) : (
                      <img src={primeiraFoto} alt="" loading="lazy" />
                    )}
                    {locacao.fotos.length > 1 && <span className="rg-thumb-count">+{locacao.fotos.length - 1}</span>}
                  </button>
                ) : (
                  <div className="rg-thumb" aria-hidden="true">
                    <Wrench size={24} weight="duotone" />
                  </div>
                )}

                <div className="list-row-main">
                  <div className="rg-row-title">
                    <span className="rg-row-name" title={locacao.itemLocado}>
                      {locacao.itemLocado}
                    </span>
                    {locacao.quantidade && locacao.quantidade > 0 ? (
                      <span className="badge badge--accent" title={`Quantidade: ${locacao.quantidade}`}>
                        {locacao.quantidade}×
                      </span>
                    ) : null}
                  </div>
                  <div className="list-row-sub rg-row-sub">{detalhe}</div>
                  <div className={`rg-status rg-status--${st.tipo}`}>
                    <StIcon size={14} weight={st.tipo === 'vencido' || st.tipo === 'hoje' ? 'fill' : 'regular'} aria-hidden="true" />
                    <span>
                      {st.label}
                      {locacao.renovado ? ' · Renovado' : ''}
                    </span>
                  </div>
                </div>

                {podeEditar && (
                  <div className="list-row-end">
                    <button
                      type="button"
                      className="btn-secondary btn--sm rg-desktop-only"
                      onClick={() => pedirDevolucao(obra.id, locacao)}
                    >
                      {devolvido ? 'Reativar' : 'Devolver'}
                    </button>
                    <OverflowMenu
                      items={menuItens(obra, locacao)}
                      label={`Ações da locação ${locacao.itemLocado}`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ModalRegistroLocacao
        isOpen={isModalLocacaoOpen}
        onClose={() => setIsModalLocacaoOpen(false)}
        obras={obras}
        preselectedObraId={selectedObraIdForModal}
        onSave={handleSaveLocacao}
      />

      {/* Prolongar: folha com atalhos de prazo e o seletor de data do app */}
      {prolongarTarget && (
        <div className="modal-backdrop" onClick={() => setProlongarTarget(null)}>
          <div
            className="modal-card rg-sheet rg-sheet--calendar"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prolongar-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title" id="prolongar-title">
                Prolongar locação
              </h2>
              <button type="button" className="btn-icon" onClick={() => setProlongarTarget(null)} aria-label="Fechar">
                <X size={20} weight="bold" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSalvarProlongamento}>
              <div className="modal-body rg-sheet-body">
                <p className="rg-sheet-lead">{prolongarTarget.locacao.itemLocado}</p>
                <div className="rg-chips" role="group" aria-label="Prolongar por">
                  {ATALHOS_PRAZO.map((dias) => {
                    const alvo = somarDiasData(baseAtalhos, dias);
                    return (
                      <button
                        key={dias}
                        type="button"
                        className="rg-chip"
                        aria-pressed={novaDataProlongada === alvo}
                        onClick={() => setNovaDataProlongada(alvo)}
                      >
                        +{dias} dias
                      </button>
                    );
                  })}
                </div>
                <DatePickerInput
                  value={novaDataProlongada}
                  onChange={setNovaDataProlongada}
                  label="Novo vencimento"
                  helperText=""
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setProlongarTarget(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingProlongamento || !novaDataProlongada}>
                  {isSavingProlongamento ? (
                    <>
                      <CircleNotch size={16} className="spin-animate" weight="bold" aria-hidden="true" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar prazo</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ModalConfirm
        isOpen={Boolean(devolverTarget)}
        title="Confirmar devolução"
        message={`Deseja confirmar a devolução de "${devolverTarget?.itemLocado}"? O equipamento sai da lista de ativos e vai para os devolvidos.`}
        confirmText="Devolver"
        cancelText="Cancelar"
        variant="warning"
        onConfirm={handleConfirmDevolver}
        onCancel={() => setDevolverTarget(null)}
      />

      <ModalConfirm
        isOpen={Boolean(deleteTarget)}
        title="Excluir locação?"
        message={`Tem certeza que deseja remover o registro "${deleteTarget?.itemLocado}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {lightboxState && (
        <GalleryLightbox
          fotos={lightboxState.fotos}
          index={lightboxState.index}
          titulo={lightboxState.titulo}
          tituloPadrao="Visualização do equipamento"
          onIndexChange={(i) => setLightboxState((prev) => (prev ? { ...prev, index: i } : null))}
          onClose={() => setLightboxState(null)}
        />
      )}
    </div>
  );
};
