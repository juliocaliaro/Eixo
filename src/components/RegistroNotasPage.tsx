import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Receipt,
  Plus,
  Trash,
  BuildingApartment,
  User,
  MapPin,
  X,
  ArrowsOut,
  CalendarBlank,
  NotePencil,
  FileText,
  CaretDown,
} from '@phosphor-icons/react';
import { Obra, RegistroNota, PerfilUsuario } from '../types/obra';
import { ModalRegistroNota, NovaNotaData } from './ModalRegistroNota';
import { ModalConfirm } from './ModalConfirm';

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
  const [filtroObraId, setFiltroObraId] = useState<string>('todas');
  const [isModalNotaOpen, setIsModalNotaOpen] = useState(false);
  const [selectedObraIdForModal, setSelectedObraIdForModal] = useState<string | undefined>(undefined);
  const [expandedObrasMobile, setExpandedObrasMobile] = useState<Record<string, boolean>>({});

  // Lightbox de foto
  const [lightboxFoto, setLightboxFoto] = useState<{ url: string; titulo?: string } | null>(null);

  // Confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<{
    obraId: string;
    notaId: string;
    titulo: string;
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

  const formatarData = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  // Filtragem de obras por seleção direta
  const obrasFiltradas = useMemo(() => {
    if (filtroObraId === 'todas') return obras;
    return obras.filter((o) => o.id === filtroObraId);
  }, [obras, filtroObraId]);

  const handleOpenAddNota = (obraId?: string) => {
    setSelectedObraIdForModal(obraId);
    setIsModalNotaOpen(true);
  };

  const handleSaveNota = (dados: NovaNotaData) => {
    const obraAlvo = obras.find((o) => o.id === dados.obraId);
    if (!obraAlvo) return;

    const novaNota: RegistroNota = {
      id: `nota_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      obraId: dados.obraId,
      fotos: dados.fotos,
      titulo: dados.titulo,
      observacoes: dados.observacoes,
      criadoEm: new Date().toISOString(),
    };

    const updatedObra: Obra = {
      ...obraAlvo,
      notas: [novaNota, ...(obraAlvo.notas || [])],
    };

    onUpdateObra(updatedObra);
    setIsModalNotaOpen(false);

    showToast(
      'Nota Registrada!',
      `A nota foi anexada com sucesso à obra "${obraAlvo.nome}".`,
      'success'
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { obraId, notaId } = deleteTarget;
    const obraAlvo = obras.find((o) => o.id === obraId);
    if (!obraAlvo) return;

    const updatedObra: Obra = {
      ...obraAlvo,
      notas: (obraAlvo.notas || []).filter((n) => n.id !== notaId),
    };

    onUpdateObra(updatedObra);
    setDeleteTarget(null);

    showToast('Nota Removida', 'A nota foi excluída com sucesso.', 'info');
  };

  const toggleMobileObra = (obraId: string) => {
    setExpandedObrasMobile((prev) => {
      const currentVal = prev[obraId] !== undefined ? prev[obraId] : (filtroObraId === obraId);
      return {
        ...prev,
        [obraId]: !currentVal,
      };
    });
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* ========================================================
          CABEÇALHO DESKTOP (Inalterado, preservado 100%)
          ======================================================== */}
      <div
        className="registro-notas-header-desktop"
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Esquerda: Botão Voltar e Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onBack}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.88rem' }}
            title="Voltar para a lista de obras"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Voltar</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-xs)',
                background: 'var(--dark-coffee-100)',
                color: 'var(--dark-coffee-800)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={20} weight="fill" />
            </div>
            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Registro de Notas
            </h1>
          </div>
        </div>

        {/* Direita: Campo onde escolhe qual obra quer ver ou acessar + Botão Registrar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BuildingApartment size={18} color="var(--text-muted)" />
            <select
              value={filtroObraId}
              onChange={(e) => setFiltroObraId(e.target.value)}
              className="form-input"
              style={{
                minWidth: '220px',
                maxWidth: '340px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: '#ffffff',
                color: 'var(--text-main)',
                appearance: 'auto',
              }}
              title="Selecione a obra que deseja visualizar"
            >
              <option value="todas">Todas as Obras ({obras.length})</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome} {o.cliente ? `• ${o.cliente}` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddNota(filtroObraId !== 'todas' ? filtroObraId : undefined)}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.88rem' }}
          >
            <Plus size={16} weight="bold" />
            <span>Registrar Nota</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          CABEÇALHO MOBILE (Exclusivo para <= 768px, Organizado e Intuitivo)
          ======================================================== */}
      <div className="registro-notas-header-mobile">
        {/* Linha 1: Voltar à esquerda e Registrar Nota à direita */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.82rem', gap: 6 }}
            title="Voltar para a lista de obras"
          >
            <ArrowLeft size={15} weight="bold" />
            <span>Voltar</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddNota(filtroObraId !== 'todas' ? filtroObraId : undefined)}
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: '0.82rem', gap: 6 }}
          >
            <Plus size={15} weight="bold" />
            <span>Registrar Nota</span>
          </button>
        </div>

        {/* Linha 2: Título com Ícone */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-xs)',
              background: 'var(--dark-coffee-100)',
              color: 'var(--dark-coffee-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Receipt size={18} weight="fill" />
          </div>
          <h1
            style={{
              fontSize: '1.20rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Registro de Notas
          </h1>
        </div>

        {/* Linha 3: Seletor de Obras em Destaque 100% Full-Width */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#ffffff',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            boxShadow: 'var(--shadow-subtle)',
            width: '100%',
          }}
        >
          <BuildingApartment size={18} color="var(--primary-accent)" weight="bold" style={{ flexShrink: 0 }} />
          <select
            value={filtroObraId}
            onChange={(e) => setFiltroObraId(e.target.value)}
            className="form-input"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontWeight: 600,
              fontSize: '0.88rem',
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: 0,
              appearance: 'auto',
            }}
            title="Selecione a obra que deseja visualizar"
          >
            <option value="todas">Todas as Obras ({obras.length})</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome} {o.cliente ? `• ${o.cliente}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Cards por Obra */}
      {obrasFiltradas.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-hairline)',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <BuildingApartment size={36} weight="light" style={{ margin: '0 auto 12px auto', display: 'block' }} />
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Nenhuma obra encontrada.
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>
            Cadastre uma obra para anexar notas fiscais.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {obrasFiltradas.map((obra) => {
            const notasDaObra = obra.notas || [];
            const temNotas = notasDaObra.length > 0;
            const isExpandedMobile = expandedObrasMobile[obra.id] !== undefined
              ? expandedObrasMobile[obra.id]
              : (filtroObraId === obra.id);

            return (
              <React.Fragment key={obra.id}>
                {/* ========================================================
                    VERSÃO DESKTOP (Inalterada, 100% como está)
                    ======================================================== */}
                <div
                  className="registro-notas-card-desktop"
                  style={{
                    background: '#ffffff',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-hairline)',
                    boxShadow: 'var(--shadow-sm)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Cabeçalho do Card da Obra */}
                  <div
                  style={{
                    padding: '16px 22px',
                    borderBottom: '1px solid var(--border-hairline)',
                    background: 'var(--dark-coffee-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 'var(--radius-xs)',
                        background: '#ffffff',
                        border: '1px solid var(--border-hairline)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-accent)',
                        flexShrink: 0,
                      }}
                    >
                      <BuildingApartment size={20} weight="bold" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {obra.nome}
                      </h2>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          marginTop: 3,
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <User size={13} />
                          <span>{obra.cliente}</span>
                        </span>
                        {obra.endereco && obra.endereco !== 'Endereço não informado' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={13} />
                            <span>{obra.endereco}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenAddNota(obra.id)}
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.82rem', gap: 6 }}
                    >
                      <Plus size={14} weight="bold" />
                      <span>Anexar Nota</span>
                    </button>
                  </div>
                </div>

                {/* Corpo do Card da Obra: Galeria de Fotos e Imagens */}
                <div style={{ padding: '20px 22px' }}>
                  {!temNotas ? (
                    <div
                      onClick={() => handleOpenAddNota(obra.id)}
                      style={{
                        border: '1.5px dashed var(--border-hairline)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '28px 16px',
                        textAlign: 'center',
                        background: '#ffffff',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-accent)';
                        e.currentTarget.style.background = 'var(--dark-coffee-50)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-hairline)';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      <Receipt size={28} weight="light" style={{ margin: '0 auto 8px auto', display: 'block', color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
                        Nenhuma nota fiscal ou comprovante anexado
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                        Clique aqui para anexar fotos de notas fiscais ou recibos desta obra
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                      {notasDaObra.map((nota, idx) => (
                        <div
                          key={nota.id || idx}
                          style={{
                            border: '1px solid var(--border-hairline)',
                            borderRadius: 'var(--radius-sm)',
                            background: '#ffffff',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--dark-coffee-300)';
                            e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-hairline)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                          }}
                        >
                          {/* Galeria de Fotos da Nota */}
                          <div style={{ position: 'relative', width: '100%', height: 180, background: '#f8f5f0', overflow: 'hidden' }}>
                            {nota.fotos && nota.fotos.length > 0 ? (
                              <img
                                src={nota.fotos[0]}
                                alt={nota.titulo || 'Nota fiscal'}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setLightboxFoto({ url: nota.fotos[0], titulo: nota.titulo })}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                <FileText size={32} />
                              </div>
                            )}

                            {/* Overlay de Quantidade de Fotos caso haja mais de 1 */}
                            {nota.fotos && nota.fotos.length > 1 && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: 8,
                                  right: 8,
                                  background: 'rgba(26, 19, 10, 0.78)',
                                  color: '#ffffff',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: 100,
                                  backdropFilter: 'blur(3px)',
                                }}
                              >
                                +{nota.fotos.length - 1} foto{nota.fotos.length - 1 > 1 ? 's' : ''}
                              </span>
                            )}

                            {/* Botão de Ampliação */}
                            {nota.fotos && nota.fotos.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setLightboxFoto({ url: nota.fotos[0], titulo: nota.titulo })}
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  left: 8,
                                  background: 'rgba(26, 19, 10, 0.65)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 'var(--radius-xs)',
                                  width: 28,
                                  height: 28,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease',
                                }}
                                title="Visualizar foto ampliada"
                              >
                                <ArrowsOut size={14} weight="bold" />
                              </button>
                            )}

                            {/* Botão de Excluir Nota */}
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  obraId: obra.id,
                                  notaId: nota.id,
                                  titulo: nota.titulo || `Nota #${idx + 1}`,
                                })
                              }
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                background: 'rgba(255, 255, 255, 0.90)',
                                color: '#b91c1c',
                                border: '1px solid rgba(185, 28, 28, 0.2)',
                                borderRadius: 'var(--radius-xs)',
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                              }}
                              title="Excluir nota"
                            >
                              <Trash size={14} weight="bold" />
                            </button>
                          </div>

                          {/* Miniaturas adicionais se houver mais fotos */}
                          {nota.fotos && nota.fotos.length > 1 && (
                            <div style={{ display: 'flex', gap: 6, padding: '8px 14px', background: 'var(--dark-coffee-50)', borderBottom: '1px solid var(--border-hairline)', overflowX: 'auto' }}>
                              {nota.fotos.slice(1).map((fotoUrl, fIdx) => (
                                <img
                                  key={fIdx}
                                  src={fotoUrl}
                                  alt=""
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 4,
                                    objectFit: 'cover',
                                    border: '1px solid var(--border-hairline)',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                  }}
                                  onClick={() => setLightboxFoto({ url: fotoUrl, titulo: nota.titulo })}
                                />
                              ))}
                            </div>
                          )}

                          {/* Detalhes da Nota */}
                          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                <strong
                                  style={{
                                    fontSize: '0.88rem',
                                    color: 'var(--text-main)',
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={nota.titulo || `Nota #${idx + 1}`}
                                >
                                  {nota.titulo || `Nota #${idx + 1}`}
                                </strong>
                              </div>

                              {nota.observacoes && (
                                <p
                                  style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '0.78rem',
                                    color: 'var(--text-muted)',
                                    lineHeight: 1.4,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {nota.observacoes}
                                </p>
                              )}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)',
                                borderTop: '1px solid var(--border-subtle)',
                                paddingTop: 8,
                                marginTop: 6,
                              }}
                            >
                              <CalendarBlank size={12} />
                              <span>{formatarData(nota.criadoEm)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

                {/* ========================================================
                    VERSÃO MOBILE (Card Minimizado / Accordion por Obra)
                    ======================================================== */}
                <div className="registro-notas-card-mobile">
                  {/* Cabeçalho Minimizado (Clickable / Accordion Trigger) */}
                  <div
                    role="button"
                    tabIndex={0}
                    className="registro-notas-card-mobile-header"
                    onClick={() => toggleMobileObra(obra.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleMobileObra(obra.id);
                      }
                    }}
                    aria-expanded={isExpandedMobile}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 'var(--radius-xs)',
                          background: '#ffffff',
                          border: '1px solid var(--border-hairline)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary-accent)',
                          flexShrink: 0,
                        }}
                      >
                        <BuildingApartment size={18} weight="bold" />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h2
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {obra.nome}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          <User size={12} color="var(--primary-accent)" />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{obra.cliente}</span>
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Badge de Notas + Caret */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 100,
                          background: temNotas ? 'var(--dark-coffee-100)' : '#f3f4f6',
                          color: temNotas ? 'var(--dark-coffee-800)' : '#6b7280',
                          border: `1px solid ${temNotas ? 'var(--dark-coffee-200)' : '#e5e7eb'}`,
                        }}
                      >
                        {temNotas ? `${notasDaObra.length} ${notasDaObra.length === 1 ? 'nota' : 'notas'}` : 'Sem notas'}
                      </span>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: isExpandedMobile ? 'var(--dark-coffee-100)' : 'transparent',
                          color: 'var(--text-main)',
                          flexShrink: 0,
                          transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s ease',
                          transform: isExpandedMobile ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        <CaretDown size={15} weight="bold" />
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo Expandido no Mobile */}
                  {isExpandedMobile && (
                    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-hairline)' }}>
                      {/* Barra superior de ações e endereço no mobile */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          marginBottom: 14,
                          flexWrap: 'wrap',
                        }}
                      >
                        {obra.endereco && obra.endereco !== 'Endereço não informado' ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            <MapPin size={13} color="var(--primary-accent)" />
                            <span style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {obra.endereco}
                            </span>
                          </div>
                        ) : <div />}

                        <button
                          type="button"
                          onClick={() => handleOpenAddNota(obra.id)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', gap: 6, marginLeft: 'auto' }}
                        >
                          <Plus size={14} weight="bold" />
                          <span>Anexar Nota</span>
                        </button>
                      </div>

                      {/* Galeria de Fotos / Empty State no Mobile */}
                      {!temNotas ? (
                        <div
                          onClick={() => handleOpenAddNota(obra.id)}
                          style={{
                            border: '1.5px dashed var(--border-hairline)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '22px 14px',
                            textAlign: 'center',
                            background: '#ffffff',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Receipt size={24} weight="light" style={{ margin: '0 auto 6px auto', display: 'block', color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
                            Nenhuma nota fiscal ou recibo anexado
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                            Toque aqui para anexar a primeira nota
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {notasDaObra.map((nota, idx) => (
                            <div
                              key={nota.id || idx}
                              style={{
                                border: '1px solid var(--border-hairline)',
                                borderRadius: 'var(--radius-sm)',
                                background: '#ffffff',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              }}
                            >
                              {/* Imagem da Nota */}
                              <div style={{ position: 'relative', width: '100%', height: 160, background: '#f8f5f0', overflow: 'hidden' }}>
                                {nota.fotos && nota.fotos.length > 0 ? (
                                  <img
                                    src={nota.fotos[0]}
                                    alt={nota.titulo || 'Nota fiscal'}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => setLightboxFoto({ url: nota.fotos[0], titulo: nota.titulo })}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    <FileText size={28} />
                                  </div>
                                )}

                                {nota.fotos && nota.fotos.length > 1 && (
                                  <span
                                    style={{
                                      position: 'absolute',
                                      bottom: 8,
                                      right: 8,
                                      background: 'rgba(26, 19, 10, 0.78)',
                                      color: '#ffffff',
                                      fontSize: '0.70rem',
                                      fontWeight: 700,
                                      padding: '3px 8px',
                                      borderRadius: 100,
                                      backdropFilter: 'blur(3px)',
                                    }}
                                  >
                                    +{nota.fotos.length - 1} foto{nota.fotos.length - 1 > 1 ? 's' : ''}
                                  </span>
                                )}

                                {nota.fotos && nota.fotos.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxFoto({ url: nota.fotos[0], titulo: nota.titulo })}
                                    style={{
                                      position: 'absolute',
                                      top: 8,
                                      left: 8,
                                      background: 'rgba(26, 19, 10, 0.65)',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: 'var(--radius-xs)',
                                      width: 28,
                                      height: 28,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                    }}
                                    title="Visualizar foto ampliada"
                                  >
                                    <ArrowsOut size={14} weight="bold" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      obraId: obra.id,
                                      notaId: nota.id,
                                      titulo: nota.titulo || `Nota #${idx + 1}`,
                                    })
                                  }
                                  style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    background: 'rgba(255, 255, 255, 0.90)',
                                    color: '#b91c1c',
                                    border: '1px solid rgba(185, 28, 28, 0.2)',
                                    borderRadius: 'var(--radius-xs)',
                                    width: 28,
                                    height: 28,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                  }}
                                  title="Excluir nota"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>

                              {/* Metadados da Nota */}
                              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <strong
                                      style={{
                                        fontSize: '0.88rem',
                                        color: 'var(--text-main)',
                                        display: 'block',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {nota.titulo || 'Nota Fiscal / Cupom'}
                                    </strong>
                                    {nota.criadoEm && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                        <CalendarBlank size={12} />
                                        <span>{formatarData(nota.criadoEm)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {nota.observacoes && (
                                  <div
                                    style={{
                                      fontSize: '0.76rem',
                                      color: 'var(--text-muted)',
                                      background: 'var(--dark-coffee-50)',
                                      padding: '6px 8px',
                                      borderRadius: 'var(--radius-xs)',
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: 5,
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    <NotePencil size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{nota.observacoes}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Modal de Registro de Notas */}
      <ModalRegistroNota
        isOpen={isModalNotaOpen}
        onClose={() => setIsModalNotaOpen(false)}
        obras={obras}
        preselectedObraId={selectedObraIdForModal}
        onSave={handleSaveNota}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ModalConfirm
        isOpen={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Nota Fiscal"
        message={`Deseja realmente remover a nota "${deleteTarget?.titulo || 'selecionada'}"? As fotos anexadas a ela serão excluídas desta obra.`}
        confirmText="Excluir Nota"
        variant="danger"
      />

      {/* Lightbox em Tela Cheia */}
      {lightboxFoto && (
        <div
          className="modal-backdrop"
          onClick={() => setLightboxFoto(null)}
          style={{ zIndex: 10000, padding: 16 }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                color: '#ffffff',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: '0.90rem', fontWeight: 600 }}>
                {lightboxFoto.titulo || 'Visualização da Nota'}
              </span>
              <button
                type="button"
                onClick={() => setLightboxFoto(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Fechar (Escape)"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <img
              src={lightboxFoto.url}
              alt=""
              style={{
                maxWidth: '100%',
                maxHeight: '84vh',
                objectFit: 'contain',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
