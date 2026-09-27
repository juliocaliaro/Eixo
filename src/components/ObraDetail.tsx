import React, { useState } from 'react';
import { Kanban, Scales, Image as ImageIcon, Plus, ArrowLeft, ShareNetwork, Blueprint } from '@phosphor-icons/react';
import { Obra, AnexoItem, Tarefa, Etapa, Decisao, PerfilUsuario, PresetTipoObra, ProjetoPDF, TipoProjeto } from '../types/obra';
import { ObraHeader } from './ObraHeader';
import { TimelineEtapas } from './TimelineEtapas';
import { DecisoesTab } from './DecisoesTab';
import { AnexosTab } from './AnexosTab';
import { ProjetosTab } from './ProjetosTab';
import { ClientShareTab } from './ClientShareTab';
import { ModalEditObra } from './ModalEditObra';
import { ModalCreateEtapaWizard } from './ModalCreateEtapaWizard';
import { ModalAddMedia } from './ModalAddMedia';

interface ObraDetailProps {
  obra: Obra;
  onUpdateObra: (updatedObra: Obra) => void;
  showToast: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
  perfilAtivo?: PerfilUsuario;
  activeTab?: 'etapas' | 'decisoes' | 'projetos' | 'anexos' | 'compartilhar';
  onChangeTab?: (tab: 'etapas' | 'decisoes' | 'projetos' | 'anexos' | 'compartilhar') => void;
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
  // Controle de Abas: 'etapas' | 'decisoes' | 'projetos' | 'anexos' | 'compartilhar'
  const [localActiveTab, setLocalActiveTab] = useState<'etapas' | 'decisoes' | 'projetos' | 'anexos' | 'compartilhar'>('etapas');
  const activeTab = activeTabProp || localActiveTab;

