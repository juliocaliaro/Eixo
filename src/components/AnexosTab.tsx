import React, { useState } from 'react';
import {
  Camera,
  NotePencil,
  Plus,
  Image as ImageIcon,
  Trash,
  MagnifyingGlass,
  Sparkle,
  X,
  FolderSimple,
  ArrowRight,
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  CheckCircle,
  Eye,
  CalendarBlank,
  Paperclip
} from '@phosphor-icons/react';
import { Obra, AnexoItem, Etapa, Tarefa, PerfilUsuario } from '../types/obra';
import { getEtapaIcon } from '../utils/etapaIcons';

interface AnexosTabProps {
  obra: Obra;
  perfilAtivo?: PerfilUsuario;
  onAddAnexoGeral: (anexo: Omit<AnexoItem, 'id' | 'data'>) => void;
  onDeleteAnexo: (anexoId: string) => void;
  onNavigateToTask?: (etapaId: string, tarefaId: string) => void;
  onUpdateTaskMedia?: (etapaId: string, tarefaId: string, fotos: string[], anotacoes: string[]) => void;
}

export const AnexosTab: React.FC<AnexosTabProps> = ({
  obra,
  perfilAtivo = 'construtor',
  onAddAnexoGeral,
  onDeleteAnexo,
  onNavigateToTask,
  onUpdateTaskMedia,
}) => {
  const [filter, setFilter] = useState<'todos' | 'foto' | 'anotacao'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedEtapas, setCollapsedEtapas] = useState<Record<string, boolean>>({});

  // Lightbox
  const [selectedImageModal, setSelectedImageModal] = useState<{
    url: string;
    titulo: string;
    subtitulo?: string;
  } | null>(null);

  // Modal Novo Anexo
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [tipoNovo, setTipoNovo] = useState<'foto' | 'anotacao'>('foto');
  const [destinoNovo, setDestinoNovo] = useState<'geral' | 'tarefa'>('geral');
  const [etapaDestinoId, setEtapaDestinoId] = useState<string>(obra.etapas[0]?.id || '');
  const [tarefaDestinoId, setTarefaDestinoId] = useState<string>('');
  const [tituloNovo, setTituloNovo] = useState('');
  const [conteudoNovo, setConteudoNovo] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Formatação de data/hora
  const formatarDataHora = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const data = new Date(isoString);
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatarData = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const data = new Date(isoString);
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // Contadores globais
  let totalFotos = 0;
  let totalNotas = 0;

  obra.etapas.forEach((etapa) => {
    etapa.tarefas.forEach((tarefa) => {
      if (tarefa.fotos) totalFotos += tarefa.fotos.length;
      if (tarefa.anotacoes) totalNotas += tarefa.anotacoes.length;
    });
  });

  (obra.anexosGerais || []).forEach((item) => {
    if (item.tipo === 'foto') totalFotos += 1;
    if (item.tipo === 'anotacao') totalNotas += 1;
  });

  const totalRegistros = totalFotos + totalNotas;

  // Alternar colapso de etapa individual
  const toggleEtapaCollapse = (etapaId: string) => {
    setCollapsedEtapas((prev) => ({
      ...prev,
      [etapaId]: !prev[etapaId],
    }));
  };

  // Alternar expandir/recolher tudo
  const allCollapsed = obra.etapas.length > 0 && obra.etapas.every((e) => collapsedEtapas[e.id]);
  const handleToggleCollapseAll = () => {
    if (allCollapsed) {
      setCollapsedEtapas({});
    } else {
      const newCollapsed: Record<string, boolean> = {};
      obra.etapas.forEach((e) => {
        newCollapsed[e.id] = true;
      });
      setCollapsedEtapas(newCollapsed);
    }
  };

  // Upload no modal de novo anexo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (tipoNovo === 'foto' && !fotoPreview) {
      setFormError('Selecione uma imagem antes de salvar.');
      return;
    }
    if (tipoNovo === 'anotacao' && !conteudoNovo.trim()) {
      setFormError('Digite o texto da observação antes de salvar.');
      return;
    }

    if (destinoNovo === 'tarefa' && etapaDestinoId && tarefaDestinoId && onUpdateTaskMedia) {
      const etapa = obra.etapas.find((e) => e.id === etapaDestinoId);
      const tarefa = etapa?.tarefas.find((t) => t.id === tarefaDestinoId);
      if (etapa && tarefa) {
        const fotosAtuais = tarefa.fotos ? [...tarefa.fotos] : [];
        const notasAtuais = tarefa.anotacoes ? [...tarefa.anotacoes] : [];

        if (tipoNovo === 'foto' && fotoPreview) {
          fotosAtuais.push(fotoPreview);
        } else if (tipoNovo === 'anotacao' && conteudoNovo.trim()) {
          notasAtuais.push(conteudoNovo.trim());
        }

        onUpdateTaskMedia(etapa.id, tarefa.id, fotosAtuais, notasAtuais);
      }
    } else {
      onAddAnexoGeral({
        titulo: tituloNovo.trim() || (tipoNovo === 'foto' ? 'Foto da Obra' : 'Nota de Diário'),
        tipo: tipoNovo,
        conteudo: tipoNovo === 'foto' ? (fotoPreview as string) : conteudoNovo.trim(),
      });
    }

    setModalNovoAberto(false);
    setTituloNovo('');
    setConteudoNovo('');
    setFotoPreview(null);
    setFormError(null);
  };

  // Filtragem de tarefas por etapa
  const cleanSearch = searchTerm.trim().toLowerCase();

  const etapasComRegistros = obra.etapas.map((etapa) => {
    // Filtrar tarefas da etapa
    const tarefasFiltradas = etapa.tarefas.filter((tarefa) => {
      const temFotos = Boolean(tarefa.fotos && tarefa.fotos.length > 0);
      const temNotas = Boolean(tarefa.anotacoes && tarefa.anotacoes.length > 0);

      // Filtro de tipo
      if (filter === 'foto' && !temFotos) return false;
      if (filter === 'anotacao' && !temNotas) return false;
      if (filter === 'todos' && !temFotos && !temNotas) return false;

      // Filtro de busca textual
      if (cleanSearch) {
        const matchesEtapa = etapa.nome.toLowerCase().includes(cleanSearch);
        const matchesTarefa = tarefa.nome.toLowerCase().includes(cleanSearch);
        const matchesNotas = (tarefa.anotacoes || []).some((n) => n.toLowerCase().includes(cleanSearch));
        if (!matchesEtapa && !matchesTarefa && !matchesNotas) {
          return false;
        }
      }

      return true;
    });

    const totalFotosEtapa = etapa.tarefas.reduce((acc, t) => acc + (t.fotos?.length || 0), 0);
    const totalNotasEtapa = etapa.tarefas.reduce((acc, t) => acc + (t.anotacoes?.length || 0), 0);

    return {
      etapa,
      tarefas: tarefasFiltradas,
      totalFotos: totalFotosEtapa,
      totalNotas: totalNotasEtapa,
      temRegistros: tarefasFiltradas.length > 0,
    };
  }).filter((item) => item.temRegistros);

  // Anexos gerais filtrados
  const anexosGeraisFiltrados = (obra.anexosGerais || []).filter((item) => {
    if (filter === 'foto' && item.tipo !== 'foto') return false;
    if (filter === 'anotacao' && item.tipo !== 'anotacao') return false;
    if (cleanSearch) {
      const matchTitulo = (item.titulo || '').toLowerCase().includes(cleanSearch);
      const matchConteudo = item.tipo === 'anotacao' ? item.conteudo.toLowerCase().includes(cleanSearch) : false;
      if (!matchTitulo && !matchConteudo) return false;
    }
    return true;
  });

  const temAlgumRegistro = etapasComRegistros.length > 0 || anexosGeraisFiltrados.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header da Aba */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            Anexos & Diário de Bordo
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0 0' }}>
            Fotos e registros do dia a dia da obra organizados por etapa técnica e serviço executado
          </p>
        </div>

        {perfilAtivo === 'construtor' && (
          <button
            type="button"
            onClick={() => setModalNovoAberto(true)}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Plus size={16} weight="bold" />
            <span>Adicionar Anexo</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros, Busca e Controle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 14px',
          background: 'var(--dark-coffee-50)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        {/* Chips de Filtro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilter('todos')}
            className={filter === 'todos' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            Todos ({totalRegistros})
          </button>
          <button
            type="button"
            onClick={() => setFilter('foto')}
            className={filter === 'foto' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            <Camera size={14} weight="bold" />
            <span>Fotos ({totalFotos})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('anotacao')}
            className={filter === 'anotacao' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            <NotePencil size={14} weight="bold" />
            <span>Anotações ({totalNotas})</span>
          </button>
        </div>

        {/* Busca e Botão de Expandir/Recolher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 300px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
            <MagnifyingGlass
              size={15}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Buscar etapa, serviço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{
                paddingLeft: 32,
                paddingRight: searchTerm ? 28 : 10,
                paddingTop: 6,
                paddingBottom: 6,
                fontSize: '0.82rem',
                height: 34,
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: 2,
                }}
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </div>

          {etapasComRegistros.length > 1 && (
            <button
              type="button"
              onClick={handleToggleCollapseAll}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
              title={allCollapsed ? 'Expandir todas as etapas' : 'Recolher todas as etapas'}
            >
              {allCollapsed ? <CaretDown size={14} /> : <CaretUp size={14} />}
              <span>{allCollapsed ? 'Expandir tudo' : 'Recolher tudo'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Principal: Separado por Etapa e Tarefa */}
      {!temAlgumRegistro ? (
        <div className="empty-state-box" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div className="empty-icon-circle" style={{ margin: '0 auto 16px auto' }}>
            <ImageIcon size={38} weight="duotone" />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            Nenhum registro encontrado
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            {searchTerm
              ? 'Nenhum resultado corresponde à sua busca atual.'
              : 'Conforme as tarefas forem marcadas como concluídas no cronograma, você poderá registrar fotos e anotações técnicas, que ficarão organizadas aqui por etapa e serviço.'}
          </p>
          {perfilAtivo === 'construtor' && (
            <button
              type="button"
              onClick={() => setModalNovoAberto(true)}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', margin: '0 auto' }}
            >
              <Plus size={16} weight="bold" />
              <span>Adicionar primeiro anexo</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 1. Etapas com tarefas separadas */}
          {etapasComRegistros.map(({ etapa, tarefas, totalFotos, totalNotas }, etapaIdx) => {
            const isCollapsed = Boolean(collapsedEtapas[etapa.id]);
            const iconConfig = getEtapaIcon(etapa.nome, etapa.id);
            const EtapaIcon = iconConfig.Icon;

            return (
              <div
                key={etapa.id}
                style={{
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  background: '#ffffff',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* Cabeçalho da Etapa */}
                <div
                  onClick={() => toggleEtapaCollapse(etapa.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: isCollapsed ? '#ffffff' : 'var(--dark-coffee-50)',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--border-hairline)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 'var(--radius-sm)',
                        background: iconConfig.bg,
                        color: iconConfig.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <EtapaIcon size={18} weight="bold" />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                          {String(etapaIdx + 1).padStart(2, '0')}. {etapa.nome}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10 }}>
                        <span>{tarefas.length} {tarefas.length === 1 ? 'serviço com registro' : 'serviços com registro'}</span>
                        {totalFotos > 0 && <span>• {totalFotos} {totalFotos === 1 ? 'foto' : 'fotos'}</span>}
                        {totalNotas > 0 && <span>• {totalNotas} {totalNotas === 1 ? 'anotação' : 'anotações'}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <CaretDown size={16} weight="bold" />
                    </div>
                  </div>
                </div>

                {/* Corpo da Etapa: Cada Tarefa Separada */}
                {!isCollapsed && (
                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {tarefas.map((tarefa) => {
                      const temFotos = Boolean(tarefa.fotos && tarefa.fotos.length > 0) && (filter === 'todos' || filter === 'foto');
                      const temNotas = Boolean(tarefa.anotacoes && tarefa.anotacoes.length > 0) && (filter === 'todos' || filter === 'anotacao');

                      return (
                        <div
                          key={tarefa.id}
                          style={{
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            background: '#ffffff',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Cabeçalho da Tarefa */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              background: 'var(--dark-coffee-50)',
                              borderBottom: '1px solid var(--border-hairline)',
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              <CheckCircle
                                size={17}
                                weight={tarefa.concluida ? 'fill' : 'regular'}
                                color={tarefa.concluida ? '#16a34a' : 'var(--text-muted)'}
                                style={{ flexShrink: 0 }}
                              />
                              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                {tarefa.nome}
                              </span>
                              {tarefa.concluidaEm && (
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  • {formatarDataHora(tarefa.concluidaEm)}
                                </span>
                              )}
                            </div>

                            {onNavigateToTask && (
                              <button
                                type="button"
                                onClick={() => onNavigateToTask(etapa.id, tarefa.id)}
                                className="btn-secondary"
                                style={{
                                  padding: '4px 9px',
                                  fontSize: '0.74rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  flexShrink: 0,
                                }}
                                title="Ver serviço no cronograma"
                              >
                                <span>Ver no cronograma</span>
                                <ArrowSquareOut size={12} weight="bold" />
                              </button>
                            )}
                          </div>

                          {/* Conteúdo da Tarefa: Fotos e Observações */}
                          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Bloco de Fotos da Tarefa */}
                            {temFotos && (
                              <div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    marginBottom: 8,
                                  }}
                                >
                                  <Camera size={14} weight="bold" color="var(--primary-accent)" />
                                  <span>Fotos do serviço ({tarefa.fotos!.length})</span>
                                </div>

                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                                    gap: 10,
                                  }}
                                >
                                  {tarefa.fotos!.map((foto, fIdx) => (
                                    <div
                                      key={fIdx}
                                      onClick={() =>
                                        setSelectedImageModal({
                                          url: foto,
                                          titulo: tarefa.nome,
                                          subtitulo: `${etapa.nome} • Foto #${fIdx + 1}`,
                                        })
                                      }
                                      style={{
                                        position: 'relative',
                                        aspectRatio: '1',
                                        borderRadius: 6,
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        border: '1px solid var(--border-hairline)',
                                        background: 'var(--dark-coffee-100)',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                      }}
                                      title="Clique para ampliar foto"
                                    >
                                      <img
                                        src={foto}
                                        alt={`Foto ${fIdx + 1} de ${tarefa.nome}`}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover',
                                          display: 'block',
                                          transition: 'transform 0.2s ease',
                                        }}
                                      />
                                      <div
                                        style={{
                                          position: 'absolute',
                                          bottom: 4,
                                          right: 4,
                                          background: 'rgba(0,0,0,0.65)',
                                          color: '#ffffff',
                                          fontSize: '0.62rem',
                                          fontWeight: 700,
                                          padding: '1px 5px',
                                          borderRadius: 3,
                                        }}
                                      >
                                        #{fIdx + 1}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Bloco de Observações da Tarefa */}
                            {temNotas && (
                              <div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    marginBottom: 8,
                                  }}
                                >
                                  <NotePencil size={14} weight="bold" color="#ca8a04" />
                                  <span>Observações e Diário ({tarefa.anotacoes!.length})</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {tarefa.anotacoes!.map((nota, nIdx) => (
                                    <div
                                      key={nIdx}
                                      style={{
                                        padding: '10px 12px',
                                        background: '#fefce8',
                                        border: '1px solid #fef08a',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.85rem',
                                        color: '#713f12',
                                        lineHeight: 1.45,
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 8,
                                      }}
                                    >
                                      <NotePencil size={15} weight="bold" color="#ca8a04" style={{ flexShrink: 0, marginTop: 2 }} />
                                      <div style={{ flex: 1 }}>
                                        <div>{nota}</div>
                                        {tarefa.concluidaEm && (
                                          <div style={{ fontSize: '0.72rem', color: '#a16207', marginTop: 4 }}>
                                            Registrado em {formatarData(tarefa.concluidaEm)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. Anexos Gerais da Obra */}
          {anexosGeraisFiltrados.length > 0 && (
            <div
              style={{
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-md)',
                background: '#ffffff',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '14px 18px',
                  background: 'var(--dark-coffee-50)',
                  borderBottom: '1px solid var(--border-hairline)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--dark-coffee-100)',
                    color: 'var(--dark-coffee-800)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Paperclip size={18} weight="bold" />
                </div>
                <div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Anexos Gerais da Obra
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Documentos e registros não vinculados a um serviço específico ({anexosGeraisFiltrados.length})
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '16px 18px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 14,
                }}
              >
                {anexosGeraisFiltrados.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      background: '#ffffff',
                    }}
                  >
                    {item.tipo === 'foto' ? (
                      <div
                        style={{ height: 160, background: 'var(--dark-coffee-100)', cursor: 'pointer', position: 'relative' }}
                        onClick={() =>
                          setSelectedImageModal({
                            url: item.conteudo,
                            titulo: item.titulo,
                            subtitulo: 'Anexo Geral da Obra',
                          })
                        }
                      >
                        <img
                          src={item.conteudo}
                          alt={item.titulo}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            right: 6,
                            background: 'rgba(0,0,0,0.65)',
                            color: '#ffffff',
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          Ampliar
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: 14,
                          background: '#fefce8',
                          borderBottom: '1px solid #fef08a',
                          minHeight: 90,
                          fontSize: '0.86rem',
                          color: '#713f12',
                          lineHeight: 1.45,
                        }}
                      >
                        "{item.conteudo}"
                      </div>
                    )}

                    <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {item.titulo}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {item.data ? formatarData(item.data) : ''}
                        </div>
                      </div>

                      {perfilAtivo === 'construtor' && (
                        <button
                          type="button"
                          onClick={() => onDeleteAnexo(item.id)}
                          className="btn-icon"
                          style={{ width: 28, height: 28, color: 'var(--coral-glow-600)' }}
                          title="Excluir anexo geral"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Lightbox para Visualizar Foto em Tamanho Cheio */}
      {selectedImageModal && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedImageModal(null)}
          style={{ background: 'rgba(0,0,0,0.85)', padding: 16 }}
        >
          <div
            style={{
              maxWidth: '92vw',
              maxHeight: '92vh',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Lightbox */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                color: '#ffffff',
              }}
            >
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                  {selectedImageModal.titulo}
                </div>
                {selectedImageModal.subtitulo && (
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                    {selectedImageModal.subtitulo}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedImageModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
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
                title="Fechar"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <img
              src={selectedImageModal.url}
              alt={selectedImageModal.titulo}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: 'var(--radius-sm)',
                display: 'block',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            />
          </div>
        </div>
      )}

      {/* Modal para Adicionar Anexo (Geral ou Vinculado a Tarefa) */}
      {modalNovoAberto && (
        <div className="modal-backdrop" onClick={() => setModalNovoAberto(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Novo Registro no Diário</h3>
              <button onClick={() => setModalNovoAberto(false)} className="btn-icon" title="Fechar">
                <X size={16} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovo}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Tipo de Registro */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setTipoNovo('foto')}
                    className={tipoNovo === 'foto' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '0.85rem' }}
                  >
                    <Camera size={16} weight="bold" />
                    <span>Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoNovo('anotacao')}
                    className={tipoNovo === 'anotacao' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '0.85rem' }}
                  >
                    <NotePencil size={16} weight="bold" />
                    <span>Anotação</span>
                  </button>
                </div>

                {/* Destino: Geral ou Vinculado a um Serviço */}
                {obra.etapas.length > 0 && onUpdateTaskMedia && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>Onde deseja registrar?</label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setDestinoNovo('geral')}
                        className={destinoNovo === 'geral' ? 'btn-primary' : 'btn-secondary'}
                        style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem' }}
                      >
                        Anexo Geral da Obra
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDestinoNovo('tarefa');
                          if (!etapaDestinoId && obra.etapas[0]) {
                            setEtapaDestinoId(obra.etapas[0].id);
                          }
                          if (!tarefaDestinoId && obra.etapas[0]?.tarefas[0]) {
                            setTarefaDestinoId(obra.etapas[0].tarefas[0].id);
                          }
                        }}
                        className={destinoNovo === 'tarefa' ? 'btn-primary' : 'btn-secondary'}
                        style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem' }}
                      >
                        Serviço Específico
                      </button>
                    </div>
                  </div>
                )}

                {/* Seletor de Etapa e Tarefa (se destino for tarefa) */}
                {destinoNovo === 'tarefa' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10, background: 'var(--dark-coffee-50)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Etapa:</label>
                      <select
                        className="form-input"
                        style={{ fontSize: '0.82rem' }}
                        value={etapaDestinoId}
                        onChange={(e) => {
                          const novaEtapaId = e.target.value;
                          setEtapaDestinoId(novaEtapaId);
                          const novaEtapa = obra.etapas.find((et) => et.id === novaEtapaId);
                          if (novaEtapa && novaEtapa.tarefas.length > 0) {
                            setTarefaDestinoId(novaEtapa.tarefas[0].id);
                          } else {
                            setTarefaDestinoId('');
                          }
                        }}
                      >
                        {obra.etapas.map((et, idx) => (
                          <option key={et.id} value={et.id}>
                            {idx + 1}. {et.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Serviço / Tarefa:</label>
                      {(() => {
                        const etapaSelecionada = obra.etapas.find((et) => et.id === etapaDestinoId);
                        const tarefas = etapaSelecionada?.tarefas || [];

                        return (
                          <select
                            className="form-input"
                            style={{ fontSize: '0.82rem' }}
                            value={tarefaDestinoId}
                            onChange={(e) => setTarefaDestinoId(e.target.value)}
                            disabled={tarefas.length === 0}
                          >
                            {tarefas.length === 0 ? (
                              <option value="">Nenhum serviço nesta etapa</option>
                            ) : (
                              tarefas.map((tar) => (
                                <option key={tar.id} value={tar.id}>
                                  {tar.nome}
                                </option>
                              ))
                            )}
                          </select>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Título (se geral) */}
                {destinoNovo === 'geral' && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>Título do anexo:</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: Entrega de Material, Vistoria Geral..."
                      value={tituloNovo}
                      onChange={(e) => setTituloNovo(e.target.value)}
                    />
                  </div>
                )}

                {/* Upload de Imagem ou Campo de Anotação */}
                {tipoNovo === 'foto' ? (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>Imagem:</label>
                    {fotoPreview ? (
                      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
                        <img
                          src={fotoPreview}
                          alt="Preview"
                          style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                        />
                        <button
                          type="button"
                          onClick={() => setFotoPreview(null)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            background: 'rgba(0,0,0,0.7)',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title="Remover foto"
                        >
                          <X size={13} weight="bold" />
                        </button>
                      </div>
                    ) : (
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '18px 12px',
                          border: '1.5px dashed var(--dark-coffee-200)',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: 'var(--dark-coffee-50)',
                          color: 'var(--primary-accent)',
                          fontSize: '0.84rem',
                          fontWeight: 600,
                        }}
                      >
                        <Camera size={18} weight="bold" />
                        <span>Selecionar ou tirar foto</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>Observação:</label>
                    <textarea
                      rows={3}
                      className="form-textarea"
                      placeholder="Descreva a observação técnica, alinhamento ou lembrete..."
                      value={conteudoNovo}
                      onChange={(e) => setConteudoNovo(e.target.value)}
                    />
                  </div>
                )}

                {formError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'var(--coral-glow-50)',
                      color: 'var(--coral-glow-700)',
                      border: '1px solid var(--coral-glow-200)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                    }}
                  >
                    {formError}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '12px 18px' }}>
                <button type="button" onClick={() => setModalNovoAberto(false)} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                  <Sparkle size={15} weight="fill" />
                  <span>Salvar Registro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
