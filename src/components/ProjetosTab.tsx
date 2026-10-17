import React, { useState, useRef, useEffect } from 'react';
import { usePopoverDismiss } from '../hooks/usePopoverDismiss';
import { useIsMobile } from '../hooks/useIsMobile';
import { OverflowMenu } from './OverflowMenu';
import { EmptyState } from './EmptyState';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  FilePdf,
  Files,
  Plus,
  Trash,
  DownloadSimple,
  Eye,
  MagnifyingGlass,
  Funnel,
  ArrowSquareOut,
  X,
  User,
  CalendarBlank,
  ShareNetwork,
} from '@phosphor-icons/react';
import { Obra, PerfilUsuario, ProjetoPDF, TipoProjeto } from '../types/obra';
import { TIPOS_PROJETO_LISTA, getTipoProjetoConfig, formatBytes } from '../utils/projetoConfig';
import { ModalUploadProjeto } from './ModalUploadProjeto';
import { ModalConfirm } from './ModalConfirm';
import { ModalShareUploadProjeto } from './ModalShareUploadProjeto';
import { formatarDataIsoBR } from '../utils/data';

interface ProjetosTabProps {
  obra: Obra;
  perfilAtivo?: PerfilUsuario;
  onAddProjeto: (dados: {
    titulo: string;
    tipo: TipoProjeto;
    tipoCustomizado?: string;
    arquivoNome: string;
    tamanhoBytes: number;
    url: string;
    versao?: string;
    descricao?: string;
  }) => void;
  onDeleteProjeto: (projetoId: string) => void;
  showToast?: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ProjetosTab: React.FC<ProjetosTabProps> = ({
  obra,
  perfilAtivo = 'construtor',
  onAddProjeto,
  onDeleteProjeto,
  showToast,
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoProjeto>('todos');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProjetoPDF | null>(null);
  const [previewProjeto, setPreviewProjeto] = useState<ProjetoPDF | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Estados dos Popups de Lupa e Filtro
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  // Fechar popups ao clicar fora (ou Escape)
  usePopoverDismiss(searchContainerRef, isSearchOpen, () => setIsSearchOpen(false));
  usePopoverDismiss(filterContainerRef, isFilterOpen, () => setIsFilterOpen(false));

  // Escape: preview do PDF (topo) antes do menu de filtro.
  useEscapeKey(() => setPreviewProjeto(null), !!previewProjeto);

  const projetos = obra.projetos || [];

  // Filtragem dos projetos
  const projetosFiltrados = projetos.filter((proj) => {
    const matchTipo = tipoFiltro === 'todos' || proj.tipo === tipoFiltro;
    const q = buscaTexto.toLowerCase().trim();
    const matchBusca =
      !q ||
      proj.titulo.toLowerCase().includes(q) ||
      proj.arquivoNome.toLowerCase().includes(q) ||
      (proj.versao && proj.versao.toLowerCase().includes(q)) ||
      (proj.tipoCustomizado && proj.tipoCustomizado.toLowerCase().includes(q)) ||
      (proj.descricao && proj.descricao.toLowerCase().includes(q));

    return matchTipo && matchBusca;
  });

  const handleOpenPdf = (url: string) => {
    const win = window.open();
    if (win) {
      win.document.write(
        `<html><head><title>Visualização de Projeto - Eixo</title><style>body{margin:0;background:#1e1e1e;height:100vh;display:flex;align-items:center;justify-content:center;}iframe{border:none;width:100%;height:100%;}</style></head><body><iframe src="${url}"></iframe></body></html>`
      );
    }
  };

  const formatarData = (dataIso: string) => formatarDataIsoBR(dataIso);

  const filtroAtivoConfig = tipoFiltro !== 'todos' ? getTipoProjetoConfig(tipoFiltro) : null;
  const ehConstrutor = perfilAtivo === 'construtor';
  const isMobile = useIsMobile();

  const dataLinha = (p: ProjetoPDF, config: ReturnType<typeof getTipoProjetoConfig>) =>
    [config.label, p.versao, formatBytes(p.tamanhoBytes), formatarData(p.dataUpload)].filter(Boolean).join(' · ');

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
      {/* Título + única ação primária (Anexar) + barra de ícones (busca, filtro, mais) */}
      <div className={`arquivos-head ${ehConstrutor ? '' : 'arquivos-head--readonly'}`}>
        <h2 className="tab-title arquivos-title">Arquivos</h2>

        <div className="toolbar arquivos-toolbar">
          {/* BUSCA */}
          <div ref={searchContainerRef} style={{ display: 'contents' }}>
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen((prev) => !prev);
                setIsFilterOpen(false);
              }}
              className={`btn-icon ${isSearchOpen || buscaTexto ? 'is-active' : ''}`}
              aria-label="Pesquisar arquivos"
              aria-expanded={isSearchOpen}
            >
              <MagnifyingGlass size={18} weight={buscaTexto ? 'bold' : 'regular'} />
              {buscaTexto && <span className="dot" />}
            </button>

