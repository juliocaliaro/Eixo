import React, { useState } from 'react';
import { WarningCircle, CheckCircle, CircleNotch } from '@phosphor-icons/react';
import { authApi } from '../services/api';
import { avaliarSenha, mensagemErroTrocaSenha, validarNovaSenha } from '../utils/senha';
import { PasswordField, PasswordHelp } from './AuthFields';

interface ResetPasswordScreenProps {
  /** Chamado ao concluir: segue para o app com a sessao de recuperacao. */
  onDone: () => void | Promise<void>;
  /** Chamado ao desistir: encerra a sessao de recuperacao e volta ao login. */
  onCancel: () => void | Promise<void>;
}

/** Tela exibida quando o usuario chega pelo link de "Esqueceu a senha?" (evento PASSWORD_RECOVERY). */
export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onDone, onCancel }) => {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
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

  return (
    <div className="auth-screen">
      <div className="auth-page">
        <div className="auth-card" role="main">
          <div className="auth-head">
            <img src="/eixo-icon.jpg" alt="" className="auth-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <h1 className="auth-title">Eixo</h1>
            <p className="auth-sub">{concluido ? 'Senha atualizada' : 'Defina sua nova senha'}</p>
          </div>

          <div className="auth-body">
            {concluido ? (
              <div className="auth-form">
                <div className="auth-fields">
                  <div className="auth-alert auth-alert--ok" role="status">
                    <CheckCircle size={18} weight="fill" />
                    <span>Pronto! Sua senha foi alterada com sucesso.</span>
                  </div>
                </div>
                <div className="auth-actions">
                  <button type="button" className="btn-primary btn--block auth-submit" onClick={() => void onDone()}>
                    Continuar para o Eixo
                  </button>
                </div>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <div className="auth-fields">
                  <PasswordField
                    id="reset-nova-senha"
                    label="Nova senha"
                    value={senha}
                    onChange={setSenha}
                    autoComplete="new-password"
                    autoFocus
                  >
                    <PasswordHelp senha={senha} />
                  </PasswordField>
                  <PasswordField
                    id="reset-confirmar-senha"
                    label="Confirmar nova senha"
                    value={confirmacao}
                    onChange={setConfirmacao}
                    autoComplete="new-password"
                  />
                </div>

                <div className="auth-actions">
                  {erro && (
                    <div className="auth-alert" role="alert">
                      <WarningCircle size={16} weight="fill" />
                      <span>{erro}</span>
                    </div>
                  )}
                  <button type="submit" className="btn-primary btn--block auth-submit" disabled={salvando || !req.valida}>
                    {salvando ? (
                      <>
                        <CircleNotch size={18} className="spin-animate" weight="bold" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <span>Salvar nova senha</span>
                    )}
                  </button>
                  <button type="button" className="auth-link auth-link--center" onClick={() => void onCancel()} disabled={salvando}>
                    Voltar ao login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
