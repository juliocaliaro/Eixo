import React, { useState, useRef, useEffect } from 'react';
import {
  Blueprint,
  FilePdf,
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
  Check
} from '@phosphor-icons/react';
import { Obra, PerfilUsuario, ProjetoPDF, TipoProjeto } from '../types/obra';
import { TIPOS_PROJETO_LISTA, getTipoProjetoConfig, formatBytes } from '../utils/projetoConfig';
import { ModalUploadProjeto } from './ModalUploadProjeto';
import { ModalConfirm } from './ModalConfirm';

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

  // Estados dos Popups de Lupa e Filtro
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  // Fechar popups ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
      if (filterContainerRef.current && !filterContainerRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const formatarData = (dataIso: string) => {
    try {
      const d = new Date(dataIso);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dataIso;
    }
  };

  const filtroAtivoConfig = tipoFiltro !== 'todos' ? getTipoProjetoConfig(tipoFiltro) : null;

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header da Aba com Resumo, Ações e Popups de Busca e Filtro */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
              Projetos & Pranchas em PDF
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--dark-coffee-100)',
                color: 'var(--dark-coffee-800)',
              }}
            >
              {projetos.length} {projetos.length === 1 ? 'prancha' : 'pranchas'}
            </span>
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Plantas executivas categorizadas por disciplina técnica
          </p>
        </div>

        {/* Grupo de Ações do Topo: Lupa, Filtro e Anexar Projeto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* BOTÃO LUPA (POPUP DE BUSCA) */}
          <div style={{ position: 'relative' }} ref={searchContainerRef}>
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen((prev) => !prev);
                setIsFilterOpen(false);
              }}
              className="btn-icon"
              style={{
                width: 38,
                height: 38,
                border: '1px solid var(--border-hairline)',
                background: isSearchOpen || buscaTexto ? 'var(--dark-coffee-100)' : '#ffffff',
                color: buscaTexto ? 'var(--primary-accent)' : 'var(--text-body)',
                position: 'relative',
              }}
              title="Pesquisar projetos"
            >
              <MagnifyingGlass size={18} weight={buscaTexto ? 'bold' : 'regular'} />
              {buscaTexto && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--primary-accent)',
                  }}
                />
              )}
            </button>

            {/* Popup Flutuante de Busca */}
            {isSearchOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 300,
                  background: '#ffffff',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-floating)',
                  padding: '12px',
                  zIndex: 200,
                  animation: 'modalIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <MagnifyingGlass
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 10 }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar por título ou arquivo..."
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                    autoFocus
                    style={{ paddingLeft: 34, paddingRight: buscaTexto ? 30 : 10, fontSize: '0.86rem', paddingBlock: '8px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsSearchOpen(false);
                    }}
                  />
                  {buscaTexto && (
                    <button
                      type="button"
                      onClick={() => setBuscaTexto('')}
                      className="btn-icon"
                      style={{ position: 'absolute', right: 6, padding: 4 }}
                      title="Limpar busca"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BOTÃO FILTRO (POPUP DE DISCIPLINAS) */}
          <div style={{ position: 'relative' }} ref={filterContainerRef}>
            <button
              type="button"
              onClick={() => {
                setIsFilterOpen((prev) => !prev);
                setIsSearchOpen(false);
              }}
              className="btn-icon"
              style={{
                width: 38,
                height: 38,
                border: '1px solid var(--border-hairline)',
                background: isFilterOpen || tipoFiltro !== 'todos' ? 'var(--dark-coffee-100)' : '#ffffff',
                color: tipoFiltro !== 'todos' ? 'var(--primary-accent)' : 'var(--text-body)',
                position: 'relative',
              }}
              title="Filtrar por disciplina"
            >
              <Funnel size={18} weight={tipoFiltro !== 'todos' ? 'fill' : 'regular'} />
              {tipoFiltro !== 'todos' && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--primary-accent)',
                  }}
                />
              )}
            </button>

            {/* Popup Flutuante de Filtro */}
            {isFilterOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 280,
                  background: '#ffffff',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-floating)',
                  padding: '12px',
                  zIndex: 200,
                  animation: 'modalIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                    paddingBottom: 6,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Filtrar Disciplina
                  </span>
                  {tipoFiltro !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => setTipoFiltro('todos')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-accent)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 310, overflowY: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTipoFiltro('todos');
                      setIsFilterOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: tipoFiltro === 'todos' ? 'var(--dark-coffee-50)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: tipoFiltro === 'todos' ? 700 : 500,
                      color: tipoFiltro === 'todos' ? 'var(--text-main)' : 'var(--text-body)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <span>Todas as disciplinas</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({projetos.length})</span>
                  </button>

                  {TIPOS_PROJETO_LISTA.map((t) => {
                    const count = projetos.filter((p) => p.tipo === t.id).length;
                    const isSelected = tipoFiltro === t.id;
                    const IconComp = t.Icon;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTipoFiltro(t.id);
                          setIsFilterOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          background: isSelected ? t.bg : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? t.color : 'var(--text-body)',
                          fontSize: '0.84rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconComp size={15} weight={isSelected ? 'fill' : 'regular'} color={t.color} />
                          <span>{t.label}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: isSelected ? t.color : 'var(--text-muted)' }}>
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* BOTÃO ANEXAR PROJETO */}
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-primary"
            style={{ padding: '9px 16px', fontSize: '0.90rem' }}
          >
            <Plus size={18} weight="bold" />
            <span>Anexar Projeto</span>
          </button>
        </div>
      </div>

      {/* Faixa Discreta de Filtros Ativos (se houver) */}
      {(buscaTexto || tipoFiltro !== 'todos') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Filtros ativos:</span>

          {filtroAtivoConfig && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                borderRadius: 'var(--radius-full)',
                background: filtroAtivoConfig.bg,
                border: `1px solid ${filtroAtivoConfig.border}`,
                color: filtroAtivoConfig.color,
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              Disciplina: {filtroAtivoConfig.label}
              <button
                type="button"
                onClick={() => setTipoFiltro('todos')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                title="Remover filtro de disciplina"
              >
                <X size={12} weight="bold" />
              </button>
            </span>
          )}

          {buscaTexto && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--dark-coffee-50)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              Busca: "{buscaTexto}"
              <button
                type="button"
                onClick={() => setBuscaTexto('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}
                title="Limpar busca"
              >
                <X size={12} weight="bold" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setBuscaTexto('');
              setTipoFiltro('todos');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '2px 4px',
            }}
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* Lista de Projetos */}
      {projetosFiltrados.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px dashed var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <FilePdf size={26} weight="fill" />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
            {projetos.length === 0
              ? 'Nenhum projeto em PDF anexado ainda'
              : 'Nenhum projeto encontrado'}
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 18px', lineHeight: 1.5 }}>
            {projetos.length === 0
              ? 'Anexe plantas de elétrica, hidráulica, demolição ou arquitetura para consulta rápida.'
              : 'Tente alterar o filtro de disciplina ou o termo de busca.'}
          </p>

          {projetos.length === 0 && (
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-primary"
            >
              <Plus size={16} weight="bold" />
              <span>Anexar Primeiro Projeto</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projetosFiltrados.map((projeto) => {
            const config = getTipoProjetoConfig(projeto.tipo, projeto.tipoCustomizado);
            const IconComp = config.Icon;

            return (
              <div
                key={projeto.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 14,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* Lado Esquerdo: Ícone da Disciplina + Detalhes */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
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
                        style={{
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: config.bg,
                          color: config.color,
                          border: `1px solid ${config.border}`,
                        }}
                      >
                        {config.label}
                      </span>

                      {projeto.versao && (
                        <span
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'var(--dark-coffee-100)',
                            color: 'var(--dark-coffee-800)',
                          }}
                        >
                          {projeto.versao}
                        </span>
                      )}
                    </div>

                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        marginBottom: 4,
                        wordBreak: 'break-word',
                      }}
                    >
                      {projeto.titulo}
                    </h3>

                    {projeto.descricao && (
                      <p
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-body)',
                          marginBottom: 6,
                          lineHeight: 1.4,
                        }}
                      >
                        {projeto.descricao}
                      </p>
                    )}

                    {/* Metadados Técnicos */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                        fontSize: '0.76rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <FilePdf size={14} color="#b91c1c" weight="fill" />
                        <strong style={{ color: 'var(--text-main)' }}>{projeto.arquivoNome}</strong>
                      </span>

                      <span>•</span>
                      <span>{formatBytes(projeto.tamanhoBytes)}</span>

                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CalendarBlank size={12} />
                        <span>{formatarData(projeto.dataUpload)}</span>
                      </span>

                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <User size={12} />
                        <span>Por {projeto.enviadoPorNome}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Ações */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setPreviewProjeto(projeto)}
                    className="btn-secondary"
                    style={{ padding: '6px 11px', fontSize: '0.80rem' }}
                    title="Visualizar PDF"
                  >
                    <Eye size={14} weight="bold" />
                    <span>Visualizar</span>
                  </button>

                  <a
                    href={projeto.url}
                    download={projeto.arquivoNome}
                    className="btn-secondary"
                    style={{ padding: '6px 11px', fontSize: '0.80rem', textDecoration: 'none' }}
                    title="Baixar PDF"
                  >
                    <DownloadSimple size={14} weight="bold" />
                    <span>Baixar</span>
                  </a>

                  {perfilAtivo === 'construtor' && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(projeto)}
                      className="btn-icon"
                      title="Excluir projeto"
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
          style={{ zIndex: 1100 }}
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
                    className="modal-title"
                    style={{
                      fontSize: '1.05rem',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleOpenPdf(previewProjeto.url)}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.80rem' }}
                  title="Abrir em tela cheia / nova guia"
                >
                  <ArrowSquareOut size={15} weight="bold" />
                  <span>Nova Guia</span>
                </button>

                <a
                  href={previewProjeto.url}
                  download={previewProjeto.arquivoNome}
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.80rem', textDecoration: 'none' }}
                >
                  <DownloadSimple size={15} weight="bold" />
                  <span>Baixar</span>
                </a>

                <button onClick={() => setPreviewProjeto(null)} className="btn-icon" title="Fechar">
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
          title="Excluir Projeto em PDF"
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
    </div>
  );
};
