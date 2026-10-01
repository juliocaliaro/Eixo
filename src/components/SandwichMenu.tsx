import React, { useState, useEffect } from 'react';
import {
  X,
  ListDashes,
  UserGear,
  Package,
  Bell,
  HardHat,
  User,
  Gear,
  SignOut,
  SignIn,
  FloppyDisk,
  CheckCircle,
  BookOpen,
  Kanban,
  FilePdf,
  Scales,
  ShareNetwork,
  House,
} from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';

export interface NotificacaoPendente {
  obraId: string;
  obraNome: string;
  decisaoId: string;
  titulo: string;
  criadaPorNome: string;
}

export interface SandwichMenuProps {
  isOpen: boolean;
  onClose: () => void;
  // Obra Atual & Navegação por Tópicos
  currentObra: Obra | null;
  activeTab?: string;
  onChangeTab?: (tab: 'etapas' | 'projetos' | 'decisoes' | 'diario' | 'compartilhar') => void;
  // Notificações
  notificacoes: NotificacaoPendente[];
  onNavigateToDecisao?: (obraId: string) => void;
  // Registro de Materiais
  onOpenRegistroMaterial?: () => void;
  // Configurações de Modelos
  onOpenSettings?: () => void;
  // Navegação
  onBackToObras?: () => void;
  // Perfil do Usuário
  perfilAtivo: PerfilUsuario;
  onTogglePerfil: (novoPerfil: PerfilUsuario) => void;
  userName: string;
  userEmail: string;
  userEmpresa?: string;
  onSaveProfile: (dados: { nome: string; email: string; empresa?: string }) => void;
  // Autenticação (Rodapé)
  isLogged: boolean;
  onLogout?: () => void;
  onOpenLogin?: () => void;
}

