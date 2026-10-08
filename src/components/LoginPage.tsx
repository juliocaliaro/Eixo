import React, { useState, useEffect } from 'react';
import {
  EnvelopeSimple,
  Lock,
  Eye,
  EyeSlash,
  HardHat,
  User,
  Buildings,
  ArrowRight,
  WarningCircle,
  CheckCircle,
  X,
  SignIn,
  UserPlus,
  ShieldCheck,
  CircleNotch,
  Check,
  Circle,
} from '@phosphor-icons/react';
import { authApi } from '../services/api';

export type UserRole = 'Construtor' | 'Cliente';

interface LoginPageProps {
  onLogin: (role: UserRole, email?: string, nome?: string, empresa?: string, userId?: string) => void;
  initialRole?: UserRole;
  initialMode?: 'login' | 'cadastro';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  initialRole = 'Construtor',
  initialMode = 'login',
}) => {
  const [modo, setModo] = useState<'login' | 'cadastro'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);

  // Campos de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Campos de Cadastro
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [empresaCadastro, setEmpresaCadastro] = useState('');
  const [passwordCadastro, setPasswordCadastro] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordCadastro, setShowPasswordCadastro] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(true);

  // Estado de Mensagens de Erro e Carregamento
  const [erro, setErro] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validação em Tempo Real dos Requisitos da Senha
  const hasMinLength = passwordCadastro.length >= 8;
  const hasUpperCase = /[A-Z]/.test(passwordCadastro);
  const hasLowerCase = /[a-z]/.test(passwordCadastro);
  const hasNumber = /[0-9]/.test(passwordCadastro);
  const hasSymbol = /[^A-Za-z0-9]/.test(passwordCadastro);
  const isSenhaValida = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol;

  // Modal de Recuperação de Senha
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Escuta tecla Escape para fechar modal de esqueceu senha
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isForgotModalOpen) {
        setIsForgotModalOpen(false);
      }
    };
    if (isForgotModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isForgotModalOpen]);

  // Limpa erros ao alternar abas
  const handleAlternarModo = (novoModo: 'login' | 'cadastro') => {
    setModo(novoModo);
    setErro('');
  };

  // Submissão do Formulário de Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!email.trim()) {
      setErro('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    // Validação básica de formato de e-mail
    if (!email.includes('@') || !email.includes('.')) {
      setErro('Por favor, insira um endereço de e-mail válido.');
      return;
    }

    if (!password.trim()) {
      setErro('Por favor, informe sua senha de acesso.');
      return;
    }

    if (password.length < 4) {
      setErro('A senha deve conter ao menos 4 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.signIn(email.trim(), password);
      if (res.error) {
        // Se as credenciais estiverem incorretas no Supabase
        setErro(res.error.includes('Invalid login credentials') 
          ? 'E-mail ou senha incorretos. Caso seja sua primeira vez, clique na aba "Criar Conta".' 
          : res.error);
        setIsLoading(false);
        return;
      }

      const meta = res.user?.user_metadata || {};
      const roleFromDb: UserRole = meta.role === 'cliente' ? 'Cliente' : 'Construtor';
      const nomeFromDb = meta.nome || undefined;
      const empresaFromDb = meta.empresa || undefined;
      const userIdFromDb = res.user?.id || undefined;

      onLogin(roleFromDb || selectedRole, email.trim(), nomeFromDb, empresaFromDb, userIdFromDb);
    } catch {
      onLogin(selectedRole, email.trim());
    } finally {
      setIsLoading(false);
    }
  };

  // Submissão do Formulário de Cadastro
  const handleCadastroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nomeCadastro.trim()) {
      setErro('Por favor, informe seu nome completo.');
      return;
    }

    if (!emailCadastro.trim()) {
      setErro('Por favor, informe um e-mail válido para sua conta.');
      return;
    }

    if (!emailCadastro.includes('@') || !emailCadastro.includes('.')) {
      setErro('O formato de e-mail informado é inválido.');
      return;
    }

    if (!passwordCadastro.trim()) {
      setErro('Por favor, defina uma senha de acesso.');
      return;
    }

    if (passwordCadastro.length < 8) {
      setErro('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    const hasUpperCase = /[A-Z]/.test(passwordCadastro);
    const hasLowerCase = /[a-z]/.test(passwordCadastro);
    const hasNumber = /[0-9]/.test(passwordCadastro);
    const hasSymbol = /[^A-Za-z0-9]/.test(passwordCadastro);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSymbol) {
      setErro('A senha deve conter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos.');
      return;
    }

    if (passwordCadastro !== confirmPassword) {
      setErro('A confirmação da senha não coincide com a senha digitada.');
      return;
    }

    if (!aceitouTermos) {
      setErro('Você deve concordar com os Termos de Uso e Política de Privacidade para continuar.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.signUp({
        email: emailCadastro.trim(),
        password: passwordCadastro,
        nome: nomeCadastro.trim(),
        role: selectedRole,
        empresa: selectedRole === 'Construtor' ? empresaCadastro.trim() || undefined : undefined,
      });

      if (res.error) {
        setErro(res.error.includes('already registered')
          ? 'Este e-mail já está cadastrado. Alterne para a aba "Entrar" para acessar.'
          : res.error);
        setIsLoading(false);
        return;
      }

      // Cadastro aprovado e gravado no Supabase
      onLogin(
        selectedRole,
        emailCadastro.trim(),
        nomeCadastro.trim(),
        selectedRole === 'Construtor' ? empresaCadastro.trim() || undefined : undefined,
        res.user?.id || undefined
      );
    } catch (err: any) {
      setErro(err?.message || 'Erro ao registrar conta no servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Acesso Rápido para Testes
  const handleQuickLogin = (role: UserRole) => {
    const demoEmail = role === 'Construtor' ? 'engenharia@albuquerque.com.br' : 'carolina.mendes@cliente.com';
    const demoNome = role === 'Construtor' ? 'Eng. Roberto Albuquerque' : 'Dra. Carolina Mendes';
    const demoEmpresa = role === 'Construtor' ? 'Albuquerque Engenharia' : undefined;
    setSelectedRole(role);
    setEmail(demoEmail);
    setPassword('senha123');
    onLogin(role, demoEmail, demoNome, demoEmpresa);
  };

  // Envio da recuperação de senha
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotError('');
    setIsForgotLoading(true);

    try {
      const res = await authApi.resetPassword(forgotEmail.trim());
      if (res.error) {
        setForgotError(res.error);
        setIsForgotLoading(false);
        return;
      }
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err?.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        {/* Cabeçalho da Marca */}
        <div className="login-card-header">
          <img
            src="/eixo-icon.jpg"
            alt="Eixo"
            className="login-logo"
          />
          <h1 className="login-title">
            Eixo
          </h1>
          <p className="login-subtitle">
            Acompanhamento e Gestão de Obras
          </p>
        </div>

        {/* Abas Superiores: Entrar vs Criar Conta */}
        <div className="login-tabs">
          <button
            type="button"
            onClick={() => handleAlternarModo('login')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '9px 12px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.86rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: modo === 'login' ? '#ffffff' : 'transparent',
              color: modo === 'login' ? 'var(--dark-coffee-900)' : 'var(--text-muted)',
              boxShadow: modo === 'login' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <SignIn size={16} weight={modo === 'login' ? 'bold' : 'regular'} />
            <span>Entrar</span>
          </button>

          <button
            type="button"
            onClick={() => handleAlternarModo('cadastro')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '9px 12px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.86rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: modo === 'cadastro' ? '#ffffff' : 'transparent',
              color: modo === 'cadastro' ? 'var(--dark-coffee-900)' : 'var(--text-muted)',
              boxShadow: modo === 'cadastro' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={16} weight={modo === 'cadastro' ? 'bold' : 'regular'} />
            <span>Criar Conta</span>
          </button>
        </div>

        {/* Corpo do Formulário */}
        <div className="login-card-body">
          {/* Mensagem de Erro Inline */}
          {erro && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                color: '#b91c1c',
                fontSize: '0.82rem',
                marginBottom: 16,
              }}
            >
              <WarningCircle size={16} weight="fill" style={{ flexShrink: 0 }} />
              <span>{erro}</span>
            </div>
          )}

          {/* Seletor de Perfil / Role de Acesso */}
          <div className="login-role-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: 0,
                }}
              >
                {modo === 'login' ? 'Perfil de Acesso' : 'Tipo de Conta'}
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {selectedRole === 'Construtor' ? 'Engenharia / Gestão' : 'Proprietário / Obra'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                background: 'var(--dark-coffee-50)',
                padding: 4,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedRole('Construtor')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedRole === 'Construtor' ? 'var(--dark-coffee-900)' : 'transparent',
                  color: selectedRole === 'Construtor' ? '#ffffff' : 'var(--text-body)',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedRole === 'Construtor' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                <HardHat size={15} weight={selectedRole === 'Construtor' ? 'fill' : 'bold'} />
                <span>Construtor</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('Cliente')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedRole === 'Cliente' ? 'var(--dark-coffee-900)' : 'transparent',
                  color: selectedRole === 'Cliente' ? '#ffffff' : 'var(--text-body)',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedRole === 'Cliente' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                <User size={15} weight={selectedRole === 'Cliente' ? 'fill' : 'bold'} />
                <span>Cliente</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODO 1: ENTRAR (LOGIN)                                                    */}
          {/* ========================================================================= */}
          {modo === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="login-form">
              {/* Campo E-mail */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>
                  E-mail
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <EnvelopeSimple
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12 }}
                  />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="exemplo@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    style={{ paddingLeft: 38, width: '100%' }}
                  />
                </div>
              </div>

              {/* Campo Senha com Toggle de Visibilidade */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '0.78rem',
                      color: 'var(--primary-accent)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12 }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ paddingLeft: 38, paddingRight: 40, width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Linha Lembrar de Mim */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    color: 'var(--text-body)',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      accentColor: 'var(--primary-accent)',
                      cursor: 'pointer',
                      width: 15,
                      height: 15,
                    }}
                  />
                  <span>Lembrar de mim neste dispositivo</span>
                </label>
              </div>

              {/* Botão Submit (Entrar) */}
              <button
                type="submit"
                className="btn-primary login-submit-btn"
                disabled={isLoading}
                style={{ opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? (
                  <>
                    <CircleNotch size={16} className="spin-animate" weight="bold" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar como {selectedRole}</span>
                    <ArrowRight size={16} weight="bold" />
                  </>
                )}
              </button>

              {/* Atalhos Rápidos para Demonstração (visíveis ESTRITAMENTE em ambiente de desenvolvimento local) */}
              {(import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) && (
                <div className="login-demo-section">
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                    Acesso rápido para desenvolvimento (visível apenas em localhost):
                  </span>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('Construtor')}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                    >
                      Demo Construtor
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('Cliente')}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                    >
                      Demo Cliente
                    </button>
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* ========================================================================= */
            /* MODO 2: CRIAR CONTA (CADASTRO)                                            */
            /* ========================================================================= */
            <form onSubmit={handleCadastroSubmit} className="login-form">
              {/* Campo Nome Completo */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>
                  Nome Completo
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12 }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder={selectedRole === 'Construtor' ? 'Ex: Eng. Roberto Albuquerque' : 'Ex: Carolina Mendes'}
                    value={nomeCadastro}
                    onChange={(e) => setNomeCadastro(e.target.value)}
                    autoComplete="name"
                    style={{ paddingLeft: 38, width: '100%' }}
                  />
                </div>
              </div>

              {/* Campo E-mail */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>
                  E-mail Profissional / Pessoal
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <EnvelopeSimple
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12 }}
                  />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="seu@email.com"
                    value={emailCadastro}
                    onChange={(e) => setEmailCadastro(e.target.value)}
                    autoComplete="email"
                    style={{ paddingLeft: 38, width: '100%' }}
                  />
                </div>
              </div>

              {/* Campo Empresa / Construtora (Apenas para Construtor) */}
              {selectedRole === 'Construtor' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Empresa ou Construtora
                    </label>
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Opcional</span>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Buildings
                      size={18}
                      color="var(--text-muted)"
                      style={{ position: 'absolute', left: 12 }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: Albuquerque Engenharia & Reformas"
                      value={empresaCadastro}
                      onChange={(e) => setEmpresaCadastro(e.target.value)}
                      autoComplete="organization"
                      style={{ paddingLeft: 38, width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* Campo Senha */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>
                  Criar Senha
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12 }}
                  />
                  <input
                    type={showPasswordCadastro ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={passwordCadastro}
                    onChange={(e) => setPasswordCadastro(e.target.value)}
                    autoComplete="new-password"
                    style={{ paddingLeft: 38, paddingRight: 40, width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordCadastro((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showPasswordCadastro ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPasswordCadastro ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Checklist Interativo de Requisitos de Senha com Feedback em Tempo Real */}
                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    background: 'var(--dark-coffee-50, #fcfaf8)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Requisitos da Senha:
                    </span>
                    <span
                      style={{
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: isSenhaValida ? '#15803d' : 'var(--text-muted)',
                      }}
                    >
                      {isSenhaValida ? 'Senha Forte ✓' : 'Pendente'}
                    </span>
                  </div>
                  {[
                    { label: 'Mínimo de 8 caracteres', ok: hasMinLength },
                    { label: 'Pelo menos uma letra maiúscula (A-Z)', ok: hasUpperCase },
                    { label: 'Pelo menos uma letra minúscula (a-z)', ok: hasLowerCase },
                    { label: 'Pelo menos um número (0-9)', ok: hasNumber },
                    { label: 'Pelo menos um caractere especial (!@#$%^&*)', ok: hasSymbol },
                  ].map((req, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: '0.76rem',
                        color: req.ok ? '#15803d' : (passwordCadastro ? '#991b1b' : 'var(--text-muted)'),
                        fontWeight: req.ok ? 600 : 400,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {req.ok ? (
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: '#dcfce7',
                            color: '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={10} weight="bold" />
                        </div>
                      ) : (
                        <Circle
                          size={12}
                          weight="regular"
                          style={{
                            color: passwordCadastro ? '#f87171' : 'var(--text-muted)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campo Confirmar Senha */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>
                  Confirmar Senha
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12 }}
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    style={{ paddingLeft: 38, paddingRight: 40, width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Aceite de Termos */}
              <div style={{ marginTop: 2 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.35,
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={aceitouTermos}
                    onChange={(e) => setAceitouTermos(e.target.checked)}
                    style={{
                      accentColor: 'var(--primary-accent)',
                      cursor: 'pointer',
                      marginTop: 2,
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    Concordo com os <strong>Termos de Uso</strong> e <strong>Política de Privacidade</strong> do Eixo.
                  </span>
                </label>
              </div>

              {/* Botão Submit (Criar Conta) - desabilitado com estilo visual até todos os requisitos serem atendidos */}
              <button
                type="submit"
                className="btn-primary login-submit-btn"
                disabled={isLoading || !isSenhaValida}
                style={{
                  opacity: (!isSenhaValida && !isLoading) ? 0.45 : (isLoading ? 0.7 : 1),
                  cursor: (!isSenhaValida || isLoading) ? 'not-allowed' : 'pointer',
                  filter: (!isSenhaValida && !isLoading) ? 'grayscale(0.6)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                title={!isSenhaValida ? 'Preencha todos os requisitos da senha para prosseguir' : undefined}
              >
                {isLoading ? (
                  <>
                    <CircleNotch size={16} className="spin-animate" weight="bold" />
                    <span>Criando conta no servidor...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} weight="bold" />
                    <span>Criar Conta e Acessar</span>
                  </>
                )}
              </button>

              <div
                style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  background: 'var(--dark-coffee-50)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                }}
              >
                <ShieldCheck size={18} color="var(--primary-accent)" style={{ flexShrink: 0 }} />
                <span>Seus dados de acesso e projetos de canteiro ficam criptografados com segurança.</span>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal de Recuperação de Senha (Forgot Password) */}
      {isForgotModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsForgotModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 390 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="modal-header" style={{ padding: '16px 20px' }}>
              <h2 className="modal-title" style={{ fontSize: '1.10rem' }}>
                Recuperar Senha
              </h2>
              <button onClick={() => setIsForgotModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleForgotSubmit}>
              <div className="modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {forgotError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 'var(--radius-sm)',
                      color: '#b91c1c',
                      fontSize: '0.82rem',
                    }}
                  >
                    <WarningCircle size={16} weight="fill" style={{ flexShrink: 0 }} />
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotSuccess ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px',
                      background: '#dcfce7',
                      color: '#15803d',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <CheckCircle size={20} weight="fill" />
                    <span>Instruções enviadas para <strong>{forgotEmail}</strong> com sucesso! Verifique sua caixa de entrada (inclusive a pasta de Spam/Lixo Eletrônico).</span>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                      Digite o seu e-mail cadastrado para enviarmos um link seguro de redefinição de senha.
                    </p>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">E-mail Cadastrado</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="seu@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        autoFocus
                        required
                        disabled={isForgotLoading}
                      />
                    </div>
                  </>
                )}
              </div>

              {!forgotSuccess ? (
                <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" onClick={() => setIsForgotModalOpen(false)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isForgotLoading}
                    style={{ padding: '8px 16px', fontSize: '0.82rem', opacity: isForgotLoading ? 0.7 : 1 }}
                  >
                    {isForgotLoading ? (
                      <>
                        <CircleNotch size={14} className="spin-animate" weight="bold" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Enviar Link</span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotModalOpen(false);
                      setForgotSuccess(false);
                      setForgotEmail('');
                    }}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                  >
                    Concluir
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
