import React, { useState } from 'react';
import { Kanban, Scales, BookOpen, Plus, ArrowLeft, ShareNetwork, Blueprint, PencilSimple } from '@phosphor-icons/react';
import { Obra, AnexoItem, Tarefa, Etapa, Decisao, PerfilUsuario, PresetTipoObra, PunchListItem } from '../types/obra';
import * as T from '../utils/obraTransitions';
import { defaultTab } from '../utils/routeState';
import { ObraHeader } from './ObraHeader';
import { TimelineEtapas } from './TimelineEtapas';
import { VistoriaPunchList } from './VistoriaPunchList';
import { DecisoesTab } from './DecisoesTab';
import { DiarioObraTab } from './DiarioObraTab';
import { ProjetosTab } from './ProjetosTab';
import { ClientShareTab } from './ClientShareTab';
import { ModalEditObra } from './ModalEditObra';
import { ModalCreateEtapaWizard } from './ModalCreateEtapaWizard';
import { ModalAddMedia } from './ModalAddMedia';
import { ModalRelatorioObra } from './ModalRelatorioObra';
import { obrasApi, projetosApi, storageApi } from '../services/api';

const ModalPreviewRelatorio = React.lazy(() =>
  import('./ModalPreviewRelatorio').then((m) => ({ default: m.ModalPreviewRelatorio }))
);

interface ObraDetailProps {
  obra: Obra;
  onUpdateObra: (updatedObra: Obra) => void;
  showToast: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
  perfilAtivo?: PerfilUsuario;
  activeTab?: 'etapas' | 'projetos' | 'decisoes' | 'diario' | 'anexos' | 'compartilhar';
  onChangeTab?: (tab: 'etapas' | 'projetos' | 'decisoes' | 'diario' | 'anexos' | 'compartilhar') => void;
  onBackToObras?: () => void;
  onSwitchToClient?: () => void;
  templates?: PresetTipoObra[];
}