export const SandwichMenu: React.FC<SandwichMenuProps> = ({
  isOpen,
  onClose,
  currentObra,
  activeTab,
  onChangeTab,
  notificacoes,
  onNavigateToDecisao,
  onOpenRegistroMaterial,
  onOpenSettings,
  onBackToObras,
  perfilAtivo,
  onTogglePerfil,
  userName,
  userEmail,
  userEmpresa = '',
  onSaveProfile,
  isLogged,
  onLogout,
  onOpenLogin,
}) => {
  // Abas dentro do Drawer: 'topicos' (Navegação & Ações) ou 'perfil' (Configurar Perfil)
  const [activeDrawerTab, setActiveDrawerTab] = useState<'topicos' | 'perfil'>('topicos');

  // Estados locais para configuração de perfil
  const [nomeInput, setNomeInput] = useState(userName);
  const [emailInput, setEmailInput] = useState(userEmail);
  const [empresaInput, setEmpresaInput] = useState(userEmpresa);
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);

  useEffect(() => {
    setNomeInput(userName);
    setEmailInput(userEmail);
    setEmpresaInput(userEmpresa);
  }, [userName, userEmail, userEmpresa, isOpen]);

  // Tecla Escape fecha o drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalNotificacoes = notificacoes.length;

  const handleSalvarPerfil = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      nome: nomeInput.trim(),
      email: emailInput.trim(),
      empresa: empresaInput.trim(),
    });
    setProfileSavedFeedback(true);
    setTimeout(() => {
      setProfileSavedFeedback(false);
    }, 2200);
  };

  // Tópicos de navegação da obra atual de acordo com o perfil
  const topicosObra = perfilAtivo === 'cliente'
    ? [
        { id: 'diario', label: 'Diário de Obra', icon: BookOpen },
        { id: 'etapas', label: 'Etapas & Cronograma', icon: Kanban },
        { id: 'projetos', label: 'Arquivos & Projetos (PDF)', icon: FilePdf },
        { id: 'decisoes', label: 'Decisões & Aprovações', icon: Scales },
        { id: 'compartilhar', label: 'Compartilhar', icon: ShareNetwork },
      ]
    : [
        { id: 'etapas', label: 'Etapas & Cronograma', icon: Kanban },
        { id: 'projetos', label: 'Arquivos & Projetos (PDF)', icon: FilePdf },
        { id: 'decisoes', label: 'Decisões & Aprovações', icon: Scales },
        { id: 'diario', label: 'Diário de Obra', icon: BookOpen },
        { id: 'compartilhar', label: 'Compartilhar', icon: ShareNetwork },
      ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Menu Drawer"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(26, 19, 10, 0.45)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          height: '100%',
          background: '#ffffff',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          animation: 'drawerSlideLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Cabeçalho do Drawer */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--dark-coffee-50, #fcfaf8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/eixo-icon.jpg"
              alt="Eixo"
              style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
            />
            <div>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1, display: 'block' }}>
                Eixo
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Menu Drawer
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              background: '#ffffff',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Fechar (Esc)"
            aria-label="Fechar drawer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Abas do Drawer: Tópicos de Navegação vs Configurar Perfil */}
        <div
          style={{
            display: 'flex',
            padding: '8px 16px',
            background: '#ffffff',
            borderBottom: '1px solid var(--border-hairline)',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveDrawerTab('topicos')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md, 8px)',
              border: 'none',
              cursor: 'pointer',
              background: activeDrawerTab === 'topicos' ? 'var(--dark-coffee-100, #f5efe9)' : 'transparent',
              color: activeDrawerTab === 'topicos' ? 'var(--text-main, #1e1806)' : 'var(--text-muted, #7c7267)',
              transition: 'all 0.15s ease',
            }}
          >
            <ListDashes size={16} weight={activeDrawerTab === 'topicos' ? 'bold' : 'regular'} />
            <span>Tópicos</span>
            {totalNotificacoes > 0 && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--coral-glow-500, #e05a47)',
                }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawerTab('perfil')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md, 8px)',
              border: 'none',
              cursor: 'pointer',
              background: activeDrawerTab === 'perfil' ? 'var(--dark-coffee-100, #f5efe9)' : 'transparent',
              color: activeDrawerTab === 'perfil' ? 'var(--text-main, #1e1806)' : 'var(--text-muted, #7c7267)',
              transition: 'all 0.15s ease',
            }}
          >
            <UserGear size={16} weight={activeDrawerTab === 'perfil' ? 'bold' : 'regular'} />
            <span>Configurar Perfil</span>
          </button>
        </div>

        {/* Conteúdo do Drawer */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* ================= ABA 1: TÓPICOS DO MENU ================= */}
          {activeDrawerTab === 'topicos' && (
            <>
              {/* Tópicos da Obra Atual (se houver obra aberta) */}
              {currentObra && onChangeTab && (
                <div>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{currentObra.nome}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>Obra Ativa</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {topicosObra.map((topico) => {
                      const Icone = topico.icon;
                      const isActive = activeTab === topico.id;
                      return (
                        <button
                          key={topico.id}
                          type="button"
                          onClick={() => {
                            onChangeTab(topico.id as any);
                            onClose();
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md, 8px)',
                            border: '1px solid',
                            borderColor: isActive ? 'var(--primary-accent)' : 'var(--border-hairline)',
                            background: isActive ? 'var(--dark-coffee-50, #fcfaf8)' : '#ffffff',
                            color: isActive ? 'var(--primary-accent)' : 'var(--text-main)',
                            fontWeight: isActive ? 700 : 600,
                            fontSize: '0.86rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Icone size={18} weight={isActive ? 'fill' : 'bold'} />
                            <span>{topico.label}</span>
                          </div>
                          {topico.id === 'decisoes' && totalNotificacoes > 0 && (
                            <span
                              style={{
                                background: 'var(--coral-glow-500, #e05a47)',
                                color: '#ffffff',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 10,
                              }}
                            >
                              {totalNotificacoes}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tópicos Gerais de Gestão */}
              <div>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  Ações & Serviços
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Tópico: Registro de Materiais */}
                  {onOpenRegistroMaterial && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRegistroMaterial();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--border-hairline)',
                        background: '#ffffff',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        textAlign: 'left',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Package size={18} weight="bold" color="var(--primary-accent)" />
                        <span>Registro de Materiais</span>
                      </div>
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Canteiro
                      </span>
                    </button>
                  )}

                  {/* Tópico: Notificações */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (notificacoes.length > 0 && onNavigateToDecisao) {
                        onNavigateToDecisao(notificacoes[0].obraId);
                      } else if (onChangeTab) {
                        onChangeTab('decisoes');
                      }
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--border-hairline)',
                      background: '#ffffff',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      textAlign: 'left',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Bell size={18} weight={totalNotificacoes > 0 ? 'fill' : 'bold'} color={totalNotificacoes > 0 ? 'var(--primary-accent)' : 'var(--text-muted)'} />
                      <span>Notificações</span>
                    </div>
                    {totalNotificacoes > 0 ? (
                      <span
                        style={{
                          background: 'var(--coral-glow-500, #e05a47)',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: 10,
                        }}
                      >
                        {totalNotificacoes} pendente{totalNotificacoes > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                        Nenhuma pendência
                      </span>
                    )}
                  </button>

                  {/* Tópico: Home / Todas as Obras */}
                  {onBackToObras && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBackToObras();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--border-hairline)',
                        background: '#ffffff',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        textAlign: 'left',
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
                      <House size={18} weight="bold" color="var(--text-muted)" />
                      <span>Todas as Obras</span>
                    </button>
                  )}

                  {/* Tópico: Modelos de Obra (se Construtor) */}
                  {perfilAtivo === 'construtor' && onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettings();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--border-hairline)',
                        background: '#ffffff',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        textAlign: 'left',
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
                      <Gear size={18} weight="bold" color="var(--text-muted)" />
                      <span>Modelos de Obra & Templates</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ================= ABA 2: CONFIGURAR PERFIL ================= */}
          {activeDrawerTab === 'perfil' && (
            <form onSubmit={handleSalvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Alternador de Perfil */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  Perfil Ativo
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'var(--dark-coffee-50)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)' }}>
                  <button
                    type="button"
                    onClick={() => onTogglePerfil('construtor')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: perfilAtivo === 'construtor' ? 'var(--dark-coffee-800)' : 'transparent',
                      color: perfilAtivo === 'construtor' ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    <HardHat size={16} weight={perfilAtivo === 'construtor' ? 'fill' : 'bold'} />
                    <span>Construtor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePerfil('cliente')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: perfilAtivo === 'cliente' ? 'var(--primary-accent)' : 'transparent',
                      color: perfilAtivo === 'cliente' ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    <User size={16} weight={perfilAtivo === 'cliente' ? 'fill' : 'bold'} />
                    <span>Cliente</span>
                  </button>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={nomeInput}
                  onChange={(e) => setNomeInput(e.target.value)}
                  placeholder="Nome do usuário"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    fontSize: '0.86rem',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    background: '#ffffff',
                  }}
                />
              </div>

              {/* E-mail */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="exemplo@email.com"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    fontSize: '0.86rem',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    background: '#ffffff',
                  }}
                />
              </div>

              {/* Empresa */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  Empresa
                </label>
                <input
                  type="text"
                  value={empresaInput}
                  onChange={(e) => setEmpresaInput(e.target.value)}
                  placeholder="Nome da empresa ou construtora"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    fontSize: '0.86rem',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    background: '#ffffff',
                  }}
                />
              </div>

              {/* Salvar */}
              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: '0.86rem',
                  marginTop: 4,
                }}
              >
                <FloppyDisk size={18} weight="bold" />
                <span>Salvar Perfil</span>
              </button>

              {profileSavedFeedback && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-success, #2e7d32)', fontSize: '0.78rem', justifyContent: 'center' }}>
                  <CheckCircle size={16} weight="fill" />
                  <span>Perfil salvo com sucesso!</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* ================= RODAPÉ (LOGIN / SESSÃO) ================= */}
        {/* O login fica no rodapé */}
        <div
          style={{
            marginTop: 'auto',
            padding: '14px 20px',
            borderTop: '1px solid var(--border-hairline)',
            background: 'var(--dark-coffee-50, #fcfaf8)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: perfilAtivo === 'construtor' ? 'var(--dark-coffee-800)' : 'var(--primary-accent)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {perfilAtivo === 'construtor' ? <HardHat size={17} weight="fill" /> : <User size={17} weight="fill" />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userName || (perfilAtivo === 'construtor' ? 'Construtor' : 'Cliente')}
                </div>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userEmail || 'Sessão ativa'}
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 'var(--radius-full)',
                background: perfilAtivo === 'construtor' ? 'var(--dark-coffee-100)' : 'rgba(224, 90, 71, 0.12)',
                color: perfilAtivo === 'construtor' ? 'var(--dark-coffee-800)' : 'var(--primary-accent)',
                flexShrink: 0,
              }}
            >
              {perfilAtivo === 'construtor' ? 'Construtor' : 'Cliente'}
            </span>
          </div>

          {isLogged ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onLogout) onLogout();
              }}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: '0.80rem',
                color: 'var(--text-muted)',
                background: '#ffffff',
              }}
              title="Sair da conta"
            >
              <SignOut size={16} weight="bold" />
              <span>Sair da Conta (Logout)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenLogin) onOpenLogin();
              }}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: '0.80rem',
              }}
            >
              <SignIn size={16} weight="bold" />
              <span>Fazer Login</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
