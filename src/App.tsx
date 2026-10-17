import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Obra, ToastMessage, ToastType, PerfilUsuario, PresetTipoObra, ProjetoPDF, TipoProjeto, RegistroNota } from './types/obra';
import { PRESET_TIPOS_OBRA } from './data/presetObras';
import { generateUUID } from './utils/uuid';
import { templatesApi, authApi } from './services/api';
import { isSupabaseConfigured } from './services/supabaseClient';
import { filtrarObrasVisiveis } from './services/obraAccess';
import { useSession, SessionUserProvider } from './hooks/useSession';
import { useObras } from './hooks/useObras';
import { useRouteState } from './hooks/useRouteState';
import { normalizeTab } from './utils/routeState';
import { mensagemParaUsuario, registrarErro } from './utils/mensagensErro';
import { adicionarToastUnico } from './utils/toasts';
import { Navbar } from './components/Navbar';
import { ObraList } from './components/ObraList';
import { ObraDetail } from './components/ObraDetail';
import { ModalCreateObra } from './components/ModalCreateObra';
import { ModalRegistroNota, NovaNotaData } from './components/ModalRegistroNota';
import { LoginPage, UserRole } from './components/LoginPage';
import { ToastContainer } from './components/Toast';
import { WarningCircle } from '@phosphor-icons/react';
import { ConfigErrorScreen } from './components/ConfigErrorScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';

const ConfigTemplatesPage = React.lazy(() =>
  import('./components/ConfigTemplatesPage').then((m) => ({ default: m.ConfigTemplatesPage }))
);
const PublicUploadProjetoPage = React.lazy(() =>
  import('./components/PublicUploadProjetoPage').then((m) => ({ default: m.PublicUploadProjetoPage }))
);
const RegistroNotasPage = React.lazy(() =>
  import('./components/RegistroNotasPage').then((m) => ({ default: m.RegistroNotasPage }))
);
const RegistroLocacoesPage = React.lazy(() =>
  import('./components/RegistroLocacoesPage').then((m) => ({ default: m.RegistroLocacoesPage }))
);

const TelaCarregando: React.FC<{ texto: string }> = ({ texto }) => (
  <div role="status" aria-live="polite" className="screen-loading">
    <div className="loading-line" aria-hidden="true" />
    <span>{texto}</span>
  </div>
);

export const App: React.FC = () => {
  // Sem Supabase configurado nao ha modo local: exibe tela de erro de configuracao.
  if (!isSupabaseConfigured()) {
    return <ConfigErrorScreen />;
  }
  return <AppShell />;
};

