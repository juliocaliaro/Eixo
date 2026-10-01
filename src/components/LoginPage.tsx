import React, { useState } from 'react';
import {
  EnvelopeSimple,
  Lock,
  Eye,
  EyeSlash,
  HardHat,
  User,
  ArrowRight,
  WarningCircle,
  CheckCircle,
  X
} from '@phosphor-icons/react';

export type UserRole = 'Construtor' | 'Cliente';

interface LoginPageProps {
  onLogin: (role: UserRole) => void;
  initialRole?: UserRole;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  initialRole = 'Construtor',
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [erro, setErro] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    // Validação de campos não vazios (Fake Login)
    if (!email.trim()) {
      setErro('Por favor, informe seu e-mail.');
      return;
    }

    if (!password.trim()) {
      setErro('Por favor, informe sua senha.');
      return;
    }

    // Login aprovado com a Role selecionada
    onLogin(selectedRole);
  };

  const handleQuickLogin = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(role === 'Construtor' ? 'engenharia@albuquerque.com.br' : 'carolina.mendes@cliente.com');
    setPassword('senha123');
    onLogin(role);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSuccess(true);
    setTimeout(() => {
      setIsForgotModalOpen(false);
      setForgotSuccess(false);
      setForgotEmail('');
    }, 2500);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--bg-main, #fdfbf7)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho da Marca */}
        <div
          style={{
            padding: '32px 28px 20px',
            textAlign: 'center',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--dark-coffee-50, #fcfaf8)',
          }}
        >
          <img
            src="/eixo-icon.jpg"
            alt="Eixo"
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              objectFit: 'cover',
              boxShadow: '0 4px 12px rgba(0,0,0,0.14)',
              margin: '0 auto 12px',
              display: 'block',
            }}
          />
          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Eixo
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Acompanhamento de Canteiro & Decisões Bilaterais
          </p>
        </div>

        {/* Corpo do Formulário */}
        <div style={{ padding: '24px 28px' }}>
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
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 6,
              }}
            >
              Perfil de Acesso (Role)
            </label>
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

            {/* Botão Submit (Entrar) */}
            <button
              type="submit"
              className="btn-primary"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: '0.92rem',
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span>Entrar como {selectedRole}</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </form>

          {/* Atalhos Rápidos para Demonstração */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: '1px solid var(--border-hairline)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
              Acesso rápido para testes com dados estáticos:
            </span>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('Construtor')}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.76rem' }}
              >
                Acessar Construtor
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('Cliente')}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.76rem' }}
              >
                Acessar Cliente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha (Forgot Password) */}
      {isForgotModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsForgotModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 380 }}
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
                    <span>Instruções enviadas para <strong>{forgotEmail}</strong> com sucesso!</span>
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
                      />
                    </div>
                  </>
                )}
              </div>

              {!forgotSuccess && (
                <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" onClick={() => setIsForgotModalOpen(false)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                    Enviar Link
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
