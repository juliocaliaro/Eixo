import React, { useState } from 'react';
import { Lock, Eye, EyeSlash, WarningCircle, CheckCircle, CircleNotch, Check, Circle } from '@phosphor-icons/react';
import { authApi } from '../services/api';
import { avaliarSenha, mensagemErroTrocaSenha, validarNovaSenha } from '../utils/senha';

interface ResetPasswordScreenProps {
  /** Chamado ao concluir: segue para o app com a sessao de recuperacao. */
  onDone: () => void | Promise<void>;
  /** Chamado ao desistir: encerra a sessao de recuperacao e volta ao login. */
  onCancel: () => void | Promise<void>;
}

interface CampoSenhaProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  mostrar: boolean;
  onToggle: () => void;
  autoFocus?: boolean;
}

const CampoSenha: React.FC<CampoSenhaProps> = ({ id, label, value, onChange, mostrar, onToggle, autoFocus }) => (
  <div className="form-group" style={{ margin: 0 }}>
    <label className="form-label" htmlFor={id} style={{ marginBottom: 4, display: 'block' }}>
      {label}
    </label>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 12 }} />
      <input
        id={id}
        type={mostrar ? 'text' : 'password'}
        className="form-input"
        placeholder="••••••••"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        autoFocus={autoFocus}
        style={{ paddingLeft: 38, paddingRight: 40, width: '100%' }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={mostrar ? 'Ocultar senha' : 'Ver senha'}
        title={mostrar ? 'Ocultar senha' : 'Ver senha'}
        style={{
          position: 'absolute',
          right: 10,
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 4,
          minWidth: 32,
          minHeight: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {mostrar ? <EyeSlash size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

/** Tela exibida quando o usuario chega pelo link de "Esqueceu a senha?" (evento PASSWORD_RECOVERY). */
export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onDone, onCancel }) => {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const req = avaliarSenha(senha);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;
    const problema = validarNovaSenha(senha, confirmacao);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro('');
    setSalvando(true);
    const res = await authApi.updatePassword(senha);
    setSalvando(false);
    if (res.error) {
      setErro(mensagemErroTrocaSenha(res.error));
      return;
    }
    setSenha('');
    setConfirmacao('');
    setConcluido(true);
  };

  const requisitos = [
    { label: 'Mínimo de 8 caracteres', ok: req.minimo },
    { label: 'Pelo menos uma letra maiúscula (A-Z)', ok: req.maiuscula },
    { label: 'Pelo menos uma letra minúscula (a-z)', ok: req.minuscula },
    { label: 'Pelo menos um número (0-9)', ok: req.numero },
    { label: 'Pelo menos um caractere especial (!@#$%^&*)', ok: req.simbolo },
  ];

  return (
    <div className="login-screen-wrapper">
      <div className="login-page-container">
        <div className="login-card" role="main">
          <div className="login-card-header">
            <img
              src="/eixo-icon.jpg"
              alt="Eixo"
              className="login-logo"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="login-title">Eixo</h1>
            <p className="login-subtitle">{concluido ? 'Senha atualizada' : 'Defina sua nova senha'}</p>
          </div>

          <div className="login-card-body">
            {concluido ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  role="status"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#15803d',
                    fontSize: '0.84rem',
                  }}
                >
                  <CheckCircle size={18} weight="fill" style={{ flexShrink: 0 }} />
                  <span>Pronto! Sua senha foi alterada com sucesso.</span>
                </div>
                <button type="button" className="btn-primary login-submit-btn" onClick={() => void onDone()}>
                  <span>Continuar para o Eixo</span>
                </button>
              </div>
            ) : (
              <form className="login-form" onSubmit={handleSubmit} noValidate>
                {erro && (
                  <div
                    role="alert"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 'var(--radius-sm)',
                      color: '#991b1b',
                      fontSize: '0.82rem',
                    }}
                  >
                    <WarningCircle size={16} weight="fill" style={{ flexShrink: 0 }} />
                    <span>{erro}</span>
                  </div>
                )}

                <CampoSenha
                  id="reset-nova-senha"
                  label="Nova senha"
                  value={senha}
                  onChange={setSenha}
                  mostrar={mostrarSenha}
                  onToggle={() => setMostrarSenha((v) => !v)}
                  autoFocus
                />
                <CampoSenha
                  id="reset-confirmar-senha"
                  label="Confirmar nova senha"
                  value={confirmacao}
                  onChange={setConfirmacao}
                  mostrar={mostrarConfirmacao}
                  onToggle={() => setMostrarConfirmacao((v) => !v)}
                />

                <div
                  style={{
                    padding: '10px 12px',
                    background: 'var(--dark-coffee-50, #fcfaf8)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                    }}
                  >
                    Requisitos da Senha:
                  </span>
                  {requisitos.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: '0.76rem',
                        color: item.ok ? '#15803d' : 'var(--text-muted)',
                        fontWeight: item.ok ? 600 : 400,
                      }}
                    >
                      {item.ok ? <Check size={13} weight="bold" /> : <Circle size={13} />}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="btn-primary login-submit-btn"
                  disabled={salvando || !req.valida}
                  style={{ opacity: salvando ? 0.7 : !req.valida ? 0.45 : 1 }}
                >
                  {salvando ? (
                    <>
                      <CircleNotch size={16} className="spin-animate" weight="bold" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar nova senha</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void onCancel()}
                  disabled={salvando}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    padding: 8,
                  }}
                >
                  Voltar ao login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
