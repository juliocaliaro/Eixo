import React, { useState } from 'react';
import { Eye, EyeSlash, Check, Info } from '@phosphor-icons/react';
import { avaliarSenha } from '../utils/senha';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  children?: React.ReactNode;
}

/** Campo de senha com botão de ver/ocultar de 48px. `children` entra logo abaixo (ajuda de uma linha). */
export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  value,
  onChange,
  autoComplete,
  autoFocus,
  onFocus,
  onBlur,
  children,
}) => {
  const [mostrar, setMostrar] = useState(false);
  return (
    <div className="auth-field">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-pw">
        <input
          id={id}
          type={mostrar ? 'text' : 'password'}
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="auth-pw-toggle"
          onClick={() => setMostrar((v) => !v)}
          aria-label={mostrar ? 'Ocultar senha' : 'Ver senha'}
          aria-pressed={mostrar}
        >
          {mostrar ? <EyeSlash size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {children}
    </div>
  );
};

const NOMES_REQUISITO: Array<[keyof ReturnType<typeof avaliarSenha>, string]> = [
  ['minimo', '8 caracteres'],
  ['maiuscula', 'maiúscula'],
  ['minuscula', 'minúscula'],
  ['numero', 'número'],
  ['simbolo', 'símbolo'],
];

/** Regra da senha em UMA linha: orienta antes de digitar, lista o que falta e confirma quando está forte. */
export const PasswordHelp: React.FC<{ senha: string }> = ({ senha }) => {
  const req = avaliarSenha(senha);
  if (req.valida) {
    return (
      <p className="auth-help is-ok" role="status">
        <Check size={14} weight="bold" aria-hidden="true" />
        <span>Senha forte</span>
      </p>
    );
  }
  const faltam = NOMES_REQUISITO.filter(([chave]) => !req[chave]).map(([, nome]) => nome);
  return (
    <p className="auth-help">
      <Info size={14} aria-hidden="true" />
      <span>
        {senha ? `Falta: ${faltam.join(', ')}.` : 'Use 8+ caracteres com maiúscula, minúscula, número e símbolo.'}
      </span>
    </p>
  );
};