const AppShell: React.FC = () => {
  const session = useSession();
  const sessionUser = session.user;
  const isLogged = session.status === 'authed';
  const userId = sessionUser?.id ?? null;
  const accountRole: PerfilUsuario = sessionUser?.role ?? 'construtor';

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Erros de persistencia/rede nunca sao silenciados: geram toast de erro (sem repetir a mesma mensagem visivel).
  const showError = (titulo: string, descricao?: string) => {
    const id = generateUUID();
    setToasts((prev) => adicionarToastUnico(prev, { id, tipo: 'error', titulo, descricao }));
    window.setTimeout(() => handleDismissToast(id), 9000);
  };

  // Aviso nao bloqueante (ex.: perfil indisponivel): mesmo mecanismo, tipo warning.
  const showWarning = (titulo: string, descricao?: string) => {
    const id = generateUUID();
    setToasts((prev) => adicionarToastUnico(prev, { id, tipo: 'warning', titulo, descricao }));
    window.setTimeout(() => handleDismissToast(id), 9000);
  };

  // Mensagem do erro bloqueante de carga (tela com "Tentar novamente"); null = sem erro.
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const bloqueioCargaRef = useRef(false);

  // Notificacoes de sucesso/info permanecem silenciadas globalmente.
  const showToast = (
    _titulo: string,
    _descricao?: string,
    _tipo: ToastType = 'success'
  ) => {
    return;
  };

  const identity = useMemo(
    () => (sessionUser ? { userId: sessionUser.id, email: sessionUser.email, role: sessionUser.role } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionUser?.id, sessionUser?.email, sessionUser?.role]
  );

  const { obras, setObras, status: obrasStatus, reload: reloadObras } = useObras(identity, {
    onError: (err) => {
      registrarErro(err.kind === 'load-failed' ? 'Falha ao carregar obras' : 'Falha ao salvar obras', err);
      if (err.kind === 'load-failed') {
        const msg = mensagemParaUsuario(err, 'carregar');
        setErroCarga(msg);
        // Sem obras na tela, a propria tela de erro (com "Tentar novamente") ja informa: nada de toast.
        if (!bloqueioCargaRef.current) showError('Não foi possível atualizar', msg);
      } else {
        showError('Falha ao salvar alterações', mensagemParaUsuario(err, 'salvar'));
      }
    },
    onWarning: (res) => {
      console.warn('[eixo] Gravação com colunas ausentes no banco:', res.warnings);
      showError('Salvo com ressalvas', 'Algumas informações podem não ter sido gravadas por completo. Avise o suporte.');
    },
  });
  bloqueioCargaRef.current = obrasStatus === 'loading' || obrasStatus === 'idle' || (obrasStatus === 'error' && obras.length === 0);

  // Avisos de sessao: restauracao falhou (login) ou perfil indisponivel apos nova tentativa.
  useEffect(() => {
    if (session.notice) showWarning('Sessão não restaurada', session.notice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.notice]);
  useEffect(() => {
    if (sessionUser?.perfilIndisponivel) {
      showWarning('Perfil indisponível', 'Não foi possível carregar seu perfil. Algumas ações podem estar limitadas até a conexão voltar.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.id, sessionUser?.perfilIndisponivel]);

  const [templates, setTemplates] = useState<PresetTipoObra[]>(PRESET_TIPOS_OBRA);
  const [templatesRetry, setTemplatesRetry] = useState(0);
  const [isCreateObraOpen, setIsCreateObraOpen] = useState(false);
  const [isRegistroNotaOpen, setIsRegistroNotaOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  // Estado de URL (obra, aba, perfil, view, upload) vive em useRouteState.
  // O perfil da URL e apenas preferencia de visao: a conta cliente nunca vira construtor.
  const { route, tab: activeTab, navigate } = useRouteState(isLogged ? accountRole : null);
  const currentObraId = route.obraId;
  const isRegistroNotasPageOpen = route.view === 'notas';
  const isRegistroLocacoesPageOpen = route.view === 'locacoes';
  const publicUploadObraId = route.uploadObraId;
  const perfilAtivo: PerfilUsuario = route.perfil;
  const Role: UserRole = perfilAtivo === 'cliente' ? 'Cliente' : 'Construtor';

  const setActiveTab = (t: string) => navigate({ tab: normalizeTab(t) }, 'replace');

  const userName = sessionUser?.nome ?? '';
  const userEmail = sessionUser?.email ?? '';
  const userEmpresa = sessionUser?.empresa ?? '';

  const handleSaveProfile = async (dados: { nome: string; email: string; empresa?: string }) => {
    if (!sessionUser) return;
    try {
      await authApi.updateProfile(sessionUser.id, { nome: dados.nome, empresa: dados.empresa });
      await session.refresh();
    } catch (err) {
      registrarErro('Falha ao salvar perfil', err);
      showError('Não foi possível salvar o perfil', mensagemParaUsuario(err, 'salvar'));
    }
  };

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

  // Modelos de obra do usuario autenticado (lista vazia = padroes de fabrica).
  useEffect(() => {
    if (!userId) {
      setTemplates(PRESET_TIPOS_OBRA);
      return;
    }
    let active = true;
    templatesApi
      .list(userId)
      .then((loaded) => {
        if (active) setTemplates(loaded.length > 0 ? loaded : PRESET_TIPOS_OBRA);
      })
      .catch((err) => {
        // Falha de modelos nao bloqueia as obras: mantem os padroes de fabrica.
        registrarErro('Falha ao carregar modelos de obra', err);
        if (active && !bloqueioCargaRef.current) {
          showWarning('Modelos de obra indisponíveis', 'Usando os modelos padrão por enquanto.');
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, templatesRetry]);

  // Sincronização entre abas / dispositivos ao voltar para a aba (throttle de 60s)
  const lastSyncRef = useRef(0);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !userId) return;
      const now = Date.now();
      if (now - lastSyncRef.current < 60000) return;
      lastSyncRef.current = now;
      void reloadObras({ silent: true });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, reloadObras]);

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

  // Atualizar modelos padrão de etapas e tarefas
  const handleUpdateTemplates = (updated: PresetTipoObra[]) => {
    setTemplates(updated);
    if (!userId) return;
    templatesApi
      .save(userId, updated)
      .catch((err) => {
        registrarErro('Falha ao salvar modelos de obra', err);
        showError('Não foi possível salvar os modelos de obra', mensagemParaUsuario(err, 'salvar'));
      });
  };

  // Navegação para dentro de uma obra
  const handleSelectObra = (id: string) => {
    setIsConfigOpen(false);
    navigate({ obraId: id, view: null, uploadObraId: null }, 'push');
  };

  // Voltar para a lista de obras (limpa obra, aba e view; o perfil de visao e mantido)
  const handleBackToObras = () => {
    setIsConfigOpen(false);
    navigate({ obraId: null, tab: null, view: null }, 'push');
  };

  // Criar nova obra
  const handleCreateObra = (dados: {
    nome: string;
    cliente: string;
    endereco: string;
    dataPrevista: string;
    empresaResponsavel?: string;
    orcamentoInicial?: number;
    emailsClientes?: string[];
  }) => {
    if (!sessionUser) return;

    const novaObra: Obra = {
      id: generateUUID(),
      nome: dados.nome,
      cliente: dados.cliente,
      endereco: dados.endereco,
      dataPrevista: dados.dataPrevista,
      empresaResponsavel: dados.empresaResponsavel || sessionUser.empresa || undefined,
      orcamentoInicial: dados.orcamentoInicial,
      emailsClientes: dados.emailsClientes,
      clienteEmail: dados.emailsClientes?.[0],
      criadaEm: new Date().toISOString(),
      construtorId: sessionUser.id,
      etapas: [],
      anexosGerais: [],
    };

    setObras((prev) => [novaObra, ...prev]);
    setIsCreateObraOpen(false);
    // Já entra diretamente nos detalhes da obra recém criada!
    handleSelectObra(novaObra.id);
  };

  // Atualizar dados de uma obra existente
  const handleUpdateObra = (updatedObra: Obra) => {
    setObras((prev) => prev.map((o) => (o.id === updatedObra.id ? updatedObra : o)));
  };

  // Controle de Registro de Notas
  const handleSaveNota = (dados: NovaNotaData) => {
    const obraAlvo = obras.find((o) => o.id === dados.obraId);
    if (!obraAlvo) return;

    const novoRegistro: RegistroNota = {
      id: generateUUID(),
      obraId: dados.obraId,
      fotos: dados.fotos,
      titulo: dados.titulo,
      observacoes: dados.observacoes,
      criadoEm: new Date().toISOString(),
    };

    handleUpdateObra({
      ...obraAlvo,
      notas: [novoRegistro, ...(obraAlvo.notas || [])],
    });
    setIsRegistroNotaOpen(false);

    // Se estiver na visão geral de obras, navega diretamente para os detalhes da obra no diário
    if (!currentObraId || currentObraId !== dados.obraId) {
      setIsConfigOpen(false);
      navigate({ obraId: dados.obraId, view: null, uploadObraId: null, tab: 'diario' }, 'push');
    }
  };

  const handleLogout = async () => {
    try {
      await session.signOut();
    } catch (err) {
      registrarErro('Falha ao encerrar sessão', err);
      showError('Não foi possível encerrar a sessão', 'Tente novamente.');
      return;
    }
    navigate({ perfil: 'construtor', obraId: null, tab: null, view: null, uploadObraId: null }, 'replace');
    setIsConfigOpen(false);
  };

  // Excluir obra (o diff do obraStore propaga a exclusão em cascata no banco)
  const handleDeleteObra = (obraId: string) => {
    setObras((prev) => prev.filter((o) => o.id !== obraId));
    if (currentObraId === obraId) {
      handleBackToObras();
    }
  };

  // Handler para upload de projetos via link externo (exige sessão autenticada)
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
      id: generateUUID(),
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
      prev.map((o) =>
        o.id === publicUploadObraId ? { ...o, projetos: [novoProjeto, ...(o.projetos || [])] } : o
      )
    );
  };

  // Sessão ainda sendo resolvida pelo Supabase
  if (session.status === 'loading') {
    return (
      <div className="app-container">
        <TelaCarregando texto="Carregando..." />
      </div>
    );
  }

  // Link de recuperação de senha: define a nova senha antes de entrar no app
  if (session.status === 'recovery') {
    return <ResetPasswordScreen onDone={session.finishRecovery} onCancel={session.signOut} />;
  }

  // Se o usuário não estiver autenticado, exibe a tela de login (inclusive para links de upload externo)
  if (!isLogged) {
    return (
      <div className="auth-screen">
        <LoginPage initialRole={Role} />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    );
  }

  // Obras que a conta autenticada pode ver (regra única em obraAccess)
  const visibleObras = filtrarObrasVisiveis(obras, { userId, email: userEmail, role: accountRole });
  const currentObra = visibleObras.find((o) => o.id === currentObraId) || null;

  // Link de upload externo de pranchas
  if (publicUploadObraId) {
    const obraDestino = visibleObras.find((o) => o.id === publicUploadObraId);
    if (obraDestino) {
      return (
        <SessionUserProvider user={sessionUser}>
          <div className="app-container">
            <React.Suspense fallback={<TelaCarregando texto="Carregando tela de envio..." />}>
              <PublicUploadProjetoPage
                obra={obraDestino}
                onUploadProjeto={handlePublicUploadProjeto}
                onBackToApp={() => {
                  navigate({ uploadObraId: null, obraId: obraDestino.id, tab: 'projetos', view: null }, 'replace');
                }}
              />
            </React.Suspense>
            <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
          </div>
        </SessionUserProvider>
      );
    }
    if (obrasStatus === 'loading' || obrasStatus === 'idle') {
      return (
        <div className="app-container">
          <TelaCarregando texto="Carregando tela de envio..." />
        </div>
      );
    }
  }

  const carregandoObras = (obrasStatus === 'loading' || obrasStatus === 'idle') && obras.length === 0;
  const falhaCarregarObras = obrasStatus === 'error' && obras.length === 0;

  return (
    <SessionUserProvider user={sessionUser}>
      <div className="app-container">
        {/* Barra de Navegação Superior com Perfis e Notificações */}
        <Navbar
          currentObra={currentObra}
          onBackToObras={handleBackToObras}
          perfilAtivo={perfilAtivo}
          onTogglePerfil={(novo) => {
            if (novo === 'cliente' && isConfigOpen) {
              setIsConfigOpen(false);
            }
            let tab = route.tab;
            if (novo === 'cliente' && activeTab === 'etapas') tab = 'diario';
            else if (novo === 'construtor' && activeTab === 'diario' && accountRole !== 'cliente') tab = 'etapas';
            navigate({ perfil: novo, tab }, 'replace');
          }}
          obras={visibleObras}
          onNavigateToDecisao={(obraId) => {
            setIsConfigOpen(false);
            navigate({ obraId, view: null, uploadObraId: null, tab: 'decisoes' }, 'push');
          }}
          onOpenSettings={() => {
            setIsConfigOpen((prev) => !prev);
          }}
          isConfigOpen={isConfigOpen}
          activeView={
            isConfigOpen ? 'modelos' : isRegistroNotasPageOpen ? 'notas' : isRegistroLocacoesPageOpen ? 'locacoes' : 'obras'
          }
          onLogout={handleLogout}
          onOpenCreateObra={() => setIsCreateObraOpen(true)}
          onOpenRegistroNota={() => {
            setIsConfigOpen(false);
            navigate({ view: 'notas' }, 'push');
          }}
          onOpenRegistroLocacao={() => {
            setIsConfigOpen(false);
            navigate({ view: 'locacoes' }, 'push');
          }}
          userName={userName}
          userEmail={userEmail}
          userEmpresa={userEmpresa}
          onSaveProfile={handleSaveProfile}
          isLogged={isLogged}
          activeTab={activeTab}
          onChangeTab={(t) => setActiveTab(t)}
        />

        {/* Conteúdo Principal */}
        <main className="main-content">
          {isConfigOpen ? (
            <React.Suspense fallback={<TelaCarregando texto="Carregando modelos de obra..." />}>
              <ConfigTemplatesPage
                templates={templates}
                onUpdateTemplates={handleUpdateTemplates}
                onBack={() => setIsConfigOpen(false)}
                showToast={showToast}
              />
            </React.Suspense>
          ) : isRegistroNotasPageOpen ? (
            <React.Suspense fallback={<TelaCarregando texto="Carregando registro de notas..." />}>
              <RegistroNotasPage
                obras={visibleObras}
                onUpdateObra={handleUpdateObra}
                onBack={() => navigate({ view: null }, 'push')}
                showToast={showToast}
                perfilAtivo={perfilAtivo}
              />
            </React.Suspense>
          ) : isRegistroLocacoesPageOpen ? (
            <React.Suspense fallback={<TelaCarregando texto="Carregando registro de locação..." />}>
              <RegistroLocacoesPage
                obras={visibleObras}
                onUpdateObra={handleUpdateObra}
                onBack={() => navigate({ view: null }, 'push')}
                showToast={showToast}
                perfilAtivo={perfilAtivo}
              />
            </React.Suspense>
          ) : carregandoObras ? (
            <TelaCarregando texto="Carregando suas obras..." />
          ) : falhaCarregarObras ? (
            <div className="empty-state" role="alert">
              <WarningCircle size={32} className="empty-state-icon" aria-hidden="true" />
              <p className="empty-state-text">{erroCarga ?? mensagemParaUsuario(null, 'carregar')}</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setErroCarga(null);
                  setTemplatesRetry((n) => n + 1);
                  void reloadObras();
                }}
              >
                Tentar novamente
              </button>
            </div>
          ) : !currentObra ? (
            /* Visão Externa: Empty State ou Lista de Obras */
            <ObraList
              obras={visibleObras}
              onSelectObra={handleSelectObra}
              onOpenCreateModal={() => setIsCreateObraOpen(true)}
              onDeleteObra={handleDeleteObra}
              perfilAtivo={perfilAtivo}
              obraNaoEncontrada={!!currentObraId}
              onDismissAviso={() => navigate({ obraId: null, tab: null }, 'replace')}
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
                navigate({ perfil: 'cliente', tab: activeTab === 'etapas' ? 'diario' : route.tab }, 'replace');
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
          obras={visibleObras}
          preselectedObraId={currentObraId || undefined}
          onSave={handleSaveNota}
        />

        {/* Notificações Toast Flutuantes */}
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    </SessionUserProvider>
  );
};
