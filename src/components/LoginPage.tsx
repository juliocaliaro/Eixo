import React, { useRef, useState } from 'react';
import { HardHat, User, WarningCircle, CheckCircle, X, CircleNotch } from '@phosphor-icons/react';
import { authApi } from '../services/api';
import { avaliarSenha } from '../utils/senha';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useKeyboardOpen } from '../hooks/useKeyboardOpen';
import { PasswordField, PasswordHelp } from './AuthFields';
import { SlidingSegmented } from './SlidingSegmented';
import { Reveal } from './Reveal';

export type UserRole = 'Construtor' | 'Cliente';

type Modo = 'login' | 'cadastro';

const OPCOES_MODO: Array<{ valor: Modo; texto: string }> = [
  { valor: 'login', texto: 'Entrar' },
  { valor: 'cadastro', texto: 'Criar conta' },
];
const OPCOES_PAPEL: Array<{ valor: UserRole; texto: string; icone: React.ReactNode }> = [
  { valor: 'Construtor', texto: 'Construtor', icone: <HardHat size={18} weight="bold" /> },
  { valor: 'Cliente', texto: 'Cliente', icone: <User size={18} weight="bold" /> },
];

/** Último valor não vazio: mantém o texto de um alerta enquanto o bloco anima o fechamento. */
function useRetido(valor: string): string {
  const ref = useRef(valor);
  if (valor) ref.current = valor;
  return valor || ref.current;
}

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
  const handleAlternarModo = (novoModo: Modo) => {
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

    if (!email.trim()) {
      setErro('Por favor, informe um e-mail válido para sua conta.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
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
        email: email.trim(),
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
        setEmail(email.trim());
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

  const cadastro = modo === 'cadastro';
  // Mantém o texto da mensagem enquanto o bloco fecha (sem esvaziar no meio da animação)
  const erroVisivel = useRetido(erro);
  const avisoVisivel = useRetido(aviso);

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
          <SlidingSegmented
            variante="tabs"
            className="auth-tabs"
            ariaLabel="Acesso"
            idBase="auth-tab"
            painelId="auth-painel"
            valor={modo}
            opcoes={OPCOES_MODO}
            onChange={handleAlternarModo}
          />

          <div className="auth-body" role="tabpanel" id="auth-painel" aria-labelledby={`auth-tab-${modo}`}>
            <form onSubmit={cadastro ? handleCadastroSubmit : handleLoginSubmit} className="auth-form" noValidate>
              <div className="auth-fields">
                <Reveal aberto={cadastro} indice={0}>
                  <div className="auth-field">
                    <span className="form-label" id="cadastro-tipo-label">
                      Eu sou
                    </span>
                    <SlidingSegmented
                      variante="radio"
                      className="auth-seg"
                      labelledBy="cadastro-tipo-label"
                      idBase="auth-role"
                      valor={selectedRole}
                      opcoes={OPCOES_PAPEL}
                      onChange={setSelectedRole}
                    />
                  </div>
                </Reveal>

                <Reveal aberto={cadastro} indice={1}>
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
                </Reveal>

                <div className="auth-row">
                  <div className="auth-field">
                    <label className="form-label" htmlFor="auth-email">
                      E-mail
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      className="form-input"
                      placeholder={cadastro ? 'seu@email.com' : 'exemplo@email.com'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Reveal aberto={cadastro && selectedRole === 'Construtor'} indice={2}>
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
                </Reveal>

                <div className="auth-row">
                  <PasswordField
                    id="auth-senha"
                    label={cadastro ? 'Criar senha' : 'Senha'}
                    value={cadastro ? passwordCadastro : password}
                    onChange={cadastro ? setPasswordCadastro : setPassword}
                    autoComplete={cadastro ? 'new-password' : 'current-password'}
                    onFocus={() => setSenhaFocada(true)}
                    onBlur={() => setSenhaFocada(false)}
                  >
                    <Reveal aberto={cadastro && (senhaFocada || !!passwordCadastro)} respiro="junto">
                      <PasswordHelp senha={passwordCadastro} />
                    </Reveal>
                  </PasswordField>
                </div>

                <Reveal aberto={cadastro} indice={3}>
                  <PasswordField
                    id="cadastro-confirmar"
                    label="Confirmar senha"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                  />
                </Reveal>

                <Reveal aberto={cadastro} indice={4}>
                  <label className="auth-check">
                    <input
                      type="checkbox"
                      checked={aceitouTermos}
                      onChange={(e) => setAceitouTermos(e.target.checked)}
                    />
                    <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span>
                  </label>
                </Reveal>

                <Reveal aberto={!cadastro} indice={1} respiro="junto">
                  <div className="auth-forgot">
                    <button type="button" className="auth-link" onClick={() => setIsForgotModalOpen(true)}>
                      Esqueci minha senha
                    </button>
                  </div>
                </Reveal>
              </div>

              <div className="auth-actions">
                <Reveal aberto={!!erro} respiro="abaixo">
                  <div className="auth-alert" role="alert">
                    <WarningCircle size={16} weight="fill" />
                    <span>{erroVisivel}</span>
                  </div>
                </Reveal>
                <Reveal aberto={!!aviso} respiro="abaixo">
                  <div className="auth-alert auth-alert--ok" role="status">
                    <CheckCircle size={16} weight="fill" />
                    <span>{avisoVisivel}</span>
                  </div>
                </Reveal>
                <button type="submit" className="btn-primary btn--block auth-submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <CircleNotch size={18} className="spin-animate" weight="bold" />
                      <span>{cadastro ? 'Criando conta...' : 'Entrando...'}</span>
                    </>
                  ) : (
                    <span>{cadastro ? 'Criar conta' : 'Entrar'}</span>
                  )}
                </button>
              </div>
            </form>
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
