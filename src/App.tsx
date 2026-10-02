import React, { useState, useEffect } from 'react';
import { Obra, ToastMessage, ToastType, PerfilUsuario, PresetTipoObra, ProjetoPDF, TipoProjeto, RegistroNota } from './types/obra';
import { loadObrasFromStorage, saveObrasToStorage, loadTemplatesFromStorage, saveTemplatesToStorage } from './utils/storage';
import { Navbar } from './components/Navbar';
import { ObraList } from './components/ObraList';
import { ObraDetail } from './components/ObraDetail';
import { ModalCreateObra } from './components/ModalCreateObra';
import { ModalRegistroNota, NovaNotaData } from './components/ModalRegistroNota';
import { LoginPage, UserRole } from './components/LoginPage';
import { ToastContainer } from './components/Toast';

const ConfigTemplatesPage = React.lazy(() =>
  import('./components/ConfigTemplatesPage').then((m) => ({ default: m.ConfigTemplatesPage }))
);
const PublicUploadProjetoPage = React.lazy(() =>
  import('./components/PublicUploadProjetoPage').then((m) => ({ default: m.PublicUploadProjetoPage }))
);
const RegistroNotasPage = React.lazy(() =>
  import('./components/RegistroNotasPage').then((m) => ({ default: m.RegistroNotasPage }))
);

