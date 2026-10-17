import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useToggleMap } from '../hooks/useToggleMap';
import { usePopoverDismiss } from '../hooks/usePopoverDismiss';
import { Lightbox } from './Lightbox';
import { SegmentedControl } from './SegmentedControl';
import { EmptyState } from './EmptyState';
// Ordem do CSS: index e foundation antes deste arquivo (App importa os componentes antes de main.tsx importar os CSS globais)
import '../index.css';
import '../styles/foundation.css';
import '../styles/decisoes-diario.css';
import { DatePickerInput } from './DatePickerInput';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  BookOpen,
  CheckCircle,
  Clock,
  SealCheck,
  XCircle,
  Camera,
  NotePencil,
  Kanban,
  MagnifyingGlass,
  Plus,
  ArrowRight,
  X,
  CalendarBlank,
  Funnel,
  Check,
  CaretDown,
  CircleNotch,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import { normalizeFile, releasePreview, storeNormalized, buildStoragePath } from '../utils/fileIntake';
import { Obra, AnexoItem, PerfilUsuario } from '../types/obra';
import { formatarMoeda } from '../utils/moeda';
import { montarExtrato, DiarioEntry } from '../utils/diarioExtrato';
import { ImpactoFinanceiroBadge } from './ImpactoFinanceiroBadge';

export type { DiarioEntry };

interface DiarioObraTabProps {
  obra: Obra;
  perfilAtivo?: PerfilUsuario;
  onAddAnexoGeral?: (anexo: Omit<AnexoItem, 'id' | 'data'>) => void;
  onDeleteAnexo?: (anexoId: string) => void;
  onNavigateToTask?: (etapaId: string, tarefaId: string) => void;
  onNavigateToDecisoes?: () => void;
  onUpdateTaskMedia?: (etapaId: string, tarefaId: string, fotos: string[], anotacoes: string[]) => void;
}