  const handleSelectTab = (tab: 'etapas' | 'decisoes' | 'projetos' | 'anexos' | 'compartilhar') => {
    setLocalActiveTab(tab);
    if (onChangeTab) onChangeTab(tab);
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
  }) => {
    onUpdateObra({
      ...obra,
      ...updatedData,
    });
    setIsEditObraOpen(false);
    showToast('Obra atualizada!', 'As informações principais foram salvas com sucesso.');
  };

  // --- Handlers de Etapa ---
  const handleOpenWizard = (insertIndex: number | null = null) => {
    setWizardInsertIndex(insertIndex);
    setIsWizardOpen(true);
  };

  const handleAddEtapaFromWizard = (
    novaEtapaData: { nome: string; tarefas: { nome: string }[]; tipoOrigem?: string },
    insertIndex?: number | null
  ) => {
    const novaEtapa: Etapa = {
      id: `etapa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nome: novaEtapaData.nome,
      tipoOrigem: novaEtapaData.tipoOrigem,
      tarefas: novaEtapaData.tarefas.map((t, idx) => ({
        id: `task_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        nome: t.nome,
        concluida: false,
      })),
    };

    let updatedEtapas = [...obra.etapas];
    if (insertIndex !== null && insertIndex !== undefined && insertIndex >= 0) {
      updatedEtapas.splice(insertIndex, 0, novaEtapa);
    } else {
      updatedEtapas.push(novaEtapa);
    }

    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });
  };

  const handleDeleteEtapa = (etapaId: string) => {
    const updatedEtapas = obra.etapas.filter((e) => e.id !== etapaId);
    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });
  };

  const handleEditEtapaNome = (etapaId: string, novoNome: string) => {
    const updatedEtapas = obra.etapas.map((e) =>
      e.id === etapaId ? { ...e, nome: novoNome } : e
    );
    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });
  };

  const handleReorderEtapas = (draggedIndex: number, targetIndex: number) => {
    if (draggedIndex === targetIndex) return;
    const updatedEtapas = [...obra.etapas];
    const [moved] = updatedEtapas.splice(draggedIndex, 1);
    updatedEtapas.splice(targetIndex, 0, moved);
    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });
  };

  // --- Handlers de Tarefas ---
  const handleToggleTask = (etapaId: string, tarefaId: string) => {
    let tarefaConcluidaAgora: Tarefa | null = null;
    let etapaDaTarefa: Etapa | null = null;

    const updatedEtapas = obra.etapas.map((e) => {
      if (e.id !== etapaId) return e;
      etapaDaTarefa = e;
      const updatedTarefas = e.tarefas.map((t) => {
        if (t.id === tarefaId) {
          const novoStatus = !t.concluida;
          const tarefaAtualizada = {
            ...t,
            concluida: novoStatus,
            concluidaEm: novoStatus ? new Date().toISOString() : undefined,
          };
          if (novoStatus) {
            tarefaConcluidaAgora = tarefaAtualizada;
          }
          return tarefaAtualizada;
        }
        return t;
      });

      // Checa se todas as tarefas da etapa foram concluídas para registrar data e hora
      const todasTarefasFeitas = updatedTarefas.length > 0 && updatedTarefas.every((t) => t.concluida);
      const etapaConcluidaEm = todasTarefasFeitas
        ? (e.concluidaEm || new Date().toISOString())
        : undefined;

      return {
        ...e,
        tarefas: updatedTarefas,
        concluida: todasTarefasFeitas,
        concluidaEm: etapaConcluidaEm,
      };
    });

    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });

    // Se marcou como concluída, dispara o modal perguntando se quer foto/anotação
    if (tarefaConcluidaAgora && etapaDaTarefa) {
      setMediaModalData({
        tarefa: tarefaConcluidaAgora,
        etapa: etapaDaTarefa,
      });

      // Checa se a obra inteira atingiu 100% de conclusão para toast especial!
      const todas = updatedEtapas.flatMap((et) => et.tarefas);
      if (todas.length > 0 && todas.every((t) => t.concluida)) {
        showToast('Obra 100% Concluída!', 'Todas as etapas e serviços foram finalizados com êxito.');
      }
    }
  };

  const handleDeleteTask = (etapaId: string, tarefaId: string) => {
    const updatedEtapas = obra.etapas.map((e) => {
      if (e.id !== etapaId) return e;
      return {
        ...e,
        tarefas: e.tarefas.filter((t) => t.id !== tarefaId),
      };
    });
    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });
  };

  const handleEditTaskNome = (etapaId: string, tarefaId: string, novoNome: string) => {
    const updatedEtapas = obra.etapas.map((e) => {
      if (e.id !== etapaId) return e;
      return {
        ...e,
        tarefas: e.tarefas.map((t) => (t.id === tarefaId ? { ...t, nome: novoNome } : t)),
      };
    });
    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });
  };

  const handleReorderTasks = (etapaId: string, draggedIndex: number, targetIndex: number) => {
    if (draggedIndex === targetIndex) return;
    const updatedEtapas = obra.etapas.map((e) => {
      if (e.id !== etapaId) return e;
      const tarefas = [...e.tarefas];
      const [moved] = tarefas.splice(draggedIndex, 1);
      tarefas.splice(targetIndex, 0, moved);
      return { ...e, tarefas };
    });

    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });
  };

  const handleAddTaskToEtapa = (etapaId: string, taskNome: string, insertAtIndex?: number) => {
    const novaTarefa: Tarefa = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nome: taskNome,
      concluida: false,
    };

    const updatedEtapas = obra.etapas.map((e) => {
      if (e.id !== etapaId) return e;
      const tarefas = [...e.tarefas];
      if (insertAtIndex !== undefined && insertAtIndex >= 0) {
        tarefas.splice(insertAtIndex, 0, novaTarefa);
      } else {
        tarefas.push(novaTarefa);
      }
      return { ...e, tarefas };
    });

    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });
  };


  // --- Handlers de Mídia (Fotos e Anotações) ---
  const handleSaveMediaOnTask = (data: { fotoBase64?: string; fotosBase64?: string[]; anotacao?: string }) => {
    if (!mediaModalData) return;
    const { tarefa, etapa } = mediaModalData;

    const fotosToAdd = data.fotosBase64 && data.fotosBase64.length > 0
      ? data.fotosBase64
      : data.fotoBase64
        ? [data.fotoBase64]
        : [];

    const updatedEtapas = obra.etapas.map((e) => {
      if (e.id !== etapa.id) return e;
      const tarefas = e.tarefas.map((t) => {
        if (t.id !== tarefa.id) return t;
        const fotos = t.fotos ? [...t.fotos, ...fotosToAdd] : [...fotosToAdd];
        const anotacoes = t.anotacoes ? [...t.anotacoes] : [];
        if (data.anotacao) anotacoes.push(data.anotacao);
        return {
          ...t,
          fotos,
          anotacoes,
        };
      });
      return { ...e, tarefas };
    });

    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });

    const qtdFotos = fotosToAdd.length;
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
    const updatedEtapas = obra.etapas.map((e) => {
      if (e.id !== etapaId) return e;
      const tarefas = e.tarefas.map((t) => {
        if (t.id !== tarefaId) return t;
        return {
          ...t,
          fotos,
          anotacoes,
        };
      });
      return { ...e, tarefas };
    });

    onUpdateObra({
      ...obra,
      etapas: updatedEtapas,
    });
  };

  const handleAddAnexoGeral = (novoAnexo: Omit<AnexoItem, 'id' | 'data'>) => {
    const item: AnexoItem = {
      ...novoAnexo,
      id: `anexo_geral_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      data: new Date().toISOString(),
    };

    onUpdateObra({
      ...obra,
      anexosGerais: [...(obra.anexosGerais || []), item],
    });

    showToast('Anexo adicionado!', 'O item já está disponível na galeria.');
  };

  const handleDeleteAnexoGeral = (anexoId: string) => {
    onUpdateObra({
      ...obra,
      anexosGerais: (obra.anexosGerais || []).filter((a) => a.id !== anexoId),
    });
    showToast('Anexo removido', 'Item excluído da galeria.', 'info');
  };

  // --- Handlers de Decisões ---
  const handleAddDecisao = (novaDecisao: Decisao) => {
    const updatedDecisoes = [novaDecisao, ...(obra.decisoes || [])];
    onUpdateObra({
      ...obra,
      decisoes: updatedDecisoes,
    });

    if (perfilAtivo === 'construtor') {
      showToast('Decisão Registrada!', 'O Cliente foi notificado e aguardamos sua assinatura digital.');
    } else {
      showToast('Decisão Proposta pelo Cliente!', 'O Construtor foi notificado para validar e assinar.');
    }
  };

  const handleAssinarDecisao = (decisaoId: string) => {
    const agora = new Date().toISOString();
    const nomeSignatario = perfilAtivo === 'construtor' ? 'Engenheiro Responsável' : obra.cliente;

    const updatedDecisoes = (obra.decisoes || []).map((d) => {
      if (d.id !== decisaoId) return d;
      return {
        ...d,
        status: 'aprovada' as const,
        assinaturaContraparte: {
          autor: perfilAtivo,
          nomeSignatario,
          assinadoEm: agora,
        },
      };
    });

    onUpdateObra({
      ...obra,
      decisoes: updatedDecisoes,
    });

    showToast('Decisão Assinada por Ambos!', 'O acordo tem validade digital e ambas as partes concordaram.');
  };

  const handleRecusarDecisao = (decisaoId: string) => {
    const updatedDecisoes = (obra.decisoes || []).map((d) => {
      if (d.id !== decisaoId) return d;
      return {
        ...d,
        status: 'recusada' as const,
      };
    });

    onUpdateObra({
      ...obra,
      decisoes: updatedDecisoes,
    });

    showToast('Decisão Recusada', 'A proposta foi recusada e a contraparte foi avisada para revisão.', 'warning');
  };

  // --- Handlers de Projetos em PDF ---
  const handleAddProjeto = (dados: {
    titulo: string;
    tipo: TipoProjeto;
    tipoCustomizado?: string;
    arquivoNome: string;
    tamanhoBytes: number;
    url: string;
    versao?: string;
    descricao?: string;
  }) => {
    const novoProjeto: ProjetoPDF = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      titulo: dados.titulo,
      tipo: dados.tipo,
      tipoCustomizado: dados.tipoCustomizado,
      arquivoNome: dados.arquivoNome,
      tamanhoBytes: dados.tamanhoBytes,
      dataUpload: new Date().toISOString(),
      enviadoPor: perfilAtivo,
      enviadoPorNome: perfilAtivo === 'construtor' ? 'Engenheiro Responsável' : obra.cliente,
      url: dados.url,
      versao: dados.versao,
      descricao: dados.descricao,
    };

    const updatedProjetos = [novoProjeto, ...(obra.projetos || [])];
    onUpdateObra({
      ...obra,
      projetos: updatedProjetos,
    });
  };

  const handleDeleteProjeto = (projetoId: string) => {
    const updatedProjetos = (obra.projetos || []).filter((p) => p.id !== projetoId);
    onUpdateObra({
      ...obra,
      projetos: updatedProjetos,
    });
  };

  // Contagem de decisões pendentes de assinatura do perfil atual
  const pendenciasDecisao = (obra.decisoes || []).filter(
    (d) => d.status === 'pendente' && d.criadaPor !== perfilAtivo
  ).length;

  return (
    <div>
      {/* Botão Voltar no Corpo da Página */}
      {onBackToObras && (
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={onBackToObras}
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
        </div>
      )}

      {/* Header com Informações, Progresso e Botão de Editar */}
      <ObraHeader
        obra={obra}
        onEdit={() => setIsEditObraOpen(true)}
        perfilAtivo={perfilAtivo}
      />

      {/* Navegação por Abas: Etapas, Decisões, Anexos, Link do Cliente */}
      <nav className="tabs-nav" aria-label="Abas da Obra">
        <button
          className={`tab-btn ${activeTab === 'etapas' ? 'active' : ''}`}
          onClick={() => handleSelectTab('etapas')}
        >
          <Kanban size={20} weight={activeTab === 'etapas' ? 'fill' : 'bold'} />
          <span>Etapas & Cronograma</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'decisoes' ? 'active' : ''}`}
          onClick={() => handleSelectTab('decisoes')}
          style={{ position: 'relative' }}
        >
          <Scales size={20} weight={activeTab === 'decisoes' ? 'fill' : 'bold'} />
          <span>Decisões & Aprovações</span>
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

        <button
          className={`tab-btn ${activeTab === 'projetos' ? 'active' : ''}`}
          onClick={() => handleSelectTab('projetos')}
        >
          <Blueprint size={20} weight={activeTab === 'projetos' ? 'fill' : 'bold'} />
          <span>Projetos (PDF)</span>
          {(obra.projetos || []).length > 0 && (
            <span
              style={{
                marginLeft: 4,
                background: 'var(--dark-coffee-100)',
                color: 'var(--dark-coffee-800)',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: 10,
              }}
            >
              {obra.projetos!.length}
            </span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'anexos' ? 'active' : ''}`}
          onClick={() => handleSelectTab('anexos')}
        >
          <ImageIcon size={20} weight={activeTab === 'anexos' ? 'fill' : 'bold'} />
          <span>Anexos & Diário</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'compartilhar' ? 'active' : ''}`}
          onClick={() => handleSelectTab('compartilhar')}
        >
          <ShareNetwork size={20} weight={activeTab === 'compartilhar' ? 'fill' : 'bold'} />
          <span>Link do Cliente</span>
        </button>
      </nav>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === 'etapas' && (
        <TimelineEtapas
          obra={obra}
          onOpenWizard={handleOpenWizard}
          onToggleTask={handleToggleTask}
          onDeleteEtapa={handleDeleteEtapa}
          onEditEtapaNome={handleEditEtapaNome}
          onReorderEtapas={handleReorderEtapas}
          onDeleteTask={handleDeleteTask}
          onEditTaskNome={handleEditTaskNome}
          onReorderTasks={handleReorderTasks}
          onAddTaskToEtapa={handleAddTaskToEtapa}
          onUpdateTaskMedia={handleUpdateTaskMedia}
          isReadOnly={perfilAtivo === 'cliente'}
          targetTaskNavigation={targetTaskNavigation}
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

      {activeTab === 'projetos' && (
        <ProjetosTab
          obra={obra}
          perfilAtivo={perfilAtivo}
          onAddProjeto={handleAddProjeto}
          onDeleteProjeto={handleDeleteProjeto}
          showToast={showToast}
        />
      )}

      {activeTab === 'anexos' && (
        <AnexosTab
          obra={obra}
          perfilAtivo={perfilAtivo}
          onAddAnexoGeral={handleAddAnexoGeral}
          onDeleteAnexo={handleDeleteAnexoGeral}
          onNavigateToTask={handleNavigateToTask}
          onUpdateTaskMedia={handleUpdateTaskMedia}
        />
      )}

      {activeTab === 'compartilhar' && (
        <ClientShareTab
          obra={obra}
          onSwitchToClient={onSwitchToClient}
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
        isOpen={isWizardOpen}
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
    </div>
  );
};
