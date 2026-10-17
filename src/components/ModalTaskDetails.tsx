import React, { useState, useRef, useEffect } from 'react';
import { Lightbox } from './Lightbox';
import { EmptyState } from './EmptyState';
// Ordem do CSS: index e foundation antes deste arquivo (App importa os componentes antes de main.tsx importar os CSS globais)
import '../index.css';
import '../styles/foundation.css';
import '../styles/decisoes-diario.css';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  X,
  Camera,
  NotePencil,
  Plus,
  Trash,
  CheckCircle,
  Clock,
  ArrowsOut,
  Images,
  CircleNotch,
} from '@phosphor-icons/react';
import { evidenciasApi } from '../services/api';
import { normalizeFile, releasePreview, storeNormalized, buildStoragePath } from '../utils/fileIntake';
import { Tarefa } from '../types/obra';
import { getTarefaStatus, STATUS_CRONOGRAMA_CONFIG } from '../utils/cronogramaStatus';

interface ModalTaskDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  obraId?: string;
  tarefa: Tarefa | null;
  etapaNome: string;
  etapaId: string;
  onUpdateTaskMedia?: (etapaId: string, tarefaId: string, fotos: string[], anotacoes: string[]) => void;
  isReadOnly?: boolean;
}

export const ModalTaskDetails: React.FC<ModalTaskDetailsProps> = ({
  isOpen,
  onClose,
  obraId,
  tarefa,
  etapaNome,
  etapaId,
  onUpdateTaskMedia,
  isReadOnly = false,
}) => {
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [uploadErro, setUploadErro] = useState('');
  const [activeTab, setActiveTab] = useState<'fotos' | 'notas'>('fotos');
  const [novaNota, setNovaNota] = useState('');
  const [isAddingNota, setIsAddingNota] = useState(false);
  const [lightboxFoto, setLightboxFoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escape: o lightbox (empilhado depois) fecha primeiro; depois o modal.
  useEscapeKey(onClose, isOpen);

  const canEdit = !isReadOnly && Boolean(onUpdateTaskMedia);

  if (!isOpen || !tarefa) return null;

  const fotos = tarefa.fotos || [];
  const anotacoes = tarefa.anotacoes || [];
  const temFotos = fotos.length > 0;
  const temNotas = anotacoes.length > 0;

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUpdateTaskMedia) {
      const fileList = Array.from(files);
      setIsUploadingFoto(true);
      setUploadErro('');
      try {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          const item = await normalizeFile(file);
          releasePreview(item);
          const path = buildStoragePath(`${obraId || 'obra'}/diario/${tarefa.id}_${Date.now()}_${i}`, item);
          uploadedUrls.push(await storeNormalized(item, { bucket: 'evidencias-diario', path }));
        }
        onUpdateTaskMedia(etapaId, tarefa.id, [...fotos, ...uploadedUrls], anotacoes);
      } catch (err) {
        console.error('Erro ao enviar fotos da tarefa:', err);
        setUploadErro('Não foi possível enviar as fotos. Verifique a conexão e tente novamente.');
      } finally {
        setIsUploadingFoto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleAddNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaNota.trim() || !onUpdateTaskMedia) return;
    const novasNotas = [...anotacoes, novaNota.trim()];
    onUpdateTaskMedia(etapaId, tarefa.id, fotos, novasNotas);
    setNovaNota('');
    setIsAddingNota(false);
  };

  const handleDeleteFoto = async (indexToDelete: number) => {
    if (!onUpdateTaskMedia) return;
    const fotoUrlToDelete = fotos[indexToDelete];
    const novasFotos = fotos.filter((_, idx) => idx !== indexToDelete);
    onUpdateTaskMedia(etapaId, tarefa.id, novasFotos, anotacoes);
    if (lightboxFoto === fotoUrlToDelete) {
      setLightboxFoto(null);
    }
    if (fotoUrlToDelete) {
      await evidenciasApi.deleteFoto(tarefa.id, fotoUrlToDelete);
    }
  };

  const handleDeleteNota = (indexToDelete: number) => {
    if (!onUpdateTaskMedia) return;
    const novasNotas = anotacoes.filter((_, idx) => idx !== indexToDelete);
    onUpdateTaskMedia(etapaId, tarefa.id, fotos, novasNotas);
  };

  const statusT = getTarefaStatus(tarefa);
  const configT = STATUS_CRONOGRAMA_CONFIG[statusT];

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-card modal-card--task task-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="task-modal-title"
        >
          <div className="modal-header">
            <div className="task-head">
              <div className="task-head-meta">
                <span className="timeline-badge">{etapaNome}</span>
                <span
                  className="task-status"
                  style={{ color: configT.corTexto, background: configT.corFundo, borderColor: configT.corBorda }}
                >
                  {statusT === 'concluido' ? (
                    <>
                      <CheckCircle size={12} weight="bold" />
                      <span>Concluída{tarefa.concluidaEm ? ` em ${formatarDataHora(tarefa.concluidaEm)}` : ''}</span>
                    </>
                  ) : statusT === 'em_andamento' ? (
                    <>
                      <Clock size={12} weight="bold" />
                      <span>Em andamento</span>
                    </>
                  ) : (
                    <span>Pendente</span>
                  )}
                </span>
              </div>
              <h2 id="task-modal-title" className="modal-title task-title">{tarefa.nome}</h2>
            </div>

            <button type="button" onClick={onClose} className="btn-icon" title="Fechar" aria-label="Fechar">
              <X size={18} weight="bold" />
            </button>
          </div>

          <div className="task-tabs" role="tablist" aria-label="Registros do serviço">
            <button
              type="button"
              role="tab"
              id="task-tab-fotos"
              aria-selected={activeTab === 'fotos'}
              aria-controls="task-panel"
              className="task-tab"
              onClick={() => setActiveTab('fotos')}
            >
              <Camera size={16} weight="bold" />
              <span>Fotos ({fotos.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              id="task-tab-notas"
              aria-selected={activeTab === 'notas'}
              aria-controls="task-panel"
              className="task-tab"
              onClick={() => setActiveTab('notas')}
            >
              <NotePencil size={16} weight="bold" />
              <span>Anotações ({anotacoes.length})</span>
            </button>
          </div>

          <div className="modal-body task-body" role="tabpanel" id="task-panel" aria-labelledby={`task-tab-${activeTab}`}>
            {activeTab === 'fotos' && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                {canEdit && (
                  <div className="task-actions">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFoto}
                      className="btn-secondary btn--sm"
                    >
                      {isUploadingFoto ? (
                        <>
                          <CircleNotch size={14} className="spin-animate" weight="bold" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} weight="bold" />
                          <span>Adicionar fotos</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {uploadErro && <div className="task-error" role="alert">{uploadErro}</div>}

                {temFotos ? (
                  <div className="task-grid">
                    {fotos.map((foto, idx) => (
                      <div key={idx} className="task-photo-thumb-container task-photo">
                        <button
                          type="button"
                          className="task-photo-open"
                          onClick={() => setLightboxFoto(foto)}
                          aria-label={`Ampliar foto ${idx + 1}`}
                        >
                          <img src={foto} alt={`Registro ${idx + 1}`} className="hover-zoom-img" />
                          <span className="thumb-hover-overlay" aria-hidden="true">
                            <ArrowsOut size={20} weight="bold" />
                          </span>
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            className="task-photo-remove"
                            onClick={() => handleDeleteFoto(idx)}
                            title="Remover foto"
                            aria-label={`Remover foto ${idx + 1}`}
                          >
                            <span><Trash size={14} /></span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Images} className="empty-state--nested" title="Nenhuma foto neste serviço." />
                )}
              </>
            )}

            {activeTab === 'notas' && (
              <>
                {canEdit && !isAddingNota && (
                  <div className="task-actions">
                    <button type="button" onClick={() => setIsAddingNota(true)} className="btn-secondary btn--sm">
                      <Plus size={14} weight="bold" />
                      <span>Nova anotação</span>
                    </button>
                  </div>
                )}

                {canEdit && isAddingNota && (
                  <form onSubmit={handleAddNota} className="task-note-form">
                    <textarea
                      autoFocus
                      rows={3}
                      className="form-textarea"
                      placeholder="Descreva a observação, medição ou ocorrência"
                      aria-label="Nova anotação"
                      value={novaNota}
                      onChange={(e) => setNovaNota(e.target.value)}
                    />
                    <div className="task-note-form-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNota(false);
                          setNovaNota('');
                        }}
                        className="btn-quiet"
                      >
                        Cancelar
                      </button>
                      <button type="submit" disabled={!novaNota.trim()} className="btn-primary">
                        Salvar anotação
                      </button>
                    </div>
                  </form>
                )}

                {temNotas ? (
                  <ul className="task-notes">
                    {anotacoes.map((nota, idx) => (
                      <li key={idx} className="task-note">
                        <p>{nota}</p>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNota(idx)}
                            className="btn-icon task-note-remove"
                            title="Excluir anotação"
                            aria-label={`Excluir anotação ${idx + 1}`}
                          >
                            <Trash size={16} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  !isAddingNota && (
                    <EmptyState icon={NotePencil} className="empty-state--nested" title="Nenhuma anotação neste serviço." />
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom em Tela Cheia da Foto */}
      {lightboxFoto && <Lightbox src={lightboxFoto} alt="Ampliada" onClose={() => setLightboxFoto(null)} />}
    </>
  );
};