export const App: React.FC = () => {
  const [obras, setObras] = useState<Obra[]>(() => loadObrasFromStorage());
  const [templates, setTemplates] = useState<PresetTipoObra[]>(() => loadTemplatesFromStorage());
  const [currentObraId, setCurrentObraId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('obra');
    } catch {
      return null;
    }
  });
  const [isCreateObraOpen, setIsCreateObraOpen] = useState(false);
  const [isRegistroNotaOpen, setIsRegistroNotaOpen] = useState(false);
  const [notaPreselectedObraId, setNotaPreselectedObraId] = useState<string | undefined>(undefined);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRegistroNotasPageOpen, setIsRegistroNotasPageOpen] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') === 'notas';
    } catch {
      return false;
    }
  });

  // Gerenciamento de Estado de Autenticação (Fake Login & Local State)
  const [isLogged, setIsLogged] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('perfil') === 'cliente' || params.get('upload') === 'projeto') {
        return true;
      }
      const stored = localStorage.getItem('eixo_auth_isLogged');
      if (stored !== null) return stored === 'true';
    } catch {}
    return false;
  });

  const [Role, setRole] = useState<UserRole>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const perfilParam = params.get('perfil');
      if (perfilParam === 'cliente') return 'Cliente';
      if (perfilParam === 'construtor') return 'Construtor';
      const stored = localStorage.getItem('eixo_auth_role') as UserRole;
      if (stored === 'Cliente' || stored === 'Construtor') return stored;
    } catch {}
    return 'Construtor';
  });

  const perfilAtivo: PerfilUsuario = Role.toLowerCase() as PerfilUsuario;

  const setPerfilAtivo = (novo: PerfilUsuario) => {
    const newRole: UserRole = novo === 'cliente' ? 'Cliente' : 'Construtor';
    setRole(newRole);
    try {
      localStorage.setItem('eixo_auth_role', newRole);
    } catch {}
  };

  // Dados Cadastrais do Perfil de Usuário (campos em branco por padrão)
  const [userName, setUserName] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('eixo_auth_userName');
      if (stored) return stored;
    } catch {}
    return '';
  });

  const [userEmail, setUserEmail] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('eixo_auth_userEmail');
      if (stored) return stored;
    } catch {}
    return '';
  });

  const [userEmpresa, setUserEmpresa] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('eixo_empresa_cadastrada');
      if (stored) return stored;
    } catch {}
    return '';
  });

  const handleSaveProfile = (dados: { nome: string; email: string; empresa?: string }) => {
    setUserName(dados.nome);
    setUserEmail(dados.email);
    if (dados.empresa !== undefined) {
      setUserEmpresa(dados.empresa);
    }
    try {
      localStorage.setItem('eixo_auth_userName', dados.nome);
      localStorage.setItem('eixo_auth_userEmail', dados.email);
      if (dados.empresa !== undefined) {
        localStorage.setItem('eixo_empresa_cadastrada', dados.empresa);
      }
    } catch {}
    showToast(
      'Perfil Atualizado',
      'As configurações de perfil foram salvas com sucesso.',
      'success'
    );
  };
  const [activeTab, setActiveTab] = useState<'etapas' | 'projetos' | 'decisoes' | 'diario' | 'anexos' | 'compartilhar'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'anexos') return 'diario';
      if (tabParam === 'etapas' || tabParam === 'projetos' || tabParam === 'decisoes' || tabParam === 'diario' || tabParam === 'compartilhar') {
        return tabParam;
      }
      const perfilParam = params.get('perfil');
      if (perfilParam === 'cliente') {
        return 'diario';
      }
    } catch {}
    return 'etapas';
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [publicUploadObraId, setPublicUploadObraId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('upload') === 'projeto') {
        return params.get('obra');
      }
    } catch {}
    return null;
  });

  // Verificar reset/limpeza inicial de dados via parâmetro de URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const resetParam = params.get('reset') || params.get('limpar');
      if (resetParam === 'true' || resetParam === '1') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        // Em produção, exige confirmação para evitar perda acidental de dados através de link malicioso
        const podeResetar = isLocalhost || window.confirm('Deseja realmente redefinir todos os dados locais do Eixo para o estado inicial?');
        if (podeResetar) {
          // Limpa estritamente as chaves gerenciadas pelo Eixo
          ['eixo_obras_v1', 'eixo_templates_v1', 'eixo_empresa_cadastrada', 'eixo_public_upload_token'].forEach((k) => {
            localStorage.removeItem(k);
          });
          sessionStorage.clear();
          window.location.href = window.location.origin + window.location.pathname;
          return;
        }
      }
    } catch {}
  }, []);

  // Sincronizar parâmetros de URL em tempo real para evitar perda de contexto ao dar F5
  useEffect(() => {
    if (publicUploadObraId) return;

    try {
      const url = new URL(window.location.href);
      const prevSearch = url.search;

      if (currentObraId) {
        url.searchParams.set('obra', currentObraId);

        if (perfilAtivo === 'cliente') {
          url.searchParams.set('perfil', 'cliente');
        } else {
          url.searchParams.delete('perfil');
        }

        const defaultTab = perfilAtivo === 'cliente' ? 'diario' : 'etapas';
        if (activeTab && activeTab !== defaultTab) {
          url.searchParams.set('tab', activeTab);
        } else {
          url.searchParams.delete('tab');
        }
      } else {
        url.searchParams.delete('obra');
        url.searchParams.delete('tab');
        if (perfilAtivo === 'cliente') {
          url.searchParams.set('perfil', 'cliente');
        } else {
          url.searchParams.delete('perfil');
        }
      }

      if (isRegistroNotasPageOpen) {
        url.searchParams.set('view', 'notas');
      } else {
        url.searchParams.delete('view');
      }

      if (url.search !== prevSearch) {
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }, [currentObraId, perfilAtivo, activeTab, publicUploadObraId, isRegistroNotasPageOpen]);

  // -------------------------------------------------------
  // visualViewport: mantém --vvh sempre igual à altura real
  // do viewport visível (fundamental para modais no mobile
  // quando o teclado virtual encolhe a tela)
  // -------------------------------------------------------
  useEffect(() => {
    const setVVH = () => {
      const h = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;
      document.documentElement.style.setProperty('--vvh', `${h}px`);
    };

    setVVH(); // valor inicial

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', setVVH);
      vv.addEventListener('scroll', setVVH);
    } else {
      window.addEventListener('resize', setVVH);
    }

    return () => {
      const vv2 = window.visualViewport;
      if (vv2) {
        vv2.removeEventListener('resize', setVVH);
        vv2.removeEventListener('scroll', setVVH);
      } else {
        window.removeEventListener('resize', setVVH);
      }
    };
  }, []);

  // Suporte a navegação nativa do navegador (botões Voltar e Avançar via popstate)
  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const obraParam = params.get('obra');
        const perfilParam = params.get('perfil');
        const tabParam = params.get('tab');
        const viewParam = params.get('view');

        setIsRegistroNotasPageOpen(viewParam === 'notas');
        setCurrentObraId(obraParam);
        if (perfilParam === 'cliente' || perfilParam === 'construtor') {
          setPerfilAtivo(perfilParam);
        } else {
          setPerfilAtivo('construtor');
        }
        if (tabParam === 'anexos') {
          setActiveTab('diario');
        } else if (tabParam === 'etapas' || tabParam === 'projetos' || tabParam === 'decisoes' || tabParam === 'diario' || tabParam === 'compartilhar') {
          setActiveTab(tabParam);
        } else {
          setActiveTab(perfilParam === 'cliente' ? 'diario' : 'etapas');
        }
      } catch {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Salvar no localStorage sempre que obras mudarem
  useEffect(() => {
    saveObrasToStorage(obras);
  }, [obras]);

  // Garantir que no mobile, com teclado virtual aberto, o scroll continue fluido e o campo focado visível
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleVisualViewportResize = () => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
    };

    window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualViewportResize);
    };
  }, []);

  // Função para exibir Toast notification
  const showToast = (
    titulo: string,
    descricao?: string,
    tipo: ToastType = 'success'
  ) => {
    // Regra: Durante qualquer registro ou preenchimento, nenhuma notificação pode subir no mobile
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      const activeEl = document.activeElement;
      const isInputActive = Boolean(
        activeEl &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
          activeEl.getAttribute('contenteditable') === 'true' ||
          activeEl.classList.contains('form-input') ||
          activeEl.classList.contains('form-textarea'))
      );
      const isModalOpen = Boolean(
        document.querySelector('.modal-backdrop, .modal-card, [role="dialog"], .modal-novo-anexo')
      );

      if (isInputActive || isModalOpen) {
        // Bloquear completamente a notificação durante preenchimento ou registro no mobile
        return;
      }
    }

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

  // Navegação para dentro de uma obra
  const handleSelectObra = (id: string) => {
    setIsConfigOpen(false);
    setCurrentObraId(id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('obra', id);
      if (perfilAtivo === 'cliente') {
        url.searchParams.set('perfil', 'cliente');
      } else {
        url.searchParams.delete('perfil');
      }
      const defaultTab = perfilAtivo === 'cliente' ? 'diario' : 'etapas';
      if (activeTab && activeTab !== defaultTab) {
        url.searchParams.set('tab', activeTab);
      } else {
        url.searchParams.delete('tab');
      }
      window.history.pushState({}, '', url.toString());
    } catch {}
  };

  // Voltar para a lista de obras
  const handleBackToObras = () => {
    setCurrentObraId(null);
    setIsConfigOpen(false);
    setIsRegistroNotasPageOpen(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('obra');
      url.searchParams.delete('tab');
      url.searchParams.delete('view');
      window.history.pushState({}, '', url.toString());
    } catch {}
  };

  // Criar nova obra
  const handleCreateObra = (dados: {
    nome: string;
    cliente: string;
    endereco: string;
    dataPrevista: string;
    empresaResponsavel?: string;
    orcamentoInicial?: number;
  }) => {
    if (dados.empresaResponsavel) {
      try {
        localStorage.setItem('eixo_empresa_cadastrada', dados.empresaResponsavel);
      } catch {}
    }

    const novaObra: Obra = {
      id: `obra_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nome: dados.nome,
      cliente: dados.cliente,
      endereco: dados.endereco,
      dataPrevista: dados.dataPrevista,
      empresaResponsavel: dados.empresaResponsavel,
      orcamentoInicial: dados.orcamentoInicial,
      criadaEm: new Date().toISOString(),
      etapas: [],
      anexosGerais: [],
    };

    const updated = [novaObra, ...obras];
    setObras(updated);
    setIsCreateObraOpen(false);
    // Já entra diretamente nos detalhes da obra recém criada!
    handleSelectObra(novaObra.id);

    showToast(
      'Obra criada com sucesso!',
      `Bem-vindo ao diário de "${novaObra.nome}". Adicione sua primeira etapa.`
    );
  };

  // Atualizar dados de uma obra existente
  const handleUpdateObra = (updatedObra: Obra) => {
    setObras((prev) => prev.map((o) => (o.id === updatedObra.id ? updatedObra : o)));
  };

  // Controle de Registro de Notas
  const handleOpenRegistroNota = (targetObraId?: string) => {
    if (obras.length === 0) {
      showToast(
        'Nenhuma obra cadastrada',
        'Cadastre uma obra antes de realizar o registro de notas.',
        'warning'
      );
      return;
    }
    setNotaPreselectedObraId(targetObraId || currentObraId || undefined);
    setIsRegistroNotaOpen(true);
  };

  const handleSaveNota = (dados: NovaNotaData) => {
    const obraAlvo = obras.find((o) => o.id === dados.obraId);
    if (!obraAlvo) return;

    const novoRegistro: RegistroNota = {
      id: `nota_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      obraId: dados.obraId,
      fotos: dados.fotos,
      titulo: dados.titulo,
      observacoes: dados.observacoes,
      criadoEm: new Date().toISOString(),
    };

    const updatedObra: Obra = {
      ...obraAlvo,
      notas: [novoRegistro, ...(obraAlvo.notas || [])],
    };

    handleUpdateObra(updatedObra);
    setIsRegistroNotaOpen(false);

    showToast(
      'Nota Registrada!',
      `A nota foi anexada com sucesso à obra "${obraAlvo.nome}".`,
      'success'
    );

    // Se estiver na visão geral de obras, navega diretamente para os detalhes da obra no diário
    if (!currentObraId || currentObraId !== dados.obraId) {
      handleSelectObra(dados.obraId);
      setActiveTab('diario');
    }
  };

  // Simulação de Autenticação (Fake Login)
  const handleLogin = (selectedRole: UserRole, emailDigitado?: string) => {
    setIsLogged(true);
    setRole(selectedRole);
    setCurrentObraId(null); // Redireciona para a Home
    setIsConfigOpen(false);
    const emailToSet = emailDigitado || (selectedRole === 'Construtor' ? 'engenharia@albuquerque.com.br' : 'carolina.mendes@cliente.com');
    const nomeToSet = selectedRole === 'Construtor' ? 'Engenheiro Responsável' : 'Carolina Mendes';
    setUserEmail(emailToSet);
    setUserName(nomeToSet);
    try {
      localStorage.setItem('eixo_auth_isLogged', 'true');
      localStorage.setItem('eixo_auth_role', selectedRole);
      localStorage.setItem('eixo_auth_userEmail', emailToSet);
      localStorage.setItem('eixo_auth_userName', nomeToSet);
    } catch {}
    showToast(
      'Login realizado com sucesso!',
      `Bem-vindo ao Eixo como ${selectedRole}.`,
      'success'
    );
  };

  const handleLogout = () => {
    setIsLogged(false);
    setCurrentObraId(null);
    setIsConfigOpen(false);
    try {
      localStorage.setItem('eixo_auth_isLogged', 'false');
    } catch {}
    showToast('Sessão encerrada', 'Você saiu do sistema.', 'info');
  };

  // Carregar Obra de Demonstração (atende o exemplo exato: 2 etapas com 2 tarefas cada = 25% por tarefa)
  const handleLoadDemo = () => {
    const demoObra: Obra = {
      id: `obra_demo_${Date.now()}`,
      nome: 'Reforma Apto 402 - Jardins',
      empresaResponsavel: 'Albuquerque Engenharia & Reformas',
      cliente: 'Dra. Carolina Mendes',
      endereco: 'Alameda Santos, 1820 - Apto 402, São Paulo - SP',
      dataPrevista: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      orcamentoInicial: 185000,
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
      punchList: [],
      notas: [
        {
          id: 'nota_demo_1',
          obraId: `obra_demo_${Date.now()}`,
          titulo: 'NF 48.912 - Depósito São Paulo',
          observacoes: 'Entrega de cimento e areia lavada conferida no canteiro.',
          fotos: [
            'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80',
          ],
          criadoEm: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        },
      ],
    };

    setObras([demoObra, ...obras]);
    handleSelectObra(demoObra.id);
    showToast('Obra de Exemplo Carregada!', 'Explore as etapas, arquivos, decisões e o diário.');
  };

  // Excluir obra
  const handleDeleteObra = (obraId: string) => {
    setObras((prev) => prev.filter((o) => o.id !== obraId));
    if (currentObraId === obraId) {
      handleBackToObras();
    }
  };

  // Handler para upload público de projetos (sem login)
  const handlePublicUploadProjeto = (dados: {
    titulo: string;
    tipo: TipoProjeto;
    tipoCustomizado?: string;
    arquivoNome: string;
    tamanhoBytes: number;
    url: string;
    versao?: string;
    descricao?: string;
    remetenteNome: string;
  }) => {
    if (!publicUploadObraId) return;

    const novoProjeto: ProjetoPDF = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      titulo: dados.titulo,
      tipo: dados.tipo,
      tipoCustomizado: dados.tipoCustomizado,
      arquivoNome: dados.arquivoNome,
      tamanhoBytes: dados.tamanhoBytes,
      dataUpload: new Date().toISOString(),
      enviadoPor: 'externo',
      enviadoPorNome: dados.remetenteNome,
      url: dados.url,
      versao: dados.versao,
      descricao: dados.descricao,
    };

    setObras((prev) =>
      prev.map((o) => {
        if (o.id === publicUploadObraId) {
          const projetosAtuais = o.projetos || [];
          return {
            ...o,
            projetos: [novoProjeto, ...projetosAtuais],
          };
        }
        return o;
      })
    );

    showToast(
      'Projeto Recebido!',
      `O arquivo "${dados.titulo}" enviado por ${dados.remetenteNome} foi anexado com sucesso.`
    );
  };

  // Se o link foi aberto especificamente para upload externo de pranchas sem login
  if (publicUploadObraId) {
    const obraDestino = obras.find((o) => o.id === publicUploadObraId);
    if (obraDestino) {
      return (
        <div className="app-container">
          <React.Suspense fallback={<div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando tela de envio...</div>}>
            <PublicUploadProjetoPage
              obra={obraDestino}
              onUploadProjeto={handlePublicUploadProjeto}
              onBackToApp={() => {
                setPublicUploadObraId(null);
                setCurrentObraId(obraDestino.id);
                setActiveTab('projetos');
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('upload');
                  window.history.replaceState({}, '', url.toString());
                } catch {}
              }}
            />
          </React.Suspense>
          <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
        </div>
      );
    }
  }

  // Se o usuário não estiver logado, exibe a tela de login
  if (!isLogged) {
    return (
      <div className="app-container">
        <LoginPage
          onLogin={handleLogin}
          initialRole={Role}
        />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    );
  }

  // Obra atualmente aberta
  const currentObra = obras.find((o) => o.id === currentObraId) || null;

  return (
    <div className="app-container">
      {/* Barra de Navegação Superior com Perfis e Notificações */}
      <Navbar
        currentObra={currentObra}
        onBackToObras={handleBackToObras}
        perfilAtivo={perfilAtivo}
        onTogglePerfil={(novo) => {
          setPerfilAtivo(novo);
          if (novo === 'cliente' && isConfigOpen) {
            setIsConfigOpen(false);
          }
          if (novo === 'cliente' && activeTab === 'etapas') {
            setActiveTab('diario');
          } else if (novo === 'construtor' && activeTab === 'diario') {
            setActiveTab('etapas');
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
          handleSelectObra(obraId);
          setActiveTab('decisoes');
        }}
        onOpenSettings={() => {
          setIsConfigOpen((prev) => !prev);
        }}
        isConfigOpen={isConfigOpen}
        onLogout={handleLogout}
        onOpenCreateObra={() => setIsCreateObraOpen(true)}
        onOpenRegistroNota={() => {
          setIsConfigOpen(false);
          setIsRegistroNotasPageOpen(true);
        }}
        userName={userName}
        userEmail={userEmail}
        userEmpresa={userEmpresa}
        onSaveProfile={handleSaveProfile}
        isLogged={isLogged}
        onOpenLogin={() => setIsLogged(false)}
        activeTab={activeTab}
        onChangeTab={(t) => setActiveTab(t)}
      />

      {/* Conteúdo Principal */}
      <main className="main-content">
        {isConfigOpen ? (
          <React.Suspense fallback={<div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando modelos de obra...</div>}>
            <ConfigTemplatesPage
              templates={templates}
              onUpdateTemplates={handleUpdateTemplates}
              onBack={() => setIsConfigOpen(false)}
              showToast={showToast}
            />
          </React.Suspense>
        ) : isRegistroNotasPageOpen ? (
          <React.Suspense fallback={<div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando registro de notas...</div>}>
            <RegistroNotasPage
              obras={obras}
              onUpdateObra={handleUpdateObra}
              onBack={() => setIsRegistroNotasPageOpen(false)}
              showToast={showToast}
              perfilAtivo={perfilAtivo}
            />
          </React.Suspense>
        ) : !currentObra ? (
          /* Visão Externa: Empty State ou Lista de Obras */
          <ObraList
            obras={obras}
            onSelectObra={handleSelectObra}
            onOpenCreateModal={() => setIsCreateObraOpen(true)}
            onDeleteObra={handleDeleteObra}
            onLoadDemo={handleLoadDemo}
            perfilAtivo={perfilAtivo}
            onOpenSettings={Role === 'Construtor' ? () => setIsConfigOpen(true) : undefined}
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
            onBackToObras={handleBackToObras}
            onSwitchToClient={() => {
              setPerfilAtivo('cliente');
              if (activeTab === 'etapas') {
                setActiveTab('diario');
              }
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

      {/* Modal de Registro de Notas */}
      <ModalRegistroNota
        isOpen={isRegistroNotaOpen}
        onClose={() => setIsRegistroNotaOpen(false)}
        obras={obras}
        preselectedObraId={notaPreselectedObraId}
        onSave={handleSaveNota}
      />

      {/* Notificações Toast Flutuantes */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};