export const DiarioObraTab: React.FC<DiarioObraTabProps> = ({
  obra,
  perfilAtivo = 'construtor',
  onAddAnexoGeral,
  onNavigateToTask,
  onNavigateToDecisoes,
  onUpdateTaskMedia,
}) => {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [periodoFiltro, setPeriodoFiltro] = useState<'todos' | 'hoje' | '7dias' | '30dias' | 'intervalo'>('todos');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  // Accordion Mobile
  const [expandedMobileIds, toggleMobileExpand] = useToggleMap();

  // Lightbox
  const [selectedImageModal, setSelectedImageModal] = useState<{
    url: string;
    titulo: string;
    subtitulo?: string;
  } | null>(null);

  // Modal Novo Registro de Diário
  const [isNovoRegistroOpen, setIsNovoRegistroOpen] = useState(false);
  const [novoTipo, setNovoTipo] = useState<'foto' | 'anotacao'>('foto');
  const [novoDestino, setNovoDestino] = useState<'geral' | 'tarefa'>('geral');
  const [novaEtapaId, setNovaEtapaId] = useState<string>(obra.etapas[0]?.id || '');
  const [novaTarefaId, setNovaTarefaId] = useState<string>('');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoConteudo, setNovoConteudo] = useState('');
  const [novaFotoPreview, setNovaFotoPreview] = useState<string | null>(null);
  const [novaFotoArquivo, setNovaFotoArquivo] = useState<File | null>(null);
  const [isSalvandoRegistro, setIsSalvandoRegistro] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fechar popups de busca e filtro ao clicar fora (ou Escape)
  usePopoverDismiss(searchContainerRef, isSearchOpen, () => setIsSearchOpen(false));
  usePopoverDismiss(filterContainerRef, isFilterOpen, () => setIsFilterOpen(false));

  // Escape fecha apenas o overlay do topo (lightbox > modal > popups).
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const fecharNovoRegistro = () => {
    if (novaFotoPreview && novaFotoPreview.startsWith('blob:')) URL.revokeObjectURL(novaFotoPreview);
    setNovaFotoArquivo(null);
    setNovaFotoPreview(null);
    setFormError(null);
    setIsNovoRegistroOpen(false);
  };
  useEscapeKey(fecharNovoRegistro, isNovoRegistroOpen);

  const badgeMobile = (tipo: DiarioEntry['tipo']): string => {
    switch (tipo) {
      case 'servico_concluido':
      case 'decisao_aprovada':
      case 'vistoria_concluida':
        return 'badge--ok';
      case 'decisao_criada':
        return 'badge--warn';
      case 'decisao_recusada':
        return 'badge--danger';
      case 'evidencia_tarefa':
      case 'anexo_geral':
        return 'badge--accent';
      default:
        return 'badge--neutral';
    }
  };
  const semCaixaAlta = (t: string) => {
    const baixo = t.toLowerCase();
    return baixo.charAt(0).toUpperCase() + baixo.slice(1);
  };

  const formatarHora = (isoStr?: string): string => {
    if (!isoStr) return '--:--';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  // Helpers do filtro de período
  const isPeriodoAtivo = periodoFiltro !== 'todos' || Boolean(dataInicio || dataFim);

  const labelPeriodoAtivo = useMemo(() => {
    if (periodoFiltro === 'hoje') return 'Hoje';
    if (periodoFiltro === '7dias') return 'Últimos 7 dias';
    if (periodoFiltro === '30dias') return 'Últimos 30 dias';
    if (periodoFiltro === 'intervalo') {
      if (dataInicio && dataFim) {
        const dI = dataInicio.split('-').reverse().slice(0, 2).join('/');
        const dF = dataFim.split('-').reverse().slice(0, 2).join('/');
        return `${dI} a ${dF}`;
      }
      if (dataInicio) {
        return `A partir de ${dataInicio.split('-').reverse().slice(0, 2).join('/')}`;
      }
      if (dataFim) {
        return `Até ${dataFim.split('-').reverse().slice(0, 2).join('/')}`;
      }
      return 'Intervalo';
    }
    return '';
  }, [periodoFiltro, dataInicio, dataFim]);

  // 3. Extrato por dia (consolidação, filtro de período/busca e agrupamento em utils/diarioExtrato)
  const extratoPorDia = useMemo(
    () =>
      montarExtrato(
        obra,
        { busca: searchTerm, periodo: periodoFiltro, dataInicio, dataFim },
        new Date()
      ),
    [obra, searchTerm, periodoFiltro, dataInicio, dataFim]
  );

  // Submissão do Modal de Novo Registro
  const handleSalvarNovoRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (novoTipo === 'foto' && (!novaFotoPreview || !novaFotoArquivo)) {
      setFormError('Selecione uma imagem para registrar.');
      return;
    }
    if (novoTipo === 'anotacao' && !novoConteudo.trim()) {
      setFormError('Escreva a anotação técnica antes de salvar.');
      return;
    }

    setIsSalvandoRegistro(true);
    try {
      let fotoUrlFinal = novaFotoPreview;
      if (novoTipo === 'foto' && novaFotoArquivo) {
        const item = await normalizeFile(novaFotoArquivo);
        releasePreview(item);
        fotoUrlFinal = await storeNormalized(item, {
          bucket: 'evidencias-diario',
          path: buildStoragePath(`${obra.id}/diario/${Date.now()}`, item),
        });
      }

      if (novoDestino === 'tarefa' && novaEtapaId && novaTarefaId && onUpdateTaskMedia) {
        const etapa = obra.etapas.find((et) => et.id === novaEtapaId);
        const tarefa = etapa?.tarefas.find((t) => t.id === novaTarefaId);
        if (etapa && tarefa) {
          const fotosAtuais = tarefa.fotos ? [...tarefa.fotos] : [];
          const notasAtuais = tarefa.anotacoes ? [...tarefa.anotacoes] : [];

          if (novoTipo === 'foto' && fotoUrlFinal) {
            fotosAtuais.push(fotoUrlFinal);
          } else if (novoTipo === 'anotacao' && novoConteudo.trim()) {
            notasAtuais.push(novoConteudo.trim());
          }

          onUpdateTaskMedia(etapa.id, tarefa.id, fotosAtuais, notasAtuais);
        }
      } else if (onAddAnexoGeral) {
        onAddAnexoGeral({
          titulo: novoTitulo.trim() || (novoTipo === 'foto' ? 'Foto de Canteiro' : 'Anotação Técnica'),
          tipo: novoTipo,
          conteudo: novoTipo === 'foto' ? (fotoUrlFinal as string) : novoConteudo.trim(),
        });
      }

      if (novaFotoPreview && novaFotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(novaFotoPreview);
      }
      setIsNovoRegistroOpen(false);
      setNovoTitulo('');
      setNovoConteudo('');
      setNovaFotoArquivo(null);
      setNovaFotoPreview(null);
      setFormError(null);
    } catch (err: any) {
      setFormError(err?.message || 'Falha ao salvar registro.');
    } finally {
      setIsSalvandoRegistro(false);
    }
  };

  const handleFotoUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (novaFotoPreview && novaFotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(novaFotoPreview);
      }
      setNovaFotoArquivo(file);
      setNovaFotoPreview(URL.createObjectURL(file));
    }
  };

  const limparPeriodo = () => {
    setPeriodoFiltro('todos');
    setDataInicio('');
    setDataFim('');
  };

  const chipPeriodo = (
    <span className="dia-periodo-chip">
      <CalendarBlank size={13} weight="bold" />
      <span>{labelPeriodoAtivo}</span>
      <button
        type="button"
        onClick={limparPeriodo}
        className="dia-periodo-chip-x"
        title="Limpar filtro de período"
        aria-label="Limpar filtro de período"
      >
        <X size={12} weight="bold" />
      </button>
    </span>
  );

  return (
    <div className="dia-tab">
      {/* Cabeçalho: título + UMA ação primária; busca e filtro numa toolbar única (popovers dentro da tela) */}
      <div className="dia-top">
        <div className="dia-title">
          <h2 className="tab-title" style={{ margin: 0 }}>
            Diário
          </h2>
          {isPeriodoAtivo && <span className="dia-chip-desktop">{chipPeriodo}</span>}
        </div>

        <div className="dia-tools" ref={searchContainerRef}>
          {isPeriodoAtivo && <span className="dia-chip-mobile">{chipPeriodo}</span>}

          <div className="dia-anchor">
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen((prev) => !prev);
                setIsFilterOpen(false);
              }}
              className="btn-icon dia-tool-btn"
              data-active={Boolean(searchTerm) || isSearchOpen}
              title="Pesquisar no diário"
              aria-label="Pesquisar no diário"
              aria-expanded={isSearchOpen}
            >
              <MagnifyingGlass size={18} weight={searchTerm ? 'bold' : 'regular'} />
              {searchTerm && <span className="dot" />}
            </button>

            {isSearchOpen && (
              <div className="toolbar-popover dia-popover" role="search">
                <div className="dia-search-field">
                  <MagnifyingGlass size={16} color="var(--text-muted)" className="dia-search-icon" />
                  <input
                    type="search"
                    className="form-input"
                    placeholder="Buscar no diário"
                    aria-label="Buscar no diário"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="btn-icon dia-search-clear"
                      title="Limpar busca"
                      aria-label="Limpar busca"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="dia-anchor" ref={filterContainerRef}>
            <button
              type="button"
              onClick={() => {
                setIsFilterOpen((prev) => !prev);
                setIsSearchOpen(false);
              }}
              className="btn-icon dia-tool-btn"
              data-active={isPeriodoAtivo || isFilterOpen}
              title="Filtrar por período"
              aria-label="Filtrar por período"
              aria-expanded={isFilterOpen}
            >
              <Funnel size={18} weight={isPeriodoAtivo ? 'fill' : 'regular'} />
              {isPeriodoAtivo && <span className="dot" />}
            </button>

            {isFilterOpen && (
              <div className="toolbar-popover dia-popover" role="menu">
                {[
                  { id: 'todos', label: 'Todo o período' },
                  { id: 'hoje', label: 'Hoje' },
                  { id: '7dias', label: 'Últimos 7 dias' },
                  { id: '30dias', label: 'Últimos 30 dias' },
                  { id: 'intervalo', label: 'Selecionar intervalo' },
                ].map((opcao) => {
                  const isSelected = periodoFiltro === opcao.id;
                  return (
                    <button
                      key={opcao.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      className="option dia-option"
                      onClick={() => {
                        setPeriodoFiltro(opcao.id as any);
                        if (opcao.id !== 'intervalo') setIsFilterOpen(false);
                      }}
                    >
                      <span>{opcao.label}</span>
                      {isSelected && <Check size={16} weight="bold" />}
                    </button>
                  );
                })}

                {periodoFiltro === 'intervalo' && (
                  <div className="dia-intervalo">
                    <DatePickerInput
                      label="De"
                      helperText=""
                      value={dataInicio}
                      onChange={setDataInicio}
                      autoScrollOnMobile={false}
                    />
                    <DatePickerInput
                      label="Até"
                      helperText=""
                      value={dataFim}
                      onChange={setDataFim}
                      minDate={dataInicio || undefined}
                      autoScrollOnMobile={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {perfilAtivo === 'construtor' && (
          <button type="button" onClick={() => setIsNovoRegistroOpen(true)} className="btn-primary dia-cta tab-cta">
            <Plus size={16} weight="bold" />
            <span>Novo registro</span>
          </button>
        )}
      </div>

      {/* ========================================================
          FEED DO DIÁRIO: ESTRUTURA DE EXTRATO BANCÁRIO POR DIA
         ======================================================== */}
      {extratoPorDia.length === 0 ? (
        searchTerm || isPeriodoAtivo ? (
          <EmptyState
            icon={BookOpen}
            variant="filtered"
            title={isPeriodoAtivo ? 'Nenhum registro neste período.' : 'Nenhum registro nesta busca.'}
            action={{
              label: isPeriodoAtivo ? 'Limpar filtros' : 'Limpar busca',
              onClick: () => {
                setSearchTerm('');
                limparPeriodo();
              },
            }}
          />
        ) : (
          <EmptyState icon={BookOpen} title="Nenhum registro ainda." hint="O diário se preenche conforme os serviços são concluídos." />
        )
      ) : (
        <div className="dia-lista">
          {extratoPorDia.map((grupo) => (
            <div key={grupo.diaKey} className="diario-extrato-dia-block">
              {/* Cabeçalho do dia: desktop com faixa; mobile texto simples */}
              <div className="dia-dia-head">
                <div className="dia-dia-head-main">
                  <CalendarBlank size={16} weight="bold" color="var(--primary-accent)" className="dia-dia-icon" />
                  <strong>
                    <span className="dia-dia-long">{grupo.headerTexto}</span>
                    <span className="dia-dia-short">{grupo.headerCurto}</span>
                  </strong>
                  <span className="diario-contador-desktop dia-contador">
                    {grupo.entries.length} {grupo.entries.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>

                {grupo.saldoDia !== 0 && (
                  <span className="dia-saldo" style={{ color: grupo.saldoDia > 0 ? 'var(--primary-accent)' : '#16a34a' }}>
                    Movimentação no dia: {grupo.saldoDia > 0 ? `+${formatarMoeda(grupo.saldoDia)}` : `-${formatarMoeda(Math.abs(grupo.saldoDia))}`}
                  </span>
                )}
              </div>

              {/* Linhas de lançamento do dia (hairline) */}
              <div className="dia-entradas">
                {grupo.entries.map((entry, idx) => {
                  const isUltimo = idx === grupo.entries.length - 1;
                  const horaStr = formatarHora(entry.dataHora);

                  // Definição de Ícone e Cores por Tipo
                  let iconBg = 'var(--dark-coffee-100)';
                  let iconColor = 'var(--text-body)';
                  let tagLabel = 'REGISTRO';
                  let tagBg = 'var(--dark-coffee-50)';
                  let tagColor = 'var(--dark-coffee-800)';
                  let IconComponent = NotePencil;

                  if (entry.tipo === 'servico_concluido') {
                    iconBg = '#dcfce7';
                    iconColor = '#15803d';
                    tagLabel = 'SERVIÇO CUMPRIDO';
                    tagBg = '#dcfce7';
                    tagColor = '#15803d';
                    IconComponent = CheckCircle;
                  } else if (entry.tipo === 'etapa_concluida') {
                    iconBg = 'var(--dark-coffee-200)';
                    iconColor = 'var(--dark-coffee-900)';
                    tagLabel = 'ETAPA FINALIZADA';
                    tagBg = 'var(--dark-coffee-100)';
                    tagColor = 'var(--dark-coffee-900)';
                    IconComponent = Kanban;
                  } else if (entry.tipo === 'decisao_aprovada') {
                    iconBg = '#dcfce7';
                    iconColor = '#15803d';
                    tagLabel = 'DECISÃO APROVADA';
                    tagBg = '#dcfce7';
                    tagColor = '#15803d';
                    IconComponent = SealCheck;
                  } else if (entry.tipo === 'decisao_criada') {
                    iconBg = '#fef3c7';
                    iconColor = '#b45309';
                    tagLabel = 'DECISÃO PROPOSTA';
                    tagBg = '#fef3c7';
                    tagColor = '#b45309';
                    IconComponent = Clock;
                  } else if (entry.tipo === 'decisao_recusada') {
                    iconBg = '#fee2e2';
                    iconColor = '#b91c1c';
                    tagLabel = 'DECISÃO RECUSADA';
                    tagBg = '#fee2e2';
                    tagColor = '#b91c1c';
                    IconComponent = XCircle;
                  } else if (entry.tipo === 'evidencia_tarefa' || entry.tipo === 'anexo_geral') {
                    iconBg = 'var(--coral-glow-50)';
                    iconColor = 'var(--primary-accent)';
                    tagLabel = entry.fotos && entry.fotos.length > 0 ? 'FOTO DE CAMPO' : 'NOTA TÉCNICA';
                    tagBg = 'var(--coral-glow-50)';
                    tagColor = 'var(--primary-accent)';
                    IconComponent = entry.fotos && entry.fotos.length > 0 ? Camera : NotePencil;
                  } else if (entry.tipo === 'vistoria_concluida') {
                    iconBg = '#dcfce7';
                    iconColor = '#15803d';
                    tagLabel = 'VISTORIA FINAL';
                    tagBg = '#dcfce7';
                    tagColor = '#15803d';
                    IconComponent = CheckCircle;
                  }


                  const isExpandedMobile = Boolean(expandedMobileIds[entry.id]);

                  const etapaNomeEncontrada =
                    entry.etapaNome ||
                    (entry.etapaId ? obra.etapas.find((e) => e.id === entry.etapaId)?.nome : undefined) ||
                    (entry.subtitulo && entry.subtitulo.startsWith('Etapa:')
                      ? entry.subtitulo.replace(/^Etapa:\s*/, '').replace(/\s*\(.*\)$/, '')
                      : undefined);

                  let mobileTituloPrincipal = entry.titulo;
                  let mobileSubtitulo = entry.subtitulo || '';

                  if (etapaNomeEncontrada) {
                    mobileTituloPrincipal = etapaNomeEncontrada;
                    if (entry.tipo === 'evidencia_tarefa') {
                      mobileSubtitulo = entry.titulo.replace(/^Registro de Campo:\s*/, '');
                    } else if (entry.tipo === 'etapa_concluida') {
                      mobileSubtitulo = entry.subtitulo || 'Etapa finalizada com sucesso';
                    } else {
                      mobileSubtitulo = entry.titulo;
                    }
                  } else if (entry.tipo.startsWith('decisao_')) {
                    mobileTituloPrincipal =
                      entry.tipo === 'decisao_aprovada'
                        ? 'Decisão Aprovada'
                        : entry.tipo === 'decisao_recusada'
                        ? 'Decisão Recusada'
                        : 'Decisão e Aprovação';
                    mobileSubtitulo = entry.titulo.replace(/^(Decisão Recusada:\s*|Proposta de Decisão:\s*)/, '');
                  } else if (entry.tipo === 'vistoria_concluida') {
                    mobileTituloPrincipal = 'Vistoria Final';
                    mobileSubtitulo = entry.titulo.replace(/^Vistoria Final:\s*/, '');
                  } else if (entry.tipo === 'anexo_geral') {
                    mobileTituloPrincipal = 'Diário de Canteiro';
                    mobileSubtitulo = entry.titulo;
                  }

                  return (
                    <div key={entry.id} style={{ borderBottom: isUltimo ? 'none' : '1px solid var(--border-hairline)' }}>
                      {/* Versão Desktop (Inalterada, aberta integralmente) */}
                      <div className="diario-card-desktop">
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 14,
                            padding: '12px 16px',
                            transition: 'background 0.15s ease',
                          }}
                          className="diario-extrato-row"
                        >
                          {/* Horário do Extrato */}
                          <div
                            style={{
                              width: 48,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              paddingTop: 4,
                              flexShrink: 0,
                              fontFamily: 'monospace',
                            }}
                          >
                            {horaStr}
                          </div>

                          {/* Ícone com container temático */}
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 'var(--radius-xs)',
                              background: iconBg,
                              color: iconColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            <IconComponent size={17} weight="bold" />
                          </div>

                          {/* Corpo do Lançamento */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  padding: '1px 6px',
                                  borderRadius: 3,
                                  background: tagBg,
                                  color: tagColor,
                                }}
                              >
                                {tagLabel}
                              </span>

                              {entry.subtitulo && (
                                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                  • {entry.subtitulo}
                                </span>
                              )}
                            </div>

                            {/* Título Principal */}
                            <div style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
                              {entry.titulo}
                            </div>

                            {/* Descrição ou anotação se houver */}
                            {entry.descricao && (
                              <p
                                style={{
                                  fontSize: '0.80rem',
                                  color: 'var(--text-body)',
                                  margin: '5px 0 0 0',
                                  lineHeight: 1.4,
                                  background: 'var(--dark-coffee-50)',
                                  padding: '6px 10px',
                                  borderRadius: 'var(--radius-xs)',
                                  borderLeft: '2px solid var(--border-hairline)',
                                }}
                              >
                                {entry.descricao}
                              </p>
                            )}

                            {/* Lista de Anotações Técnicas de Campo */}
                            {entry.anotacoes && entry.anotacoes.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {entry.anotacoes.map((nota, nIdx) => (
                                  <div
                                    key={nIdx}
                                    style={{
                                      fontSize: '0.78rem',
                                      color: 'var(--text-body)',
                                      background: 'var(--dark-coffee-50)',
                                      padding: '5px 8px',
                                      borderRadius: 4,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                    }}
                                  >
                                    <NotePencil size={13} color="var(--primary-accent)" />
                                    <span>{nota}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Miniaturas de Fotos Anexadas */}
                            {entry.fotos && entry.fotos.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                {entry.fotos.map((fotoUrl, fIdx) => (
                                  <button
                                    key={fIdx}
                                    type="button"
                                    onClick={() =>
                                      setSelectedImageModal({
                                        url: fotoUrl,
                                        titulo: entry.titulo,
                                        subtitulo: entry.subtitulo,
                                      })
                                    }
                                    style={{
                                      padding: 0,
                                      border: '1px solid var(--border-hairline)',
                                      background: 'var(--dark-coffee-100)',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      overflow: 'hidden',
                                      display: 'block',
                                      position: 'relative',
                                      width: 64,
                                      height: 64,
                                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                    }}
                                    title="Clique para ampliar imagem do canteiro"
                                  >
                                    <img
                                      src={fotoUrl}
                                      alt={`Evidência ${fIdx + 1}`}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Coluna Direita: Valores Financeiros & Ações Rápidas */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                            {/* Badges Financeiros de Extrato */}
                            <ImpactoFinanceiroBadge impacto={entry.impacto} tamanho="desktop" />

                            {/* Atalhos Rápidos */}
                            {entry.etapaId && entry.tarefaId && onNavigateToTask && (
                              <button
                                type="button"
                                onClick={() => onNavigateToTask(entry.etapaId!, entry.tarefaId!)}
                                className="btn-secondary"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                title="Ver serviço no cronograma"
                              >
                                <span>Cronograma</span>
                                <ArrowRight size={12} weight="bold" />
                              </button>
                            )}

                            {entry.decisaoId && onNavigateToDecisoes && (
                              <button
                                type="button"
                                onClick={onNavigateToDecisoes}
                                className="btn-secondary"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                title="Ver na central de decisões"
                              >
                                <span>Decisões</span>
                                <ArrowRight size={12} weight="bold" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Versão Mobile: linha hairline com accordion (etapa + tarefa; detalhes ao abrir) */}
                      <div className="diario-card-mobile">
                        <button
                          type="button"
                          className="diario-card-mobile-header dia-row-head"
                          onClick={() => toggleMobileExpand(entry.id)}
                          aria-expanded={isExpandedMobile}
                        >
                          <span className="dia-row-main">
                            <span className="dia-row-title">{mobileTituloPrincipal}</span>
                            {mobileSubtitulo && <span className="dia-row-sub">{mobileSubtitulo}</span>}
                          </span>
                          <CaretDown size={16} weight="bold" className="dec-caret" data-open={isExpandedMobile} />
                        </button>

                        {isExpandedMobile && (
                          <div className="dia-row-body">
                            <div className="dia-row-meta">
                              <span className={`badge ${badgeMobile(entry.tipo)}`}>
                                <IconComponent size={13} weight="bold" />
                                {semCaixaAlta(tagLabel)}
                              </span>
                              <span className="dia-hora">{horaStr}</span>
                              <ImpactoFinanceiroBadge impacto={entry.impacto} tamanho="mobile" />
                            </div>

                            {entry.descricao && <p className="dia-descricao">{entry.descricao}</p>}

                            {entry.anotacoes && entry.anotacoes.length > 0 && (
                              <ul className="dia-notas">
                                {entry.anotacoes.map((nota, nIdx) => (
                                  <li key={nIdx}>
                                    <NotePencil size={14} color="var(--primary-accent)" />
                                    <span>{nota}</span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {entry.fotos && entry.fotos.length > 0 && (
                              <div className="dia-fotos">
                                {entry.fotos.map((fotoUrl, fIdx) => (
                                  <button
                                    key={fIdx}
                                    type="button"
                                    className="dia-foto"
                                    onClick={() =>
                                      setSelectedImageModal({
                                        url: fotoUrl,
                                        titulo: entry.titulo,
                                        subtitulo: entry.subtitulo,
                                      })
                                    }
                                    aria-label={`Ampliar foto ${fIdx + 1}`}
                                  >
                                    <img src={fotoUrl} alt="" />
                                  </button>
                                ))}
                              </div>
                            )}

                            {((entry.etapaId && entry.tarefaId && onNavigateToTask) || (entry.decisaoId && onNavigateToDecisoes)) && (
                              <div className="dia-row-acoes">
                                {entry.etapaId && entry.tarefaId && onNavigateToTask && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateToTask(entry.etapaId!, entry.tarefaId!)}
                                    className="btn-quiet"
                                  >
                                    <span>Ver no cronograma</span>
                                    <ArrowRight size={14} weight="bold" />
                                  </button>
                                )}
                                {entry.decisaoId && onNavigateToDecisoes && (
                                  <button type="button" onClick={onNavigateToDecisoes} className="btn-quiet">
                                    <span>Ver em decisões</span>
                                    <ArrowRight size={14} weight="bold" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================
          MODAL: NOVO REGISTRO NO DIÁRIO (APENAS CONSTRUTOR)
         ======================================================== */}
      {isNovoRegistroOpen && perfilAtivo === 'construtor' && (
        <div className="modal-backdrop" onClick={fecharNovoRegistro}>
          <div
            className="modal-card dia-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="modal-novo-diario-title"
          >
            <div className="modal-header">
              <h2 id="modal-novo-diario-title" className="modal-title">Novo registro</h2>
              <button type="button" onClick={fecharNovoRegistro} className="btn-icon" aria-label="Fechar" title="Fechar">
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovoRegistro} className="dec-form">
              <div className="modal-body">
                {formError && (
                  <div className="dia-form-error" role="alert">
                    {formError}
                  </div>
                )}

                <div className="form-group dec-field">
                  <span className="form-label" id="dia-seg-tipo">Tipo de registro</span>
                  <SegmentedControl<'foto' | 'anotacao'>
                    labelledBy="dia-seg-tipo"
                    valor={novoTipo}
                    opcoes={[
                      { valor: 'foto', texto: 'Foto' },
                      { valor: 'anotacao', texto: 'Anotação' },
                    ]}
                    onChange={setNovoTipo}
                  />
                </div>

                <div className="form-group dec-field">
                  <span className="form-label" id="dia-seg-destino">Onde registrar</span>
                  <SegmentedControl<'geral' | 'tarefa'>
                    labelledBy="dia-seg-destino"
                    valor={novoDestino}
                    opcoes={[
                      { valor: 'geral', texto: 'Obra em geral' },
                      { valor: 'tarefa', texto: 'Um serviço' },
                    ]}
                    onChange={setNovoDestino}
                  />
                </div>

                {novoDestino === 'tarefa' && (
                  <>
                    <div className="form-group dec-field">
                      <label className="form-label" htmlFor="dia-etapa">Etapa</label>
                      <select
                        id="dia-etapa"
                        className="form-input"
                        value={novaEtapaId}
                        onChange={(e) => {
                          setNovaEtapaId(e.target.value);
                          setNovaTarefaId('');
                        }}
                      >
                        {obra.etapas.map((etapa) => (
                          <option key={etapa.id} value={etapa.id}>
                            {etapa.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group dec-field">
                      <label className="form-label" htmlFor="dia-servico">Serviço</label>
                      <select
                        id="dia-servico"
                        className="form-input"
                        value={novaTarefaId}
                        onChange={(e) => setNovaTarefaId(e.target.value)}
                      >
                        <option value="">Selecione o serviço</option>
                        {(obra.etapas.find((et) => et.id === novaEtapaId)?.tarefas || []).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="form-group dec-field">
                  <label className="form-label" htmlFor="dia-titulo">Título (opcional)</label>
                  <input
                    id="dia-titulo"
                    type="text"
                    className="form-input"
                    placeholder="Ex: Concretagem da laje"
                    value={novoTitulo}
                    onChange={(e) => setNovoTitulo(e.target.value)}
                  />
                </div>

                {novoTipo === 'foto' && (
                  <div className="dec-field">
                    <input
                      ref={fotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFotoUploadChange}
                      style={{ display: 'none' }}
                    />
                    {novaFotoPreview && (
                      <div className="dia-preview">
                        <img src={novaFotoPreview} alt="Prévia da foto" />
                      </div>
                    )}
                    <button type="button" className="btn-secondary btn--block" onClick={() => fotoInputRef.current?.click()}>
                      <ImageIcon size={16} />
                      <span>{novaFotoPreview ? 'Trocar foto' : 'Adicionar foto'}</span>
                    </button>
                  </div>
                )}

                {novoTipo === 'anotacao' && (
                  <div className="form-group dec-field">
                    <label className="form-label" htmlFor="dia-obs">Anotação</label>
                    <textarea
                      id="dia-obs"
                      rows={3}
                      className="form-textarea"
                      placeholder="Descreva o que aconteceu no canteiro"
                      value={novoConteudo}
                      onChange={(e) => setNovoConteudo(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-primary" disabled={isSalvandoRegistro}>
                  {isSalvandoRegistro ? (
                    <>
                      <CircleNotch size={14} className="spin-animate" weight="bold" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar registro</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL LIGHTBOX: VISUALIZAR FOTO EM TELA CHEIA
         ======================================================== */}
      {selectedImageModal && (
        <Lightbox
          src={selectedImageModal.url}
          titulo={selectedImageModal.titulo}
          subtitulo={selectedImageModal.subtitulo}
          onClose={() => setSelectedImageModal(null)}
        />
      )}
    </div>
  );
};
