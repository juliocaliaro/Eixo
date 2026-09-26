import React, { useState, useEffect } from 'react';
import { Obra, ToastMessage, ToastType, PerfilUsuario, PresetTipoObra } from './types/obra';
import { loadObrasFromStorage, saveObrasToStorage, loadTemplatesFromStorage, saveTemplatesToStorage } from './utils/storage';
import { Navbar } from './components/Navbar';
import { ObraList } from './components/ObraList';
import { ObraDetail } from './components/ObraDetail';
import { ModalCreateObra } from './components/ModalCreateObra';
import { ConfigTemplatesPage } from './components/ConfigTemplatesPage';
import { ToastContainer } from './components/Toast';

export const App: React.FC = () => {
  const [obras, setObras] = useState<Obra[]>(() => loadObrasFromStorage());
  const [templates, setTemplates] = useState<PresetTipoObra[]>(() => loadTemplatesFromStorage());
  const [currentObraId, setCurrentObraId] = useState<string | null>(null);
  const [isCreateObraOpen, setIsCreateObraOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [perfilAtivo, setPerfilAtivo] = useState<PerfilUsuario>('construtor');
  const [activeTab, setActiveTab] = useState<'etapas' | 'decisoes' | 'projetos' | 'anexos' | 'compartilhar'>('etapas');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sincronizar parâmetros de URL (ex: ?perfil=cliente&obra=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const perfilParam = params.get('perfil');
      const obraParam = params.get('obra');

      if (perfilParam === 'cliente' || perfilParam === 'construtor') {
        setPerfilAtivo(perfilParam);
      }
      if (obraParam) {
        setCurrentObraId(obraParam);
      }
    } catch {}
  }, []);

  // Salvar no localStorage sempre que obras mudarem
  useEffect(() => {
    saveObrasToStorage(obras);
  }, [obras]);

  // Função para exibir Toast notification
  const showToast = (
    titulo: string,
    descricao?: string,
    tipo: ToastType = 'success'
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, titulo, descricao, tipo };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss após 4.2 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Atualizar modelos padrão de etapas e tarefas
  const handleUpdateTemplates = (updated: PresetTipoObra[]) => {
    setTemplates(updated);
    saveTemplatesToStorage(updated);
  };

  // Criar nova obra
  const handleCreateObra = (dados: {
    nome: string;
    cliente: string;
    endereco: string;
    dataPrevista: string;
  }) => {
    const novaObra: Obra = {
      id: `obra_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nome: dados.nome,
      cliente: dados.cliente,
      endereco: dados.endereco,
      dataPrevista: dados.dataPrevista,
      criadaEm: new Date().toISOString(),
      etapas: [],
      anexosGerais: [],
    };

    const updated = [novaObra, ...obras];
    setObras(updated);
    setIsCreateObraOpen(false);
    // Já entra diretamente nos detalhes da obra recém criada!
    setCurrentObraId(novaObra.id);

    showToast(
      'Obra criada com sucesso!',
      `Bem-vindo ao diário de "${novaObra.nome}". Adicione sua primeira etapa.`
    );
  };

  // Atualizar dados de uma obra existente
  const handleUpdateObra = (updatedObra: Obra) => {
    setObras((prev) => prev.map((o) => (o.id === updatedObra.id ? updatedObra : o)));
  };

  // Carregar Obra de Demonstração (atende o exemplo exato: 2 etapas com 2 tarefas cada = 25% por tarefa)
  const handleLoadDemo = () => {
    const demoObra: Obra = {
      id: `obra_demo_${Date.now()}`,
      nome: 'Reforma Apto 402 - Jardins',
      cliente: 'Dra. Carolina Mendes',
      endereco: 'Alameda Santos, 1820 - Apto 402, São Paulo - SP',
      dataPrevista: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      criadaEm: new Date().toISOString(),
      etapas: [
        {
          id: 'etapa_demo_1',
          nome: 'Isolamento e Preparação',
          tipoOrigem: 'Reforma',
          tarefas: [
            {
              id: 'task_demo_1',
              nome: 'Proteção de elevadores e áreas comuns.',
              concluida: true,
              concluidaEm: new Date().toISOString(),
              fotos: [
                'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&auto=format&fit=crop&q=60',
              ],
              anotacoes: ['Piso do elevador forrado com plástico bolha e chapas de eucatex.'],
            },
            {
              id: 'task_demo_2',
              nome: 'Proteção do piso existente (se for mantido).',
              concluida: false,
            },
          ],
        },
        {
          id: 'etapa_demo_2',
          nome: 'Demolição',
          tipoOrigem: 'Reforma',
          tarefas: [
            {
              id: 'task_demo_3',
              nome: 'Demolição de alvenarias, pisos e revestimentos.',
              concluida: false,
            },
            {
              id: 'task_demo_4',
              nome: 'Ensacamento e descarte de entulho.',
              concluida: false,
            },
          ],
        },
      ],
      anexosGerais: [],
      decisoes: [
        {
          id: 'decisao_demo_1',
          titulo: 'Aprovação do Porcelanato Acetinado 90x90 (Sala e Cozinha)',
          descricao: 'Confirmada a escolha do modelo Portobello Bianco di Lucca 90x90 retificado com junta de 1,5mm e acabamento acetinado para área social.',
          categoria: 'acabamento',
          impactoFinanceiro: 1250,
          impactoPrazoDias: 0,
          criadaPor: 'construtor',
          criadorNome: 'Eng. Roberto Albuquerque',
          criadaEm: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
          status: 'aprovada',
          assinaturaCriador: {
            autor: 'construtor',
            nomeSignatario: 'Eng. Roberto Albuquerque',
            assinadoEm: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
          },
          assinaturaContraparte: {
            autor: 'cliente',
            nomeSignatario: 'Dra. Carolina Mendes (Cliente)',
            assinadoEm: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          },
          fotos: [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=60',
          ],
        },
        {
          id: 'decisao_demo_2',
          titulo: 'Definição da Cor da Parede de Destaque da Varanda',
          descricao: 'Cliente solicitou aplicação da tinta Suvinil cor "Toque de Luz" fosco na parede dos fundos da varanda gourmet, em vez do acabamento padrão.',
          categoria: 'acabamento',
          impactoFinanceiro: 320,
          impactoPrazoDias: 1,
          criadaPor: 'cliente',
          criadorNome: 'Dra. Carolina Mendes (Cliente)',
          criadaEm: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
          status: 'pendente',
          assinaturaCriador: {
            autor: 'cliente',
            nomeSignatario: 'Dra. Carolina Mendes (Cliente)',
            assinadoEm: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
          },
          fotos: [
            'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=60',
          ],
        },
      ],
      projetos: [
        {
          id: 'proj_demo_1',
          titulo: 'Planta de Demolição e Fechamentos em Alvenaria',
          tipo: 'demolicao',
          arquivoNome: 'Prancha_01_Demolicao_Layout_R02.pdf',
          tamanhoBytes: 1480000,
          dataUpload: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          enviadoPor: 'construtor',
          enviadoPorNome: 'Eng. Roberto Albuquerque',
          versao: 'Rev. 02',
          descricao: 'Indicação das paredes a demolir entre sala e cozinha e ampliação da suíte máster.',
          url: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA2MTIgNzkyXS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDw+Pj4+ZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDUyIDAwMDAwIG4gCjAwMDAwMDAxMDEgMDAwMDAgbiAKdHJhaWxlcjw8L1NpemUgNC9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjE3OAolJUVPRg==',
        },
        {
          id: 'proj_demo_2',
          titulo: 'Diagrama Unifilar e Pontos de Iluminação / Força',
          tipo: 'eletrico',
          arquivoNome: 'Projeto_Eletrico_Executivo_Final.pdf',
          tamanhoBytes: 2250000,
          dataUpload: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          enviadoPor: 'construtor',
          enviadoPorNome: 'Eng. Roberto Albuquerque',
          versao: 'Final Executivo',
          descricao: 'Circuito de tomadas da ilha, pontos 220V do cooktop e fita LED dos cortineiros.',
          url: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA2MTIgNzkyXS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDw+Pj4+ZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDUyIDAwMDAwIG4gCjAwMDAwMDAxMDEgMDAwMDAgbiAKdHJhaWxlcjw8L1NpemUgNC9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjE3OAolJUVPRg==',
        },
        {
          id: 'proj_demo_3',
          titulo: 'Prumada Hidráulica e Isométrico dos Banheiros',
          tipo: 'hidraulico',
          arquivoNome: 'Projeto_Hidraulico_Apto402_R01.pdf',
          tamanhoBytes: 1890000,
          dataUpload: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
          enviadoPor: 'cliente',
          enviadoPorNome: 'Dra. Carolina Mendes (Cliente)',
          versao: 'Rev. 01',
          descricao: 'Desvio de tubulação de água fria e rebaixamento do ralo linear.',
          url: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA2MTIgNzkyXS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDw+Pj4+ZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDUyIDAwMDAwIG4gCjAwMDAwMDAxMDEgMDAwMDAgbiAKdHJhaWxlcjw8L1NpemUgNC9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjE3OAolJUVPRg==',
        },
      ],
    };

    setObras([demoObra, ...obras]);
    setCurrentObraId(demoObra.id);
    showToast('Obra de Exemplo Carregada!', 'Explore as etapas, decisões e a nova aba de Projetos (PDF).');
  };

  // Excluir obra
  const handleDeleteObra = (obraId: string) => {
    setObras((prev) => prev.filter((o) => o.id !== obraId));
    if (currentObraId === obraId) {
      setCurrentObraId(null);
    }
  };

  // Obra atualmente aberta
  const currentObra = obras.find((o) => o.id === currentObraId) || null;

  return (
    <div className="app-container">
      {/* Barra de Navegação Superior com Perfis e Notificações */}
      <Navbar
        currentObra={currentObra}
        onBackToObras={() => {
          setCurrentObraId(null);
          setIsConfigOpen(false);
        }}
        perfilAtivo={perfilAtivo}
        onTogglePerfil={(novo) => {
          setPerfilAtivo(novo);
          if (novo === 'cliente' && isConfigOpen) {
            setIsConfigOpen(false);
          }
          showToast(
            `Perfil alterado para ${novo === 'construtor' ? 'Construtor' : 'Cliente'}`,
            novo === 'construtor' ? 'Acesso pleno à gestão e edição.' : 'Modo de acompanhamento transparente e aprovação de decisões.',
            'info'
          );
        }}
        obras={obras}
        onNavigateToDecisao={(obraId) => {
          setIsConfigOpen(false);
          setCurrentObraId(obraId);
          setActiveTab('decisoes');
        }}
        onOpenSettings={() => {
          setIsConfigOpen((prev) => !prev);
        }}
        isConfigOpen={isConfigOpen}
      />

      {/* Conteúdo Principal */}
      <main className="main-content">
        {isConfigOpen ? (
          <ConfigTemplatesPage
            templates={templates}
            onUpdateTemplates={handleUpdateTemplates}
            onBack={() => setIsConfigOpen(false)}
            showToast={showToast}
          />
        ) : !currentObra ? (
          /* Visão Externa: Empty State ou Lista de Obras */
          <ObraList
            obras={obras}
            onSelectObra={(id) => {
              setIsConfigOpen(false);
              setCurrentObraId(id);
            }}
            onOpenCreateModal={() => setIsCreateObraOpen(true)}
            onDeleteObra={handleDeleteObra}
            onLoadDemo={handleLoadDemo}
            perfilAtivo={perfilAtivo}
            onOpenSettings={() => setIsConfigOpen(true)}
          />
        ) : (
          /* Visão Interna: Detalhes da Obra com Abas e Timeline */
          <ObraDetail
            obra={currentObra}
            onUpdateObra={handleUpdateObra}
            showToast={showToast}
            perfilAtivo={perfilAtivo}
            activeTab={activeTab}
            onChangeTab={(t) => setActiveTab(t)}
            onBackToObras={() => setCurrentObraId(null)}
            onSwitchToClient={() => {
              setPerfilAtivo('cliente');
              showToast('Perfil alterado para Cliente', 'Agora você está navegando com a visão do cliente.', 'info');
            }}
            templates={templates}
          />
        )}
      </main>

      {/* Modal de Criação de Obra */}
      <ModalCreateObra
        isOpen={isCreateObraOpen}
        onClose={() => setIsCreateObraOpen(false)}
        onSubmit={handleCreateObra}
      />

      {/* Notificações Toast Flutuantes */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};
