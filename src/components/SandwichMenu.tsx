import React, { useState, useEffect } from 'react';
import {
  X,
  SquaresFour,
  UserGear,
  Package,
  Bell,
  BellRinging,
  PenNib,
  CheckCircle,
  HardHat,
  User,
  Gear,
  SignOut,
  SignIn,
  FloppyDisk,
  ArrowRight,
  House,
} from '@phosphor-icons/react';
import { PerfilUsuario } from '../types/obra';

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
  // Aba ativa dentro do Sandwich Menu: 'menu' (Ações & Notificações) ou 'perfil' (Configurar Perfil)
  const [activeTab, setActiveTab] = useState<'menu' | 'perfil'>('menu');

  // Estado local para os campos de configuração de perfil
  const [nomeInput, setNomeInput] = useState(userName);
  const [emailInput, setEmailInput] = useState(userEmail);
  const [empresaInput, setEmpresaInput] = useState(userEmpresa);
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);

  // Sincronizar dados caso as props mudem externamente
  useEffect(() => {
    setNomeInput(userName);
    setEmailInput(userEmail);
    setEmpresaInput(userEmpresa);
  }, [userName, userEmail, userEmpresa, isOpen]);

  // Listener para fechar com a tecla Escape
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

  const temNotificacoes = notificacoes.length > 0;

  const handleSalvarPerfil = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      nome: nomeInput.trim() || userName,
      email: emailInput.trim() || userEmail,
      empresa: empresaInput.trim(),
    });
    setProfileSavedFeedback(true);
    setTimeout(() => {
      setProfileSavedFeedback(false);
    }, 2500);
  };

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
      aria-label="Menu Principal"
    >
      {/* Backdrop com desfoque e fade */}
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
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Gaveta Deslizante (Slide-out Drawer) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          height: '100%',
          background: '#ffffff',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          animation: 'drawerSlideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Cabeçalho da Gaveta */}
        <div
          style={{
            padding: '18px 20px 14px',
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
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                objectFit: 'cover',
              }}
            />
            <div>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                  display: 'block',
                  lineHeight: 1.1,
                }}
              >
                Eixo
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Menu do Sistema
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              background: '#ffffff',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Fechar menu (Esc)"
            aria-label="Fechar menu"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Abas Internas do Sandwich Menu */}
        <div
          style={{
            display: 'flex',
            padding: '10px 16px',
            background: '#ffffff',
            borderBottom: '1px solid var(--border-hairline)',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '9px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md, 8px)',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'menu' ? 'var(--dark-coffee-100, #f5efe9)' : 'transparent',
              color: activeTab === 'menu' ? 'var(--text-main, #1e1806)' : 'var(--text-muted, #7c7267)',
              transition: 'all 0.15s ease',
            }}
          >
            <SquaresFour size={17} weight={activeTab === 'menu' ? 'fill' : 'bold'} />
            <span>Ações & Avisos</span>
            {temNotificacoes && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--coral-glow-500, #e05a47)',
                  marginLeft: 2,
                }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '9px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md, 8px)',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'perfil' ? 'var(--dark-coffee-100, #f5efe9)' : 'transparent',
              color: activeTab === 'perfil' ? 'var(--text-main, #1e1806)' : 'var(--text-muted, #7c7267)',
              transition: 'all 0.15s ease',
            }}
          >
            <UserGear size={17} weight={activeTab === 'perfil' ? 'fill' : 'bold'} />
            <span>Configurar Perfil</span>
          </button>
        </div>

        {/* Corpo com Rolagem Interna */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* ================= ABA 1: AÇÕES & NOTIFICAÇÕES ================= */}
          {activeTab === 'menu' && (
            <>
              {/* SEÇÃO 1: NOTIFICAÇÕES */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {temNotificacoes ? (
                      <BellRinging size={18} weight="fill" color="var(--primary-accent)" />
                    ) : (
                      <Bell size={18} color="var(--text-muted)" />
                    )}
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Notificações
                    </span>
                  </div>
                  {temNotificacoes && (
                    <span
                      style={{
                        background: 'var(--coral-glow-500, #e05a47)',
                        color: '#ffffff',
                        fontSize: '0.70rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 12,
                      }}
                    >
                      {notificacoes.length} pendente{notificacoes.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {temNotificacoes ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {notificacoes.map((item, idx) => (
                      <div
                        key={`${item.obraId}-${item.decisaoId}-${idx}`}
                        onClick={() => {
                          onClose();
                          if (onNavigateToDecisao) {
                            onNavigateToDecisao(item.obraId);
                          }
                        }}
                        style={{
                          padding: '12px 14px',
                          background: 'var(--dark-coffee-50, #fcfaf8)',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 'var(--radius-md, 8px)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary-accent)';
                          e.currentTarget.style.background = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-hairline)';
                          e.currentTarget.style.background = 'var(--dark-coffee-50, #fcfaf8)';
                        }}
                      >
                        <PenNib
                          size={16}
                          weight="bold"
                          color="var(--primary-accent)"
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                              lineHeight: 1.3,
                            }}
                          >
                            {item.titulo}
                          </div>
                          <div
                            style={{
                              fontSize: '0.74rem',
                              color: 'var(--text-muted)',
                              marginTop: 2,
                            }}
                          >
                            {item.obraNome} • Por {item.criadaPorNome}
                          </div>
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--primary-accent)',
                              fontWeight: 600,
                              marginTop: 4,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>Clique para analisar e assinar</span>
                            <ArrowRight size={11} weight="bold" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '14px 16px',
                      background: 'var(--dark-coffee-50, #fcfaf8)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-md, 8px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      color: 'var(--text-muted)',
                      fontSize: '0.80rem',
                    }}
                  >
                    <CheckCircle size={18} color="var(--color-success, #2e7d32)" weight="fill" />
                    <span>Nenhuma pendência aguardando sua assinatura.</span>
                  </div>
                )}
              </div>

              {/* SEÇÃO 2: REGISTRO DE MATERIAIS */}
              <div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    marginBottom: 10,
                  }}
                >
                  Gestão de Canteiro
                </span>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenRegistroMaterial) {
                      onOpenRegistroMaterial();
                    }
                  }}
                  disabled={!onOpenRegistroMaterial}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: '#ffffff',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-md, 8px)',
                    cursor: onOpenRegistroMaterial ? 'pointer' : 'not-allowed',
                    opacity: onOpenRegistroMaterial ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (onOpenRegistroMaterial) {
                      e.currentTarget.style.borderColor = 'var(--primary-accent)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (onOpenRegistroMaterial) {
                      e.currentTarget.style.borderColor = 'var(--border-hairline)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-sm, 6px)',
                      background: 'var(--dark-coffee-100, #f5efe9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary-accent)',
                      flexShrink: 0,
                    }}
                  >
                    <Package size={22} weight="bold" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                      }}
                    >
                      Registro de Materiais
                    </div>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}
                    >
                      {onOpenRegistroMaterial
                        ? 'Cadastrar notas, fotos e compras vinculadas à obra'
                        : 'Exclusivo para perfil Construtor'}
                    </div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </button>
              </div>

              {/* SEÇÃO 3: ATALHOS ADICIONAIS */}
              <div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    marginBottom: 10,
                  }}
                >
                  Atalhos Rápidos
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {onBackToObras && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBackToObras();
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-sm, 6px)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dark-coffee-50)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <House size={18} color="var(--text-muted)" />
                      <span>Todas as Obras (Página Inicial)</span>
                    </button>
                  )}

                  {perfilAtivo === 'construtor' && onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettings();
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-sm, 6px)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dark-coffee-50)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Gear size={18} color="var(--text-muted)" />
                      <span>Modelos de Obra & Etapas Padrão</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ================= ABA 2: CONFIGURAR PERFIL ================= */}
          {activeTab === 'perfil' && (
            <form onSubmit={handleSalvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Alternador de Perfil Ativo (Role) */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 8,
                  }}
                >
                  Perfil de Acesso
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    background: 'var(--dark-coffee-50, #fcfaf8)',
                    padding: 4,
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border-hairline)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onTogglePerfil('construtor')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm, 6px)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: perfilAtivo === 'construtor' ? 'var(--dark-coffee-800, #2c2214)' : 'transparent',
                      color: perfilAtivo === 'construtor' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
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
                      borderRadius: 'var(--radius-sm, 6px)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: perfilAtivo === 'cliente' ? 'var(--primary-accent)' : 'transparent',
                      color: perfilAtivo === 'cliente' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <User size={16} weight={perfilAtivo === 'cliente' ? 'fill' : 'bold'} />
                    <span>Cliente</span>
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.3,
                  }}
                >
                  {perfilAtivo === 'construtor'
                    ? 'Acesso pleno: gestão técnica, cadastro de materiais, edição de cronograma e relatórios.'
                    : 'Modo acompanhamento: visualização do diário, cronograma em leitura e aprovação de decisões.'}
                </div>
              </div>

              {/* Nome do Usuário */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 5,
                  }}
                >
                  Nome Completo / Exibição
                </label>
                <input
                  type="text"
                  value={nomeInput}
                  onChange={(e) => setNomeInput(e.target.value)}
                  placeholder="Seu nome"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    fontSize: '0.86rem',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    color: 'var(--text-main)',
                    background: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              {/* E-mail de Contato */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 5,
                  }}
                >
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="exemplo@email.com"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    fontSize: '0.86rem',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    color: 'var(--text-main)',
                    background: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Empresa Responsável (exclusivo / destacado para Construtor) */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 5,
                  }}
                >
                  Empresa / Construtora
                </label>
                <input
                  type="text"
                  value={empresaInput}
                  onChange={(e) => setEmpresaInput(e.target.value)}
                  placeholder="Nome da construtora ou escritório"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    fontSize: '0.86rem',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    color: 'var(--text-main)',
                    background: '#ffffff',
                    outline: 'none',
                  }}
                />
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.70rem',
                    color: 'var(--text-muted)',
                    marginTop: 3,
                  }}
                >
                  Utilizado para preenchimento de termos e relatórios de medição.
                </span>
              </div>

              {/* Botão de Salvar Alterações */}
              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: '0.86rem',
                }}
              >
                <FloppyDisk size={18} weight="bold" />
                <span>Salvar Perfil</span>
              </button>

              {profileSavedFeedback && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--color-success, #2e7d32)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle size={16} weight="fill" />
                  <span>Dados do perfil atualizados com sucesso!</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* ================= RODAPÉ DA GAVETA (ÁREA DE LOGIN/SESSÃO) ================= */}
        {/* Conforme requisito: "o login fica no rodape" */}
        <div
          style={{
            marginTop: 'auto',
            padding: '16px 20px',
            borderTop: '1px solid var(--border-hairline)',
            background: 'var(--dark-coffee-50, #fcfaf8)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Dados da Sessão / Usuário Conectado */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: perfilAtivo === 'construtor' ? 'var(--dark-coffee-800)' : 'var(--primary-accent)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  flexShrink: 0,
                }}
              >
                {perfilAtivo === 'construtor' ? (
                  <HardHat size={20} weight="fill" />
                ) : (
                  <User size={20} weight="fill" />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userName || (perfilAtivo === 'construtor' ? 'Construtor' : 'Cliente')}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userEmail || 'Sessão ativa'}
                </div>
              </div>
            </div>

            {/* Badge de Role */}
            <span
              style={{
                fontSize: '0.70rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: perfilAtivo === 'construtor' ? 'var(--dark-coffee-100)' : 'rgba(224, 90, 71, 0.12)',
                color: perfilAtivo === 'construtor' ? 'var(--dark-coffee-800)' : 'var(--primary-accent)',
                flexShrink: 0,
              }}
            >
              {perfilAtivo === 'construtor' ? 'Construtor' : 'Cliente'}
            </span>
          </div>

          {/* Botão de Ação de Login / Logout no Rodapé */}
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
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                borderColor: 'var(--border-hairline)',
                background: '#ffffff',
              }}
              title="Encerrar sessão e voltar à tela de login"
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
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                fontSize: '0.82rem',
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
