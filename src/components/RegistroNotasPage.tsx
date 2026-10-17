import React, { useState, useMemo, useRef } from 'react';
import {
  Receipt,
  Plus,
  Trash,
  CaretDown,
  FileText,
  FilePdf,
  Funnel,
  MagnifyingGlassPlus,
} from '@phosphor-icons/react';
import { Obra, RegistroNota, PerfilUsuario } from '../types/obra';
import { ModalRegistroNota, NovaNotaData } from './ModalRegistroNota';
import { ModalConfirm } from './ModalConfirm';
import { PageHeader } from './PageHeader';
import { OverflowMenu } from './OverflowMenu';
import { EmptyState } from './EmptyState';
import { generateUUID } from '../utils/uuid';
import { notasApi } from '../services/api';
import { isPdfUrl } from '../utils/fileUtils';
import { GalleryLightbox } from './Lightbox';
import { formatarDataIsoBR } from '../utils/data';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePopoverDismiss } from '../hooks/usePopoverDismiss';
import '../styles/registros-modelos.css';

interface RegistroNotasPageProps {
  obras: Obra[];
  onUpdateObra: (obra: Obra) => void;
  onBack: () => void;
  showToast: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
  perfilAtivo?: PerfilUsuario;
}

export const RegistroNotasPage: React.FC<RegistroNotasPageProps> = ({
  obras,
  onUpdateObra,
  onBack,
  showToast,
  perfilAtivo = 'construtor',
}) => {
  // Cliente acompanha (ver e ampliar); só o construtor cria e exclui notas.
  const podeEditar = perfilAtivo === 'construtor';
  const isMobile = useIsMobile();

  const [filtroObraId, setFiltroObraId] = useState<string>('todas');
  const [isFiltroOpen, setIsFiltroOpen] = useState(false);
  const [isModalNotaOpen, setIsModalNotaOpen] = useState(false);
  const [selectedObraIdForModal, setSelectedObraIdForModal] = useState<string | undefined>(undefined);
  const [expandedObras, setExpandedObras] = useState<Record<string, boolean>>({});

  const filtroRef = useRef<HTMLDivElement>(null);
  usePopoverDismiss(filtroRef, isFiltroOpen, () => setIsFiltroOpen(false), ['mousedown', 'touchstart']);

  // Lightbox de foto com navegação entre imagens
  const [lightboxState, setLightboxState] = useState<{
    fotos: string[];
    index: number;
    titulo?: string;
  } | null>(null);

  // Confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<{
    obraId: string;
    notaId: string;
    titulo: string;
  } | null>(null);

  const obrasFiltradas = useMemo(() => {
    if (filtroObraId === 'todas') return obras;
    return obras.filter((o) => o.id === filtroObraId);
  }, [obras, filtroObraId]);

  const obraFiltroNome = filtroObraId === 'todas' ? 'Todas as obras' : obras.find((o) => o.id === filtroObraId)?.nome ?? 'Todas as obras';

  const handleOpenAddNota = () => {
    setSelectedObraIdForModal(filtroObraId !== 'todas' ? filtroObraId : undefined);
    setIsModalNotaOpen(true);
  };

  const handleSaveNota = (dados: NovaNotaData) => {
    const obraAlvo = obras.find((o) => o.id === dados.obraId);
    if (!obraAlvo) return;

    const novaNota: RegistroNota = {
      id: generateUUID(),
      obraId: dados.obraId,
      fotos: dados.fotos,
      titulo: dados.titulo,
      observacoes: dados.observacoes,
      criadoEm: new Date().toISOString(),
    };

    onUpdateObra({
      ...obraAlvo,
      notas: [novaNota, ...(obraAlvo.notas || [])],
    });
    setIsModalNotaOpen(false);

    showToast('Nota registrada', `A nota foi anexada à obra "${obraAlvo.nome}".`, 'success');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { obraId, notaId } = deleteTarget;
    const obraAlvo = obras.find((o) => o.id === obraId);
    if (!obraAlvo) return;

    const notaAlvo = (obraAlvo.notas || []).find((n) => n.id === notaId);

    onUpdateObra({
      ...obraAlvo,
      notas: (obraAlvo.notas || []).filter((n) => n.id !== notaId),
    });
    setDeleteTarget(null);

    // Remove do Supabase no servidor e do Storage
    notasApi.delete(notaId, notaAlvo?.fotos);

    showToast('Nota removida', 'A nota e seus arquivos foram excluídos.', 'info');
  };

  const isExpanded = (obraId: string) =>
    expandedObras[obraId] !== undefined ? expandedObras[obraId] : filtroObraId === obraId;

  const toggleObra = (obraId: string) =>
    setExpandedObras((prev) => ({ ...prev, [obraId]: !isExpanded(obraId) }));

  const abrirLightbox = (nota: RegistroNota, obra: Obra) => {
    if (!nota.fotos || nota.fotos.length === 0) return;
    setLightboxState({ fotos: nota.fotos, index: 0, titulo: `${nota.titulo || 'Nota'} · ${obra.nome}` });
  };

  const tituloDaNota = (nota: RegistroNota, idx: number) => nota.titulo || `Nota ${idx + 1}`;

  const menuDaNota = (nota: RegistroNota, obra: Obra, idx: number) =>
    podeEditar ? (
      <OverflowMenu
        label={`Ações da nota ${tituloDaNota(nota, idx)}`}
        items={[
          {
            key: 'excluir',
            label: 'Excluir nota',
            icon: <Trash size={18} aria-hidden="true" />,
            danger: true,
            onSelect: () => setDeleteTarget({ obraId: obra.id, notaId: nota.id, titulo: tituloDaNota(nota, idx) }),
          },
        ]}
      />
    ) : null;

  const miniatura = (nota: RegistroNota, obra: Obra, idx: number, className: string) => {
    const primeira = nota.fotos && nota.fotos.length > 0 ? nota.fotos[0] : null;
    const conteudo = primeira ? (
      isPdfUrl(primeira) ? (
        <>
          <FilePdf size={28} weight="fill" aria-hidden="true" />
          <span className="rg-pdf-label">PDF</span>
        </>
      ) : (
        <img src={primeira} alt="" loading="lazy" />
      )
    ) : (
      <FileText size={28} aria-hidden="true" />
    );
    const extra = nota.fotos && nota.fotos.length > 1 ? <span className="rg-thumb-count">+{nota.fotos.length - 1}</span> : null;
    if (!primeira) {
      return (
        <div className={className} aria-hidden="true">
          {conteudo}
        </div>
      );
    }
    return (
      <button
        type="button"
        className={className}
        onClick={() => abrirLightbox(nota, obra)}
        aria-label={`Ampliar ${tituloDaNota(nota, idx)}`}
      >
        {conteudo}
        {extra}
      </button>
    );
  };

  return (
    <div className="page rg-page">
      <PageHeader
        backLabel="Voltar"
        onBack={onBack}
        title={<><span className="rg-title-long">Registro de notas</span><span className="rg-title-short">Notas</span></>}
        actions={
          podeEditar ? (
            <button type="button" className="btn-primary rg-cta" onClick={handleOpenAddNota} aria-label="Registrar nota">
              <Plus size={18} weight="bold" aria-hidden="true" />
              <span>
                Registrar<span className="rg-hide-xs"> nota</span>
              </span>
            </button>
          ) : null
        }
      />

      {obras.length > 1 && (
        <div className="toolbar rg-toolbar">
          <p className="toolbar-lead rg-summary">{obraFiltroNome}</p>
          <div ref={filtroRef}>
            <button
              type="button"
              className="btn-icon"
              aria-label="Filtrar por obra"
              aria-expanded={isFiltroOpen}
              onClick={() => setIsFiltroOpen((v) => !v)}
            >
              <Funnel size={18} aria-hidden="true" />
              {filtroObraId !== 'todas' && <span className="dot" />}
            </button>
            {isFiltroOpen && (
              <div className="toolbar-popover rg-popover" role="menu">
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
              </div>
            )}
          </div>
        </div>
      )}

      {obrasFiltradas.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhuma nota registrada." />
      ) : (
        <div className="rg-obras">
          {obrasFiltradas.map((obra) => {
            const notasDaObra = obra.notas || [];
            const temNotas = notasDaObra.length > 0;
            // Mobile: obra é acordeão (fechada por padrão). Desktop: sempre aberta.
            const aberta = !isMobile || isExpanded(obra.id);
            const contagem = temNotas ? `${notasDaObra.length} ${notasDaObra.length === 1 ? 'nota' : 'notas'}` : 'Sem notas';
            const enderecoValido = obra.endereco && obra.endereco !== 'Endereço não informado';

            return (
              <section key={obra.id} className="rg-obra">
                {isMobile ? (
                  <div
                    role="button"
                    tabIndex={0}
                    className="rg-obra-head rg-obra-head--toggle"
                    aria-expanded={aberta}
                    onClick={() => toggleObra(obra.id)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleObra(obra.id);
                      }
                    }}
                  >
                    <div className="rg-obra-id">
                      <h2 className="rg-obra-name">{obra.nome}</h2>
                      <div className="list-row-sub rg-row-sub">{obra.cliente}</div>
                    </div>
                    <span className={`badge ${temNotas ? '' : 'badge--neutral'}`}>{contagem}</span>
                    <CaretDown size={18} weight="bold" className={`rg-caret${aberta ? ' is-open' : ''}`} aria-hidden="true" />
                  </div>
                ) : (
                  <div className="rg-obra-head">
                    <div className="rg-obra-id">
                      <h2 className="rg-obra-name">{obra.nome}</h2>
                      <div className="list-row-sub rg-row-sub">
                        {[obra.cliente, enderecoValido ? obra.endereco : null].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className={`badge ${temNotas ? '' : 'badge--neutral'}`}>{contagem}</span>
                  </div>
                )}

                {aberta && (
                  <div className="rg-obra-body">
                    {isMobile && enderecoValido && <p className="rg-obra-address">{obra.endereco}</p>}

                    {!temNotas ? (
                      <EmptyState icon={Receipt} className="empty-state--nested" title="Nenhuma nota registrada." />
                    ) : isMobile ? (
                      <ul className="rg-list">
                        {notasDaObra.map((nota, idx) => (
                          <li key={nota.id || idx} className="list-row rg-row">
                            {miniatura(nota, obra, idx, 'rg-thumb rg-thumb--lg')}
                            <div className="list-row-main">
                              <div className="list-row-title rg-row-name">{tituloDaNota(nota, idx)}</div>
                              <div className="list-row-sub">{formatarDataIsoBR(nota.criadoEm)}</div>
                              {nota.observacoes && <div className="list-row-sub rg-row-sub">{nota.observacoes}</div>}
                            </div>
                            {podeEditar && <div className="list-row-end">{menuDaNota(nota, obra, idx)}</div>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="rg-notas-grid">
                        {notasDaObra.map((nota, idx) => (
                          <li key={nota.id || idx} className="rg-nota-card">
                            {miniatura(nota, obra, idx, 'rg-nota-cover')}
                            <div className="rg-nota-info">
                              <div className="rg-nota-text">
                                <strong className="rg-row-name" title={tituloDaNota(nota, idx)}>
                                  {tituloDaNota(nota, idx)}
                                </strong>
                                <span className="list-row-sub">{formatarDataIsoBR(nota.criadoEm)}</span>
                                {nota.observacoes && <span className="list-row-sub rg-clamp-2">{nota.observacoes}</span>}
                              </div>
                              {nota.fotos && nota.fotos.length > 0 && (
                                <button
                                  type="button"
                                  className="btn-icon rg-zoom-btn"
                                  onClick={() => abrirLightbox(nota, obra)}
                                  aria-label={`Ampliar ${tituloDaNota(nota, idx)}`}
                                >
                                  <MagnifyingGlassPlus size={18} aria-hidden="true" />
                                </button>
                              )}
                              {menuDaNota(nota, obra, idx)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {podeEditar && (
        <ModalRegistroNota
          isOpen={isModalNotaOpen}
          onClose={() => setIsModalNotaOpen(false)}
          obras={obras}
          preselectedObraId={selectedObraIdForModal}
          onSave={handleSaveNota}
        />
      )}

      <ModalConfirm
        isOpen={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir nota"
        message={`Deseja remover a nota "${deleteTarget?.titulo || 'selecionada'}"? Os arquivos anexados a ela serão excluídos.`}
        confirmText="Excluir nota"
        variant="danger"
      />

      {lightboxState && (
        <GalleryLightbox
          fotos={lightboxState.fotos}
          index={lightboxState.index}
          titulo={lightboxState.titulo}
          tituloPadrao="Visualização da nota"
          onIndexChange={(i) => setLightboxState((prev) => (prev ? { ...prev, index: i } : null))}
          onClose={() => setLightboxState(null)}
        />
      )}
    </div>
  );
};
