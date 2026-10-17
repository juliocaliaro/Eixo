import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { X, Check } from '@phosphor-icons/react';
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

/** "Minha conta": nome e empresa. O e-mail é o do acesso (Supabase Auth) e só aparece para leitura. */
export const ModalConfiguracoesCliente: React.FC<ModalConfiguracoesClienteProps> = ({
  isOpen,
  onClose,
  perfilAtivo,
  userName,
  userEmail,
  userEmpresa = '',
  onSaveProfile,
}) => {
  const [nome, setNome] = useState(userName);
  const [empresa, setEmpresa] = useState(userEmpresa);
  const [salvo, setSalvo] = useState(false);
  const fecharTimer = useRef<number | null>(null);

  useEffect(() => {
    setNome(userName);
    setEmpresa(userEmpresa);
    setSalvo(false);
  }, [userName, userEmpresa, isOpen]);

  useEffect(
    () => () => {
      if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
    },
    []
  );

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const mostraEmpresa = perfilAtivo === 'construtor';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (salvo) return;
    onSaveProfile({
      nome: nome.trim(),
      email: userEmail,
      // O cliente não vê o campo: preserva o valor gravado em vez de apagá-lo.
      empresa: mostraEmpresa ? empresa.trim() : userEmpresa,
    });
    setSalvo(true);
    fecharTimer.current = window.setTimeout(onClose, 900);
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card obra-sheet"
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conta-title"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="conta-title">
            Minha conta
          </h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="conta-nome">
                Nome
              </label>
              <input
                id="conta-nome"
                type="text"
                className="form-input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
              />
            </div>

            {mostraEmpresa && (
              <div className="form-group">
                <div className="field-head">
                  <label className="form-label" htmlFor="conta-empresa">
                    Empresa
                  </label>
                  <span className="field-optional">Opcional</span>
                </div>
                <input
                  id="conta-empresa"
                  type="text"
                  className="form-input"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  autoComplete="organization"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="conta-email">
                E-mail de acesso
              </label>
              <input id="conta-email" type="email" className="form-input" value={userEmail} readOnly disabled />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary sheet-cancel">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={salvo}>
              {salvo ? (
                <>
                  <Check size={16} weight="bold" />
                  <span>Salvo</span>
                </>
              ) : (
                <span>Salvar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
