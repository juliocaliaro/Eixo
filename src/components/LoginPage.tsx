import React, { useState } from 'react';
import { HardHat, User, WarningCircle, CheckCircle, X, CircleNotch } from '@phosphor-icons/react';
import { authApi } from '../services/api';
import { avaliarSenha } from '../utils/senha';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useKeyboardOpen } from '../hooks/useKeyboardOpen';
import { PasswordField, PasswordHelp } from './AuthFields';

export type UserRole = 'Construtor' | 'Cliente';

interface LoginPageProps {
  initialRole?: UserRole;
  initialMode?: 'login' | 'cadastro';
}

// A sessao e hidratada pelo App via onAuthStateChange (Supabase); esta tela apenas autentica.
// O papel (construtor/cliente) vem do perfil gravado no servidor: so o cadastro pergunta "Sou...".
export const LoginPage: React.FC<LoginPageProps> = ({
  initialRole = 'Construtor',
  initialMode = 'login',
}) => {
  const [modo, setModo] = useState<'login' | 'cadastro'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const tecladoAberto = useKeyboardOpen();

  // Campos de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Campos de Cadastro
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [empresaCadastro, setEmpresaCadastro] = useState('');
  const [passwordCadastro, setPasswordCadastro] = useState('');
  const [senhaFocada, setSenhaFocada] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);

  // Estado de Mensagens de Erro e Carregamento
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Recuperação de senha (sheet)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const fecharForgot = () => {
    setIsForgotModalOpen(false);
    setForgotSuccess(false);
    setForgotError('');
  };
  useEscapeKey(fecharForgot, isForgotModalOpen);

  // Limpa mensagens ao alternar abas
  const handleAlternarModo = (novoModo: 'login' | 'cadastro') => {
    setModo(novoModo);
    setErro('');
    setAviso('');
  };

  // Submissão do Formulário de Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setAviso('');

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
        setErro(
          res.error.includes('Invalid login credentials')
            ? 'E-mail ou senha incorretos. Se ainda não tem conta, toque em "Criar conta".'
            : res.error
        );
        setIsLoading(false);
        return;
      }

      // Sucesso: o App recebe SIGNED_IN do Supabase e hidrata a sessao (papel vem do perfil da conta).
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível autenticar. Tente novamente.');
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

    if (!avaliarSenha(passwordCadastro).valida) {
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
        setErro(
          res.error.includes('already registered')
            ? 'Este e-mail já está cadastrado. Toque em "Entrar" para acessar.'
            : res.error
        );
        setIsLoading(false);
        return;
      }

      // Com confirmacao de e-mail ativa o Supabase nao devolve sessao: orienta o usuario.
      if (!res.session) {
        setAviso('Conta criada. Confirme seu e-mail para acessar o Eixo e depois faça login.');
        setModo('login');
        setEmail(emailCadastro.trim());
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao registrar conta no servidor.');
    } finally {
      setIsLoading(false);
    }
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

  const mensagens = (
    <>
      {erro && (
        <div className="auth-alert" role="alert">
          <WarningCircle size={16} weight="fill" />
          <span>{erro}</span>
        </div>
      )}
      {aviso && (
        <div className="auth-alert auth-alert--ok" role="status">
          <CheckCircle size={16} weight="fill" />
          <span>{aviso}</span>
        </div>
      )}
    </>
  );

  return (
    <div className="auth-screen">
      <div className="auth-page">
        <div className={`auth-card${tecladoAberto ? ' is-kb' : ''}`} data-modo={modo}>
          {/* Marca */}
          <div className="auth-head">
            <img src="/eixo-icon.jpg" alt="" className="auth-logo" />
            <h1 className="auth-title">Eixo</h1>
            <p className="auth-sub">Acompanhamento e gestão de obras</p>
          </div>

          {/* Entrar vs Criar conta */}
          <div className="auth-tabs" role="tablist" aria-label="Acesso">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'login'}
              className="auth-tab"
              onClick={() => handleAlternarModo('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'cadastro'}
              className="auth-tab"
              onClick={() => handleAlternarModo('cadastro')}
            >
              Criar conta
            </button>
          </div>

          <div className="auth-body">
            {modo === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
                <div className="auth-fields">
                  <div className="auth-field">
                    <label className="form-label" htmlFor="login-email">
                      E-mail
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      className="form-input"
                      placeholder="exemplo@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <PasswordField
                    id="login-senha"
                    label="Senha"
                    value={password}
                    onChange={setPassword}
                    autoComplete="current-password"
                  />

                  <button type="button" className="auth-link" onClick={() => setIsForgotModalOpen(true)}>
                    Esqueci minha senha
                  </button>
                </div>

                <div className="auth-actions">
                  {mensagens}
                  <button type="submit" className="btn-primary btn--block auth-submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <CircleNotch size={18} className="spin-animate" weight="bold" />
                        <span>Entrando...</span>
                      </>
                    ) : (
                      <span>Entrar</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCadastroSubmit} className="auth-form" noValidate>
                <div className="auth-fields">
                  <div className="auth-field">
                    <span className="form-label" id="cadastro-tipo-label">
                      Eu sou
                    </span>
                    <div className="auth-seg" role="radiogroup" aria-labelledby="cadastro-tipo-label">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedRole === 'Construtor'}
                        onClick={() => setSelectedRole('Construtor')}
                      >
                        <HardHat size={18} weight={selectedRole === 'Construtor' ? 'fill' : 'bold'} />
                        <span>Construtor</span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedRole === 'Cliente'}
                        onClick={() => setSelectedRole('Cliente')}
                      >
                        <User size={18} weight={selectedRole === 'Cliente' ? 'fill' : 'bold'} />
                        <span>Cliente</span>
                      </button>
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="form-label" htmlFor="cadastro-nome">
                      Nome completo
                    </label>
                    <input
                      id="cadastro-nome"
                      type="text"
                      className="form-input"
                      value={nomeCadastro}
                      onChange={(e) => setNomeCadastro(e.target.value)}
                      autoComplete="name"
                    />
                  </div>

                  <div className="auth-field">
                    <label className="form-label" htmlFor="cadastro-email">
                      E-mail
                    </label>
                    <input
                      id="cadastro-email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      className="form-input"
                      placeholder="seu@email.com"
                      value={emailCadastro}
                      onChange={(e) => setEmailCadastro(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  {selectedRole === 'Construtor' && (
                    <div className="auth-field">
                      <div className="auth-field-head">
                        <label className="form-label" htmlFor="cadastro-empresa">
                          Empresa ou construtora
                        </label>
                        <span className="auth-optional">Opcional</span>
                      </div>
                      <input
                        id="cadastro-empresa"
                        type="text"
                        className="form-input"
                        value={empresaCadastro}
                        onChange={(e) => setEmpresaCadastro(e.target.value)}
                        autoComplete="organization"
                      />
                    </div>
                  )}

                  <PasswordField
                    id="cadastro-senha"
                    label="Criar senha"
                    value={passwordCadastro}
                    onChange={setPasswordCadastro}
                    autoComplete="new-password"
                    onFocus={() => setSenhaFocada(true)}
                    onBlur={() => setSenhaFocada(false)}
                  >
                    {(senhaFocada || passwordCadastro) && <PasswordHelp senha={passwordCadastro} />}
                  </PasswordField>

                  <PasswordField
                    id="cadastro-confirmar"
                    label="Confirmar senha"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                  />

                  <label className="auth-check">
                    <input
                      type="checkbox"
                      checked={aceitouTermos}
                      onChange={(e) => setAceitouTermos(e.target.checked)}
                    />
                    <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span>
                  </label>
                </div>

                <div className="auth-actions">
                  {mensagens}
                  <button type="submit" className="btn-primary btn--block auth-submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <CircleNotch size={18} className="spin-animate" weight="bold" />
                        <span>Criando conta...</span>
                      </>
                    ) : (
                      <span>Criar conta</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Recuperação de senha: sheet no mobile */}
      {isForgotModalOpen && (
        <div className="modal-backdrop" onClick={fecharForgot}>
          <div
            className="modal-card auth-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
          >
            <div className="modal-header">
              <h2 className="modal-title" id="forgot-title">
                Recuperar senha
              </h2>
              <button type="button" onClick={fecharForgot} className="btn-icon" aria-label="Fechar">
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleForgotSubmit}>
              <div className="modal-body">
                {forgotSuccess ? (
                  <div className="auth-alert auth-alert--ok" role="status">
                    <CheckCircle size={18} weight="fill" />
                    <span>
                      Enviamos o link para <strong>{forgotEmail}</strong>. Olhe também a caixa de spam.
                    </span>
                  </div>
                ) : (
                  <div className="auth-field">
                    {forgotError && (
                      <div className="auth-alert" role="alert">
                        <WarningCircle size={16} weight="fill" />
                        <span>{forgotError}</span>
                      </div>
                    )}
                    <label className="form-label" htmlFor="forgot-email">
                      E-mail da sua conta
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      className="form-input"
                      placeholder="seu@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      autoFocus
                      required
                      disabled={isForgotLoading}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                {forgotSuccess ? (
                  <button type="button" onClick={fecharForgot} className="btn-primary">
                    Concluir
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={fecharForgot} className="btn-secondary sheet-cancel">
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={isForgotLoading}>
                      {isForgotLoading ? (
                        <>
                          <CircleNotch size={16} className="spin-animate" weight="bold" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <span>Enviar link</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