export const ObraDetail: React.FC<ObraDetailProps> = ({
  obra,
  onUpdateObra,
  showToast,
  perfilAtivo = 'construtor',
  activeTab: activeTabProp,
  onChangeTab,
  onBackToObras,
  onSwitchToClient,
  templates,
}) => {
  // Controle de Abas: 'etapas' | 'projetos' | 'decisoes' | 'diario' | 'anexos' | 'compartilhar'
  const [localActiveTab, setLocalActiveTab] = useState<'etapas' | 'projetos' | 'decisoes' | 'diario' | 'anexos' | 'compartilhar'>(
    defaultTab(perfilAtivo)
  );
  const rawActiveTab = activeTabProp || localActiveTab;
  const activeTab = rawActiveTab === 'anexos' ? 'diario' : rawActiveTab;

  const handleSelectTab = (tab: 'etapas' | 'projetos' | 'decisoes' | 'diario' | 'anexos' | 'compartilhar') => {
    const canonicalTab = tab === 'anexos' ? 'diario' : tab;
    setLocalActiveTab(canonicalTab);
    if (onChangeTab) onChangeTab(canonicalTab);
  };

  // Navegação direta para uma tarefa vinda de outra aba (ex: Anexos)
  const [targetTaskNavigation, setTargetTaskNavigation] = useState<{
    etapaId: string;
    tarefaId: string;
    timestamp: number;
  } | null>(null);

  const handleNavigateToTask = (etapaId: string, tarefaId: string) => {
    setTargetTaskNavigation({ etapaId, tarefaId, timestamp: Date.now() });
    handleSelectTab('etapas');
  };

  // Controle de Modais
  const [isEditObraOpen, setIsEditObraOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardInsertIndex, setWizardInsertIndex] = useState<number | null>(null);
  const [isRelatorioOpen, setIsRelatorioOpen] = useState(false);
  const [isPreviewRelatorioOpen, setIsPreviewRelatorioOpen] = useState(false);
  const [autoPrintRelatorio, setAutoPrintRelatorio] = useState(false);

  const handleEmitirRelatorio = () => {
    setAutoPrintRelatorio(true);
    setIsPreviewRelatorioOpen(true);
    showToast('Gerando Relatório...', 'Preparando visualização executiva e janela de impressão A4 / PDF.', 'info');
  };

  // Modal pós-conclusão de tarefa para foto/anotação
  const [mediaModalData, setMediaModalData] = useState<{
    tarefa: Tarefa;
    etapa: Etapa;
  } | null>(null);

  // --- Handlers de Obra ---
  const handleSaveObraInfo = (updatedData: {
    nome: string;
    cliente: string;
    endereco: string;
    dataPrevista: string;
    empresaResponsavel?: string;
    emailsClientes?: string[];
    clienteEmail?: string;
  }) => {
    onUpdateObra({
      ...obra,
      ...updatedData,
    });
    setIsEditObraOpen(false);
    showToast('Obra atualizada!', 'As informações principais foram salvas com sucesso.');
  };

  const nomeUsuarioAtivo = perfilAtivo === 'construtor' ? 'Engenheiro Responsável' : obra.cliente;

  // --- Handlers de Etapa ---
  const handleOpenWizard = (insertIndex: number | null = null) => {
    if (perfilAtivo === 'cliente') return;
    setWizardInsertIndex(insertIndex);
    setIsWizardOpen(true);
  };

  const handleAddEtapaFromWizard = (
    novaEtapaData: { nome: string; tarefas: { nome: string }[]; tipoOrigem?: string },
    insertIndex?: number | null
  ) => {
    if (perfilAtivo === 'cliente') return;
    onUpdateObra(T.adicionarEtapa(obra, novaEtapaData, insertIndex));
  };

  const handleDeleteEtapa = (etapaId: string) => {
    // Exclui imediatamente do Supabase e registra no tombstone
    obrasApi.deleteEtapa(etapaId).catch((err) => console.warn('Erro ao excluir etapa na nuvem:', err));
    onUpdateObra(T.removerEtapa(obra, etapaId));
  };

  const handleEditEtapaNome = (etapaId: string, novoNome: string) => {
    onUpdateObra(T.renomearEtapa(obra, etapaId, novoNome));
  };

  const handleReorderEtapas = (draggedIndex: number, targetIndex: number) => {
    if (draggedIndex === targetIndex) return;
    onUpdateObra(T.reordenarEtapas(obra, draggedIndex, targetIndex));
  };

  // --- Handlers de Tarefas ---
  const handleToggleTask = (etapaId: string, tarefaId: string) => {
    const r = T.alternarTarefa(obra, etapaId, tarefaId);
    onUpdateObra(r.obra);

    // Se marcou como concluída, dispara o modal perguntando se quer foto/anotação
    if (r.tarefaConcluida && r.etapaDaTarefa) {
      setMediaModalData({ tarefa: r.tarefaConcluida, etapa: r.etapaDaTarefa });
      if (r.obraConcluida) {
        showToast('Obra 100% Concluída!', 'Todas as etapas e serviços foram finalizados com êxito.');
      }
    }
  };

  const handleDeleteTask = (etapaId: string, tarefaId: string) => {
    // Exclui imediatamente do Supabase e registra no tombstone
    obrasApi.deleteTask(tarefaId).catch((err) => console.warn('Erro ao excluir tarefa na nuvem:', err));
    onUpdateObra(T.removerTarefa(obra, etapaId, tarefaId));
  };

  const handleEditTaskNome = (etapaId: string, tarefaId: string, novoNome: string) => {
    onUpdateObra(T.renomearTarefa(obra, etapaId, tarefaId, novoNome));
  };

  const handleEditTask = (etapaId: string, tarefaId: string, novoNome: string, novoAmbiente?: string) => {
    onUpdateObra(T.editarTarefa(obra, etapaId, tarefaId, novoNome, novoAmbiente));
  };

  const handleReorderTasks = (etapaId: string, draggedIndex: number, targetIndex: number) => {
    if (draggedIndex === targetIndex) return;
    onUpdateObra(T.reordenarTarefas(obra, etapaId, draggedIndex, targetIndex));
  };

  const handleAddTaskToEtapa = (etapaId: string, taskNome: string, insertAtIndex?: number, ambiente?: string) => {
    onUpdateObra(T.adicionarTarefa(obra, etapaId, taskNome, insertAtIndex, ambiente));
  };

  const handleCreateAgrupamento = (etapaId: string, nomeAgrupamento: string) => {
    const nomeTrim = nomeAgrupamento.trim();
    if (!nomeTrim) return;
    onUpdateObra(T.criarAgrupamento(obra, etapaId, nomeTrim));
    showToast('Agrupamento criado!', `Ambiente "${nomeTrim}" adicionado.`);
  };

  const handleRenameAgrupamento = (etapaId: string, nomeAntigo: string, novoNome: string) => {
    const novoTrim = novoNome.trim();
    if (!novoTrim || novoTrim === nomeAntigo) return;
    onUpdateObra(T.renomearAgrupamento(obra, etapaId, nomeAntigo, novoTrim));
    showToast('Agrupamento renomeado', `"${nomeAntigo}" agora é "${novoTrim}".`);
  };

  const handleDeleteAgrupamento = (etapaId: string, nomeAgrupamento: string) => {
    onUpdateObra(T.removerAgrupamento(obra, etapaId, nomeAgrupamento));
    showToast('Agrupamento removido', 'Os serviços foram movidos para "Sem agrupamento".', 'info');
  };

  const handleMoveTaskAgrupamento = (etapaId: string, tarefaId: string, novoAmbiente?: string) => {
    onUpdateObra(T.moverTarefaParaAgrupamento(obra, etapaId, tarefaId, novoAmbiente));
  };

  // --- Handlers de Mídia (Fotos e Anotações) ---
  const handleSaveMediaOnTask = (data: { fotoBase64?: string; fotosBase64?: string[]; anotacao?: string }) => {
    if (!mediaModalData) return;
    const { tarefa, etapa } = mediaModalData;
    onUpdateObra(T.adicionarMidiaNaTarefa(obra, etapa.id, tarefa.id, data));

    const qtdFotos = data.fotosBase64 && data.fotosBase64.length > 0 ? data.fotosBase64.length : data.fotoBase64 ? 1 : 0;
    let desc = 'Registro salvo com sucesso.';
    if (qtdFotos > 0 && data.anotacao) {
      desc = `${qtdFotos} ${qtdFotos === 1 ? 'foto' : 'fotos'} e observação registradas no Diário.`;
    } else if (qtdFotos > 0) {
      desc = `${qtdFotos} ${qtdFotos === 1 ? 'foto registrada' : 'fotos registradas'} no Diário.`;
    } else if (data.anotacao) {
      desc = 'Observação registrada no Diário.';
    }

    showToast('Registro salvo no Diário!', desc);
  };

  const handleUpdateTaskMedia = (etapaId: string, tarefaId: string, fotos: string[], anotacoes: string[]) => {
    onUpdateObra(T.definirMidiaDaTarefa(obra, etapaId, tarefaId, fotos, anotacoes));
  };

  const handleAddAnexoGeral = (novoAnexo: Omit<AnexoItem, 'id' | 'data'>) => {
    onUpdateObra(T.adicionarAnexoGeral(obra, novoAnexo));
    showToast('Anexo adicionado!', 'O item já está disponível na galeria.');
  };

  const handleDeleteAnexoGeral = (anexoId: string) => {
    const anexoAlvo = (obra.anexosGerais || []).find((a) => a.id === anexoId);
    if (anexoAlvo && anexoAlvo.tipo === 'foto' && anexoAlvo.conteudo) {
      storageApi.deleteFileFromUrl('evidencias-diario', anexoAlvo.conteudo);
    }
    onUpdateObra(T.removerAnexoGeral(obra, anexoId));
    showToast('Anexo removido', 'Item excluído da galeria.', 'info');
  };

  // --- Handlers de Decisões (prazo aplicado/revertido pelo módulo de transições) ---
  const handleAddDecisao = (novaDecisao: Decisao) => {
    onUpdateObra(T.proporDecisao(obra, novaDecisao));

    if (perfilAtivo === 'construtor') {
      showToast('Decisão Registrada!', 'O Cliente foi notificado e aguardamos sua assinatura digital.');
    } else {
      showToast('Decisão Proposta pelo Cliente!', 'O Construtor foi notificado para validar e assinar.');
    }
  };

  const handleAssinarDecisao = (decisaoId: string) => {
    onUpdateObra(T.assinarDecisao(obra, decisaoId, perfilAtivo, nomeUsuarioAtivo));
    showToast('Decisão Assinada por Ambos!', 'O acordo tem validade digital e ambas as partes concordaram.');
  };

  const handleRecusarDecisao = (decisaoId: string) => {
    onUpdateObra(T.recusarDecisao(obra, decisaoId, perfilAtivo));
    showToast('Decisão Recusada', 'A proposta foi recusada e a contraparte foi avisada para revisão.', 'warning');
  };

  // --- Handlers de Projetos em PDF ---
  const handleAddProjeto = (dados: T.DadosProjeto) => {
    onUpdateObra(T.adicionarProjeto(obra, dados, perfilAtivo, nomeUsuarioAtivo));
  };

  const handleDeleteProjeto = (projetoId: string) => {
    const projAlvo = (obra.projetos || []).find((p) => p.id === projetoId);
    onUpdateObra(T.removerProjeto(obra, projetoId));
    projetosApi.delete(projetoId, projAlvo?.url);
  };

  // --- Handler da Vistoria Final ---
  const handleUpdatePunchList = (newItems: PunchListItem[]) => {
    onUpdateObra(T.definirPunchList(obra, newItems));
  };

  // Contagem de decisões pendentes de assinatura do perfil atual
  const pendenciasDecisao = (obra.decisoes || []).filter(
    (d) => d.status === 'pendente' && d.criadaPor !== perfilAtivo
  ).length;

  return (
    <div>
      {/* Barra Superior: Navegação e Ação de Edição */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        {onBackToObras ? (
          <button
            type="button"
            onClick={onBackToObras}
            className="touch-target-44"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 12px',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: '#ffffff',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.borderColor = 'var(--border-strong)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-hairline)';
            }}
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Todas as Obras</span>
          </button>
        ) : (
          <div />
        )}

        {/* Ação de Edição da Obra (alinhada à direita, apenas ícone de lápis) */}
        {perfilAtivo === 'construtor' && (
          <button
            type="button"
            onClick={() => setIsEditObraOpen(true)}
            className="btn-icon"
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid var(--border-hairline)',
              background: '#ffffff',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--primary-accent)';
              e.currentTarget.style.borderColor = 'var(--primary-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-hairline)';
            }}
            title="Editar Obra"
            aria-label="Editar Obra"
          >
            <PencilSimple size={18} weight="bold" />
          </button>
        )}
      </div>

      {/* Header com Informações e Progresso */}
      <ObraHeader
        obra={obra}
        onOpenRelatorio={() => setIsRelatorioOpen(true)}
        perfilAtivo={perfilAtivo}
      />

      {/* Navegação por Abas:
          Construtor: Etapas -> Arquivos -> Decisões -> Diário -> Compartilhar
          Cliente: Diário -> Etapas -> Arquivos -> Decisões -> Compartilhar
      */}
      <nav className="tabs-nav" aria-label="Abas da Obra">
        {(perfilAtivo === 'cliente'
          ? (['diario', 'etapas', 'projetos', 'decisoes', 'compartilhar'] as const)
          : (['etapas', 'projetos', 'decisoes', 'diario', 'compartilhar'] as const)
        ).map((tabKey) => {
          if (tabKey === 'diario') {
            return (
              <button
                key="diario"
                className={`tab-btn ${activeTab === 'diario' ? 'active' : ''}`}
                onClick={() => handleSelectTab('diario')}
              >
                <BookOpen size={20} weight={activeTab === 'diario' ? 'fill' : 'bold'} />
                <span>Diário</span>
              </button>
            );
          }
          if (tabKey === 'etapas') {
            return (
              <button
                key="etapas"
                className={`tab-btn ${activeTab === 'etapas' ? 'active' : ''}`}
                onClick={() => handleSelectTab('etapas')}
              >
                <Kanban size={20} weight={activeTab === 'etapas' ? 'fill' : 'bold'} />
                <span>Etapas</span>
              </button>
            );
          }
          if (tabKey === 'projetos') {
            return (
              <button
                key="projetos"
                className={`tab-btn ${activeTab === 'projetos' ? 'active' : ''}`}
                onClick={() => handleSelectTab('projetos')}
              >
                <Blueprint size={20} weight={activeTab === 'projetos' ? 'fill' : 'bold'} />
                <span>Arquivos</span>
              </button>
            );
          }
          if (tabKey === 'decisoes') {
            return (
              <button
                key="decisoes"
                className={`tab-btn ${activeTab === 'decisoes' ? 'active' : ''}`}
                onClick={() => handleSelectTab('decisoes')}
                style={{ position: 'relative' }}
              >
                <Scales size={20} weight={activeTab === 'decisoes' ? 'fill' : 'bold'} />
                <span>Decisões e Aprovações</span>
                {pendenciasDecisao > 0 && (
                  <span
                    style={{
                      marginLeft: 4,
                      background: 'var(--coral-glow-500)',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 10,
                    }}
                  >
                    {pendenciasDecisao}
                  </span>
                )}
              </button>
            );
          }
          if (tabKey === 'compartilhar') {
            return (
              <button
                key="compartilhar"
                className={`tab-btn ${activeTab === 'compartilhar' ? 'active' : ''}`}
                onClick={() => handleSelectTab('compartilhar')}
              >
                <ShareNetwork size={20} weight={activeTab === 'compartilhar' ? 'fill' : 'bold'} />
                <span>Compartilhar</span>
              </button>
            );
          }
          return null;
        })}
      </nav>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === 'etapas' && (
        <>
          <TimelineEtapas
            obra={obra}
            onOpenWizard={handleOpenWizard}
            onToggleTask={handleToggleTask}
            onDeleteEtapa={handleDeleteEtapa}
            onEditEtapaNome={handleEditEtapaNome}
            onReorderEtapas={handleReorderEtapas}
            onDeleteTask={handleDeleteTask}
            onEditTaskNome={handleEditTaskNome}
            onEditTask={handleEditTask}
            onReorderTasks={handleReorderTasks}
            onAddTaskToEtapa={handleAddTaskToEtapa}
            onCreateAgrupamento={handleCreateAgrupamento}
            onRenameAgrupamento={handleRenameAgrupamento}
            onDeleteAgrupamento={handleDeleteAgrupamento}
            onMoveTaskAgrupamento={handleMoveTaskAgrupamento}
            onUpdateTaskMedia={handleUpdateTaskMedia}
            isReadOnly={perfilAtivo === 'cliente'}
            targetTaskNavigation={targetTaskNavigation}
          />

          <div style={{ marginTop: 28 }}>
            <VistoriaPunchList
              punchList={obra.punchList || []}
              onUpdatePunchList={handleUpdatePunchList}
              perfilAtivo={perfilAtivo}
              clienteNome={obra.cliente}
              showToast={showToast}
            />
          </div>
        </>
      )}

      {activeTab === 'projetos' && (
        <ProjetosTab
          obra={obra}
          perfilAtivo={perfilAtivo}
          onAddProjeto={handleAddProjeto}
          onDeleteProjeto={handleDeleteProjeto}
          showToast={showToast}
        />
      )}

      {activeTab === 'decisoes' && (
        <DecisoesTab
          obra={obra}
          perfilAtivo={perfilAtivo}
          nomeUsuario={perfilAtivo === 'construtor' ? 'Engenheiro Responsável' : obra.cliente}
          onAddDecisao={handleAddDecisao}
          onAssinarDecisao={handleAssinarDecisao}
          onRecusarDecisao={handleRecusarDecisao}
        />
      )}

      {activeTab === 'diario' && (
        <DiarioObraTab
          obra={obra}
          perfilAtivo={perfilAtivo}
          onAddAnexoGeral={handleAddAnexoGeral}
          onDeleteAnexo={handleDeleteAnexoGeral}
          onNavigateToTask={handleNavigateToTask}
          onNavigateToDecisoes={() => handleSelectTab('decisoes')}
          onUpdateTaskMedia={handleUpdateTaskMedia}
        />
      )}

      {activeTab === 'compartilhar' && (
        <ClientShareTab
          obra={obra}
          onSwitchToClient={onSwitchToClient}
          onEditObra={() => setIsEditObraOpen(true)}
          showToast={showToast}
        />
      )}

      {/* Modais */}
      <ModalEditObra
        isOpen={isEditObraOpen}
        obra={obra}
        onClose={() => setIsEditObraOpen(false)}
        onSave={handleSaveObraInfo}
      />

      <ModalCreateEtapaWizard
        isOpen={isWizardOpen && perfilAtivo !== 'cliente'}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardInsertIndex(null);
        }}
        insertAtIndex={wizardInsertIndex}
        templates={templates}
        onAddEtapa={handleAddEtapaFromWizard}
      />

      {mediaModalData && (
        <ModalAddMedia
          isOpen={true}
          tarefa={mediaModalData.tarefa}
          etapa={mediaModalData.etapa}
          onClose={() => setMediaModalData(null)}
          onSaveMedia={handleSaveMediaOnTask}
        />
      )}

      <ModalRelatorioObra
        isOpen={isRelatorioOpen}
        onClose={() => setIsRelatorioOpen(false)}
        obra={obra}
        onUpdateObra={onUpdateObra}
        showToast={showToast}
        onEmitirRelatorio={handleEmitirRelatorio}
      />

      {isPreviewRelatorioOpen && (
        <React.Suspense fallback={null}>
          <ModalPreviewRelatorio
            isOpen={isPreviewRelatorioOpen}
            onClose={() => setIsPreviewRelatorioOpen(false)}
            obra={obra}
            autoPrint={autoPrintRelatorio}
          />
        </React.Suspense>
      )}
    </div>
  );
};
