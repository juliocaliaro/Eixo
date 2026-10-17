import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import {
  X,
  User,
  FloppyDisk,
  CheckCircle,
} from '@phosphor-icons/react';
import { PerfilUsuario } from '../types/obra';

interface ModalConfiguracoesClienteProps {
  isOpen: boolean;
  onClose: () => void;
  perfilAtivo: PerfilUsuario;
  /** Obsoleto: o papel da conta vem do servidor e nao e alteravel aqui. */
  onTogglePerfil?: (novoPerfil: PerfilUsuario) => void;
  userName: string;
  userEmail: string;
  userEmpresa?: string;
  onSaveProfile: (dados: { nome: string; email: string; empresa?: string }) => void;
}

export const ModalConfiguracoesCliente: React.FC<ModalConfiguracoesClienteProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  userEmpresa = '',
  onSaveProfile,
}) => {
  const [nome, setNome] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [empresa, setEmpresa] = useState(userEmpresa);
  const [feedback, setFeedback] = useState(false);

  useEffect(() => {
    setNome(userName);
    setEmail(userEmail);
    setEmpresa(userEmpresa);
  }, [userName, userEmail, userEmpresa, isOpen]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      nome: nome.trim(),
      email: email.trim(),
      empresa: empresa.trim(),
    });
    setFeedback(true);
    setTimeout(() => {
      setFeedback(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Configurações da conta">
      <div
        className="modal-card"
        style={{ maxWidth: 460, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--dark-coffee-100)',
                color: 'var(--primary-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={20} weight="bold" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Configurações da conta
              </h2>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Seus dados de identificação
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{ width: 36, height: 36 }}
            title="Fechar (Esc)"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nome */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Nome Completo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px',
                fontSize: '0.90rem',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                background: '#ffffff',
              }}
            />
          </div>

          {/* E-mail */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              E-mail de Contato
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px',
                fontSize: '0.90rem',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                background: '#ffffff',
              }}
            />
          </div>

          {/* Empresa / Construtora */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Empresa / Construtora
            </label>
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Nome da empresa ou escritório"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px',
                fontSize: '0.90rem',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                background: '#ffffff',
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '9px 16px', fontSize: '0.86rem' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '9px 18px',
                fontSize: '0.86rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FloppyDisk size={17} weight="bold" />
              <span>Salvar Configurações</span>
            </button>
          </div>

          {feedback && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-success, #2e7d32)', fontSize: '0.80rem', justifyContent: 'center' }}>
              <CheckCircle size={16} weight="fill" />
              <span>Configurações salvas com sucesso!</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