            {isSearchOpen && (
              <div className="toolbar-popover" style={{ width: 'min(320px, calc(100vw - 2 * var(--gutter)))' }}>
                <div className="popover-search">
                  <MagnifyingGlass size={16} className="search-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar por título ou arquivo"
                    aria-label="Buscar arquivos"
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                    autoFocus
                  />
                  {buscaTexto && (
                    <button type="button" onClick={() => setBuscaTexto('')} className="btn-icon" aria-label="Limpar busca">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* FILTRO POR DISCIPLINA */}
          <div ref={filterContainerRef} style={{ display: 'contents' }}>
            <button
              type="button"
              onClick={() => {
                setIsFilterOpen((prev) => !prev);
                setIsSearchOpen(false);
              }}
              className={`btn-icon ${isFilterOpen || tipoFiltro !== 'todos' ? 'is-active' : ''}`}
              aria-label="Filtrar por disciplina"
              aria-expanded={isFilterOpen}
            >
              <Funnel size={18} weight={tipoFiltro !== 'todos' ? 'fill' : 'regular'} />
              {tipoFiltro !== 'todos' && <span className="dot" />}
            </button>

            {isFilterOpen && (
              <div className="toolbar-popover filter-pop" role="menu">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={tipoFiltro === 'todos'}
                  className="option"
                  onClick={() => {
                    setTipoFiltro('todos');
                    setIsFilterOpen(false);
                  }}
                >
                  <span>Todas as disciplinas</span>
                  <span className="count">{projetos.length}</span>
                </button>
                {TIPOS_PROJETO_LISTA.map((t) => {
                  const count = projetos.filter((p) => p.tipo === t.id).length;
                  const IconComp = t.Icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={tipoFiltro === t.id}
                      className="option"
                      onClick={() => {
                        setTipoFiltro(t.id);
                        setIsFilterOpen(false);
                      }}
                    >
                      <IconComp size={18} weight={tipoFiltro === t.id ? 'fill' : 'regular'} color={t.color} />
                      <span>{t.label}</span>
                      <span className="count">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* AÇÕES SECUNDÁRIAS (construtor): Link de envio */}
          {ehConstrutor && (
            <OverflowMenu
              label="Mais ações de arquivos"
              items={[
                {
                  key: 'link-envio',
                  label: 'Link de envio para terceiros',
                  icon: <ShareNetwork size={18} weight="bold" />,
                  onSelect: () => setIsShareModalOpen(true),
                },
              ]}
            />
          )}
        </div>

        {ehConstrutor && (
          <button type="button" onClick={() => setIsUploadModalOpen(true)} className="btn-primary arquivos-cta tab-cta">
            <Plus size={16} weight="bold" />
            <span>Anexar</span>
          </button>
        )}
      </div>

      {/* Filtros ativos */}
      {(buscaTexto || tipoFiltro !== 'todos') && (
        <div className="arquivos-filters">
          {filtroAtivoConfig && (
            <button type="button" className="chip" onClick={() => setTipoFiltro('todos')} aria-label={`Remover filtro ${filtroAtivoConfig.label}`}>
              <span>{filtroAtivoConfig.label}</span>
              <X size={12} weight="bold" />
            </button>
          )}
          {buscaTexto && (
            <button type="button" className="chip" onClick={() => setBuscaTexto('')} aria-label="Limpar busca">
              <span>"{buscaTexto}"</span>
              <X size={12} weight="bold" />
            </button>
          )}
          {buscaTexto && tipoFiltro !== 'todos' && (
            <button
              type="button"
              className="clear"
              onClick={() => {
                setBuscaTexto('');
                setTipoFiltro('todos');
              }}
            >
              Limpar tudo
            </button>
          )}
        </div>
      )}

      {/* Lista de Projetos */}
      {projetosFiltrados.length === 0 ? (
        projetos.length === 0 ? (
          <EmptyState icon={Files} title={ehConstrutor ? 'Nenhum projeto anexado.' : 'Ainda não há projetos nesta obra.'} />
        ) : (
          <EmptyState
            icon={Files}
            variant="filtered"
            title="Nenhum projeto neste filtro."
            action={{
              label: 'Limpar filtros',
              onClick: () => {
                setBuscaTexto('');
                setTipoFiltro('todos');
              },
            }}
          />
        )
      ) : isMobile ? (
        <div>
          {projetosFiltrados.map((projeto) => {
            const config = getTipoProjetoConfig(projeto.tipo, projeto.tipoCustomizado);
            const IconComp = config.Icon;
            return (
              <div key={projeto.id} className="projeto-row">
                <button type="button" className="projeto-row-main" onClick={() => setPreviewProjeto(projeto)}>
                  <span
                    className="projeto-row-icon"
                    style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}
                  >
                    <IconComp size={20} weight="fill" />
                  </span>
                  <span className="projeto-row-text">
                    <span className="projeto-row-title">{projeto.titulo}</span>
                    <span className="projeto-row-sub">{dataLinha(projeto, config)}</span>
                    {projeto.descricao && <span className="projeto-row-desc">{projeto.descricao}</span>}
                  </span>
                </button>
                <OverflowMenu
                  label={`Ações de ${projeto.titulo}`}
                  items={[
                    {
                      key: 'ver',
                      label: 'Visualizar',
                      icon: <Eye size={18} weight="bold" />,
                      onSelect: () => setPreviewProjeto(projeto),
                    },
                    {
                      key: 'baixar',
                      label: 'Baixar',
                      icon: <DownloadSimple size={18} weight="bold" />,
                      href: projeto.url,
                      download: projeto.arquivoNome,
                    },
                    {
                      key: 'excluir',
                      label: 'Excluir',
                      icon: <Trash size={18} weight="bold" />,
                      danger: true,
                      hidden: !ehConstrutor,
                      onSelect: () => setDeleteTarget(projeto),
                    },
                  ]}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projetosFiltrados.map((projeto) => {
            const config = getTipoProjetoConfig(projeto.tipo, projeto.tipoCustomizado);
            const IconComp = config.Icon;

            return (
              <div key={projeto.id} className="projeto-card">
                <div className="projeto-card-info">
                  <div
                    style={{
                      background: config.bg,
                      color: config.color,
                      border: `1px solid ${config.border}`,
                      padding: 10,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    title={config.label}
                  >
                    <IconComp size={22} weight="fill" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span
                        className="badge"
                        style={{ background: config.bg, color: config.color, borderColor: config.border }}
                      >
                        {config.label}
                      </span>
                      {projeto.versao && <span className="badge">{projeto.versao}</span>}
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4, wordBreak: 'break-word' }}>
                      {projeto.titulo}
                    </h3>

                    {projeto.descricao && (
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-body)', marginBottom: 6, lineHeight: 1.4 }}>
                        {projeto.descricao}
                      </p>
                    )}

                    <div className="projeto-card-meta">
                      <span className="projeto-card-file">
                        <FilePdf size={14} color="#b91c1c" weight="fill" style={{ flexShrink: 0 }} />
                        <strong>{projeto.arquivoNome}</strong>
                      </span>
                      <span>{formatBytes(projeto.tamanhoBytes)}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CalendarBlank size={12} />
                        <span>{formatarData(projeto.dataUpload)}</span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <User size={12} />
                        <span>Por {projeto.enviadoPorNome}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="projeto-card-actions">
                  <button
                    type="button"
                    onClick={() => setPreviewProjeto(projeto)}
                    className="btn-secondary"
                    style={{ padding: '6px 11px', fontSize: '0.84rem' }}
                    title="Visualizar PDF"
                  >
                    <Eye size={14} weight="bold" />
                    <span>Visualizar</span>
                  </button>

                  <a
                    href={projeto.url}
                    download={projeto.arquivoNome}
                    className="btn-secondary"
                    style={{ padding: '6px 11px', fontSize: '0.84rem', textDecoration: 'none' }}
                    title="Baixar PDF"
                  >
                    <DownloadSimple size={14} weight="bold" />
                    <span>Baixar</span>
                  </a>

                  {ehConstrutor && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(projeto)}
                      className="btn-icon"
                      title="Excluir projeto"
                      aria-label={`Excluir ${projeto.titulo}`}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Upload de Projeto */}
      <ModalUploadProjeto
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={(dados) => {
          onAddProjeto(dados);
          setIsUploadModalOpen(false);
          if (showToast) {
            showToast('Projeto anexado com sucesso!', `A prancha "${dados.titulo}" foi adicionada aos projetos.`);
          }
        }}
      />

      {/* Modal de Pré-visualização do PDF */}
      {previewProjeto && (
        <div
          className="modal-backdrop"
          onClick={() => setPreviewProjeto(null)}
          style={{ zIndex: 'var(--z-modal-stacked)' }}
        >
          <div
            className="modal-card"
            style={{ maxWidth: '900px', width: '92vw', height: '88vh' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    background: '#fee2e2',
                    color: '#b91c1c',
                    padding: 8,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FilePdf size={20} weight="fill" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3
                    className="modal-title pdf-preview-title"
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {previewProjeto.titulo}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {previewProjeto.arquivoNome} • {formatBytes(previewProjeto.tamanhoBytes)}
                  </span>
                </div>
              </div>

              <div className="pdf-preview-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleOpenPdf(previewProjeto.url)}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.80rem' }}
                  title="Abrir em tela cheia / nova guia"
                >
                  <ArrowSquareOut size={15} weight="bold" />
                  <span className="btn-label">Nova guia</span>
                </button>

                <a
                  href={previewProjeto.url}
                  download={previewProjeto.arquivoNome}
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.80rem', textDecoration: 'none' }}
                >
                  <DownloadSimple size={15} weight="bold" />
                  <span className="btn-label">Baixar</span>
                </a>

                <button onClick={() => setPreviewProjeto(null)} className="btn-icon" title="Fechar" aria-label="Fechar">
                  <X size={18} weight="bold" />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, height: '100%', background: '#2c2c2c', overflow: 'hidden' }}>
              <iframe
                src={previewProjeto.url}
                title={previewProjeto.titulo}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteTarget && (
        <ModalConfirm
          isOpen={true}
          title="Excluir arquivo"
          message={`Tem certeza que deseja remover o projeto "${deleteTarget.titulo}" (${deleteTarget.arquivoNome})? Esta ação não pode ser desfeita.`}
          confirmText="Sim, excluir projeto"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            onDeleteProjeto(deleteTarget.id);
            setDeleteTarget(null);
            if (showToast) {
              showToast('Projeto excluído', 'O arquivo PDF foi removido com sucesso.');
            }
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Modal de Compartilhamento do Link de Upload Externo */}
      <ModalShareUploadProjeto
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        obra={obra}
        showToast={showToast}
      />
    </div>
  );
};
